// FitImage core — batch image compression powered by sharp.
//
// Licensing note: this module only uses sharp's JPEG (mozjpeg / libjpeg-turbo),
// PNG (zlib/libpng) and WebP decode paths — all permissively licensed.
// It deliberately does NOT use `png({ palette: true })` (libimagequant / GPL).

import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export const DEFAULTS = {
  quality: 75,       // JPEG quality (1-100)
  recursive: true,   // descend into subdirectories
  out: null,         // null = in place (overwrite / convert beside source)
  dryRun: false,     // compute only, write nothing
  keepOriginal: false, // keep source files when the format changes (e.g. keep .webp)
  pngToJpg: false,   // also convert .png -> .jpg
  concurrency: 4,
};

/** Recursively collect supported image files under `dir`. */
export async function collectImages(dir, recursive = true) {
  const out = [];
  async function walk(d) {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        if (recursive) await walk(full);
      } else if (e.isFile() && IMAGE_EXTS.has(path.extname(e.name).toLowerCase())) {
        out.push(full);
      }
    }
  }
  await walk(dir);
  return out.sort();
}

// Encode to JPEG. mozjpeg=true uses sharp's bundled mozjpeg (BSD/IJG, permissive).
// If the local libvips build lacks mozjpeg, transparently retry without it.
async function encodeJpeg(input, quality) {
  try {
    return await sharp(input).jpeg({ quality, mozjpeg: true }).toBuffer();
  } catch (err) {
    if (/mozjpeg/i.test(String(err && err.message))) {
      return await sharp(input).jpeg({ quality }).toBuffer();
    }
    throw err;
  }
}

// Re-encode PNG losslessly-ish (zlib). palette:false => never pulls in libimagequant (GPL).
async function encodePng(input) {
  return await sharp(input).png({ compressionLevel: 9, palette: false }).toBuffer();
}

/**
 * Process a single image file.
 * Returns a result record (no throw for per-file logic errors are surfaced by caller).
 */
export async function processFile(file, opts, baseDir) {
  const ext = path.extname(file).toLowerCase();
  const origBytes = (await fs.stat(file)).size;
  const input = await fs.readFile(file);

  let outBuffer;
  let outExt = ext;
  let convertsFormat = false;

  if (ext === '.webp') {
    outBuffer = await encodeJpeg(input, opts.quality);
    outExt = '.jpg';
    convertsFormat = true;
  } else if (ext === '.png') {
    if (opts.pngToJpg) {
      outBuffer = await encodeJpeg(input, opts.quality);
      outExt = '.jpg';
      convertsFormat = true;
    } else {
      outBuffer = await encodePng(input);
    }
  } else {
    // .jpg / .jpeg
    outBuffer = await encodeJpeg(input, opts.quality);
  }

  // Destination path
  let destPath;
  if (opts.out) {
    const rel = path.relative(baseDir, file);
    const relNoExt = rel.slice(0, rel.length - ext.length);
    destPath = path.join(opts.out, relNoExt + outExt);
  } else {
    destPath = path.join(path.dirname(file), path.basename(file, ext) + outExt);
  }

  const newBytes = outBuffer.length;
  // For same-format in-place re-compression, only write if it actually shrinks.
  // Format conversions (webp->jpg, png->jpg) and --out always write.
  const willWrite = opts.out ? true : (convertsFormat ? true : newBytes < origBytes);

  const result = {
    file,
    destPath,
    origBytes,
    newBytes: willWrite ? newBytes : origBytes,
    convertsFormat,
    willWrite,
    wrote: false,
  };

  if (opts.dryRun || !willWrite) return result;

  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, outBuffer);
  result.wrote = true;

  // In-place format change: optionally remove the now-replaced source file.
  if (!opts.out && convertsFormat && !opts.keepOriginal
      && path.resolve(destPath) !== path.resolve(file)) {
    await fs.rm(file);
  }
  return result;
}

/** Run compression over a file or directory. */
export async function run(target, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  let baseDir = path.resolve(target);
  const stat = await fs.stat(baseDir);

  let files;
  if (stat.isDirectory()) {
    files = await collectImages(baseDir, opts.recursive);
  } else if (stat.isFile() && IMAGE_EXTS.has(path.extname(baseDir).toLowerCase())) {
    files = [baseDir];
    baseDir = path.dirname(baseDir);
  } else {
    files = [];
  }
  if (opts.out) opts.out = path.resolve(opts.out);

  const results = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < files.length) {
      const f = files[cursor++];
      try {
        results.push(await processFile(f, opts, baseDir));
      } catch (err) {
        results.push({ file: f, error: String((err && err.message) || err) });
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.max(1, opts.concurrency) }, worker)
  );

  return { results, summary: summarize(results), opts };
}

/** Aggregate per-file results into totals. */
export function summarize(results) {
  let origTotal = 0, newTotal = 0, written = 0, errors = 0, skipped = 0;
  for (const r of results) {
    if (r.error) { errors++; continue; }
    origTotal += r.origBytes;
    newTotal += r.newBytes;
    if (r.wrote) written++;
    else if (!r.willWrite) skipped++;
  }
  const saved = origTotal - newTotal;
  const pct = origTotal > 0 ? (saved / origTotal) * 100 : 0;
  return { count: results.length, written, skipped, errors, origTotal, newTotal, saved, pct };
}

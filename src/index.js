// FitImage core — batch image compression powered by sharp.
//
// Licensing note: this module only uses sharp's JPEG (mozjpeg / libjpeg-turbo),
// PNG (zlib/libpng) and WebP decode paths — all permissively licensed.
// It deliberately does NOT use `png({ palette: true })` (libimagequant / GPL).

import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

export const DEFAULTS = {
  quality: 75,       // JPEG / WebP quality (1-100)
  recursive: true,   // descend into subdirectories
  out: null,         // null = in place (overwrite / convert beside source)
  dryRun: false,     // compute only, write nothing
  keepOriginal: false, // keep source files when the format changes (e.g. keep .webp)
  pngToJpg: false,   // also convert .png -> .jpg (legacy adaptive path only)
  concurrency: 4,
  format: null,      // null = legacy adaptive behaviour; else 'jpg'|'jpeg'|'png'|'webp'|'gif'
  affix: null,       // null = overwrite in place; else { position:'prefix'|'suffix', text }
  maxWidth: null,    // null = no limit; else shrink so width <= maxWidth (aspect ratio kept)
  maxHeight: null,   // null = no limit; else shrink so height <= maxHeight (aspect ratio kept)
};

// Map a chosen output format to its file extension. Returns null for unknown.
export function extForFormat(format) {
  switch (String(format || '').toLowerCase()) {
    case 'jpg':
    case 'jpeg': return '.jpg';
    case 'png':  return '.png';
    case 'webp': return '.webp';
    case 'gif':  return '.gif';
    default:     return null;
  }
}

// Add a prefix/suffix string to a filename stem (the basename without extension).
export function applyAffix(stem, affix) {
  if (!affix || !affix.text) return stem;
  return affix.position === 'prefix' ? affix.text + stem : stem + affix.text;
}

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

/**
 * Decide how to resize an image of `width` x `height` so it fits within
 * maxWidth x maxHeight (either may be null = unlimited). Returns a sharp
 * resize() options object, or null when the image already fits. Images are
 * only ever shrunk, never enlarged, and the aspect ratio is always kept.
 */
export function resizeSpec(width, height, { maxWidth = null, maxHeight = null } = {}) {
  const tooWide = maxWidth != null && width > maxWidth;
  const tooTall = maxHeight != null && height > maxHeight;
  if (!tooWide && !tooTall) return null;
  return {
    width: maxWidth ?? undefined,
    height: maxHeight ?? undefined,
    fit: 'inside',
    withoutEnlargement: true,
  };
}

// Shared decode pipeline for every encoder. `.rotate()` with no arguments applies
// the EXIF orientation (then drops the tag, since sharp strips metadata by
// default), so phone photos are not written sideways. The optional resize is
// chained after it, so width/height limits apply to the displayed orientation.
function load(input, resize) {
  const img = sharp(input).rotate();
  return resize ? img.resize(resize) : img;
}

// Width/height as displayed: EXIF orientations 5-8 swap the stored axes.
async function displayedSize(input) {
  const { width, height, orientation } = await sharp(input).metadata();
  return orientation >= 5 ? { width: height, height: width } : { width, height };
}

// Every encoder resolves to { data, info } (info carries the output width/height).
const WITH_INFO = { resolveWithObject: true };

// Encode to JPEG. mozjpeg=true uses sharp's bundled mozjpeg (BSD/IJG, permissive).
// If the local libvips build lacks mozjpeg, transparently retry without it.
async function encodeJpeg(input, quality, resize) {
  try {
    return await load(input, resize).jpeg({ quality, mozjpeg: true }).toBuffer(WITH_INFO);
  } catch (err) {
    if (/mozjpeg/i.test(String(err && err.message))) {
      return await load(input, resize).jpeg({ quality }).toBuffer(WITH_INFO);
    }
    throw err;
  }
}

// Re-encode PNG losslessly-ish (zlib). palette:false keeps the truecolour path.
async function encodePng(input, resize) {
  return await load(input, resize).png({ compressionLevel: 9, palette: false }).toBuffer(WITH_INFO);
}

// Encode to WebP via libwebp (BSD). quality applies to lossy WebP.
async function encodeWebp(input, quality, resize) {
  return await load(input, resize).webp({ quality }).toBuffer(WITH_INFO);
}

// Encode to GIF via cgif (MIT) + sharp's bundled libimagequant fork (BSD-2-Clause).
// Note: GIF is a 256-colour palette format, so photographic output can be LARGER
// than the source — the caller surfaces the size delta either way.
async function encodeGif(input, resize) {
  return await load(input, resize).gif().toBuffer(WITH_INFO);
}

// Encode `input` to an explicit output format. Returns { data, info }.
async function encodeAs(format, input, quality, resize) {
  switch (extForFormat(format)) {
    case '.jpg':  return await encodeJpeg(input, quality, resize);
    case '.png':  return await encodePng(input, resize);
    case '.webp': return await encodeWebp(input, quality, resize);
    case '.gif':  return await encodeGif(input, resize);
    default: throw new Error(`unsupported output format: ${format}`);
  }
}

/**
 * Process a single image file.
 * Returns a result record (no throw for per-file logic errors are surfaced by caller).
 */
export async function processFile(file, opts, baseDir) {
  const ext = path.extname(file).toLowerCase();
  const origBytes = (await fs.stat(file)).size;
  const input = await fs.readFile(file);

  // Optional downscale to fit within maxWidth x maxHeight (aspect ratio kept).
  let resize = null;
  let origWidth;
  let origHeight;
  if (opts.maxWidth != null || opts.maxHeight != null) {
    ({ width: origWidth, height: origHeight } = await displayedSize(input));
    resize = resizeSpec(origWidth, origHeight, opts);
  }

  let enc;
  let outExt;

  if (opts.format) {
    // Explicit output format: encode every input to the chosen format.
    enc = await encodeAs(opts.format, input, opts.quality, resize);
    outExt = extForFormat(opts.format);
  } else if (ext === '.webp') {
    enc = await encodeJpeg(input, opts.quality, resize);
    outExt = '.jpg';
  } else if (ext === '.gif') {
    // Re-encode GIF in place (keeps the palette format).
    enc = await encodeGif(input, resize);
    outExt = '.gif';
  } else if (ext === '.png') {
    if (opts.pngToJpg) {
      enc = await encodeJpeg(input, opts.quality, resize);
      outExt = '.jpg';
    } else {
      enc = await encodePng(input, resize);
      outExt = '.png';
    }
  } else {
    // .jpg / .jpeg — re-encode, keep the original extension
    enc = await encodeJpeg(input, opts.quality, resize);
    outExt = ext;
  }
  const outBuffer = enc.data;
  const convertsFormat = outExt !== ext;
  const resized = resize != null;

  // Destination path. An affix renames only the basename (subdirs are preserved);
  // an affix or --out always writes beside/under a new name and never deletes the source.
  const stem = applyAffix(path.basename(file, ext), opts.affix);
  let destPath;
  if (opts.out) {
    const relDir = path.dirname(path.relative(baseDir, file));
    destPath = path.join(opts.out, relDir, stem + outExt);
  } else {
    destPath = path.join(path.dirname(file), stem + outExt);
  }

  const newBytes = outBuffer.length;
  // Same-format in-place re-compression only writes if it actually shrinks.
  // Format conversions, resizes, --out and renamed (affix) outputs always write.
  const willWrite = (opts.out || opts.affix || convertsFormat || resized) ? true : newBytes < origBytes;

  const result = {
    file,
    destPath,
    origBytes,
    newBytes: willWrite ? newBytes : origBytes,
    convertsFormat,
    resized,
    willWrite,
    wrote: false,
  };
  if (resized) {
    result.origSize = { width: origWidth, height: origHeight };
    result.newSize = { width: enc.info.width, height: enc.info.height };
  }

  if (opts.dryRun || !willWrite) return result;

  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, outBuffer);
  result.wrote = true;

  // In-place format change: optionally remove the now-replaced source file.
  // Skipped when writing elsewhere (--out) or under a new name (affix): both keep the source.
  if (!opts.out && !opts.affix && convertsFormat && !opts.keepOriginal
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
  let origTotal = 0, newTotal = 0, written = 0, errors = 0, skipped = 0, resized = 0;
  for (const r of results) {
    if (r.error) { errors++; continue; }
    origTotal += r.origBytes;
    newTotal += r.newBytes;
    if (r.resized) resized++;
    if (r.wrote) written++;
    else if (!r.willWrite) skipped++;
  }
  const saved = origTotal - newTotal;
  const pct = origTotal > 0 ? (saved / origTotal) * 100 : 0;
  return { count: results.length, written, skipped, errors, resized, origTotal, newTotal, saved, pct };
}

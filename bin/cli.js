#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { run, DEFAULTS } from '../src/index.js';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

function fmtBytes(n) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function parseIntArg(name, min, max) {
  return (value) => {
    const n = parseInt(value, 10);
    if (Number.isNaN(n) || n < min || n > max) {
      throw new Error(`--${name} must be an integer between ${min} and ${max}`);
    }
    return n;
  };
}

const program = new Command();

program
  .name('fitimage')
  .description(
    'Cross-platform batch image compressor.\n' +
    'Converts WebP -> JPG and shrinks JPEG/PNG using sharp (mozjpeg).\n\n' +
    'By default it works IN PLACE (re-compressed files overwrite the originals;\n' +
    'converted .webp files are replaced by .jpg). Use --dry-run to preview, or\n' +
    '--out <dir> to write results elsewhere without touching the source.'
  )
  .version(pkg.version)
  .argument('<path>', 'image file or directory to process')
  .option('-q, --quality <n>', 'JPEG quality (1-100)', parseIntArg('quality', 1, 100), DEFAULTS.quality)
  .option('-o, --out <dir>', 'write results to this directory (non-destructive)')
  .option('--no-recursive', 'do not descend into subdirectories')
  .option('--png-to-jpg', 'also convert PNG files to JPG', false)
  .option('--keep-original', 'keep source files when the format changes (e.g. keep .webp)', false)
  .option('--dry-run', 'preview only; do not write or delete anything', false)
  .option('-v, --verbose', 'print every file', false)
  .option('-c, --concurrency <n>', 'number of parallel workers', parseIntArg('concurrency', 1, 64), DEFAULTS.concurrency)
  .action(async (target, options) => {
    const opts = {
      quality: options.quality,
      recursive: options.recursive,        // commander maps --no-recursive => false
      out: options.out || null,
      pngToJpg: options.pngToJpg,
      keepOriginal: options.keepOriginal,
      dryRun: options.dryRun,
      concurrency: options.concurrency,
    };

    let out;
    try {
      out = await run(target, opts);
    } catch (err) {
      console.error(`fitimage: ${(err && err.message) || err}`);
      process.exitCode = 1;
      return;
    }

    const { results, summary } = out;
    const tag = opts.dryRun ? '[dry-run] ' : '';

    if (options.verbose) {
      for (const r of results) {
        if (r.error) {
          console.error(`  ✗ ${r.file}  (${r.error})`);
        } else if (r.willWrite) {
          const arrow = r.convertsFormat ? ` -> ${r.destPath}` : '';
          console.log(`  ${tag}${fmtBytes(r.origBytes)} -> ${fmtBytes(r.newBytes)}  ${r.file}${arrow}`);
        } else {
          console.log(`  ${tag}skip (no gain)  ${r.file}`);
        }
      }
    }

    const s = summary;
    console.log(
      `\n${tag}${s.count} image(s) | written: ${s.written} | skipped: ${s.skipped} | errors: ${s.errors}`
    );
    console.log(
      `${tag}${fmtBytes(s.origTotal)} -> ${fmtBytes(s.newTotal)}  ` +
      `(saved ${fmtBytes(s.saved)}, ${s.pct.toFixed(1)}%)`
    );
    if (s.errors > 0) process.exitCode = 1;
  });

program.parseAsync(process.argv);

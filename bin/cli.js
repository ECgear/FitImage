#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import updateNotifier from 'update-notifier';
import { run, DEFAULTS, extForFormat } from '../src/index.js';
import { reportLines } from '../src/report.js';
import { runInteractive } from '../src/interactive.js';
import { installCommandMenu } from '../src/menu.js';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

// Check for updates in the background (once per day); notify at next run if newer version found.
updateNotifier({ pkg }).notify();

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
    'Shrinks JPEG/PNG/WebP and converts between JPG/WebP/PNG/GIF using sharp (mozjpeg).\n\n' +
    'Run with no <path> (in a terminal) to launch the interactive wizard.\n' +
    'By default it works IN PLACE (re-compressed files overwrite the originals;\n' +
    'converted files replace the source). Use --dry-run to preview, --out <dir> to\n' +
    'write elsewhere, or --prefix/--suffix to save under a new name.'
  )
  .version(pkg.version)
  .argument('[path]', 'image file or directory to process (omit for interactive mode)')
  .option('-i, --interactive', 'launch the interactive wizard', false)
  .option('-q, --quality <n>', 'JPEG/WebP quality (1-100)', parseIntArg('quality', 1, 100), DEFAULTS.quality)
  .option('-f, --format <fmt>', 'force output format: jpg | webp | png | gif')
  .option('--prefix <text>', 'save under a new name: add <text> to the start of the filename')
  .option('--suffix <text>', 'save under a new name: add <text> to the end of the filename')
  .option('-o, --out <dir>', 'write results to this directory (non-destructive)')
  .option('--no-recursive', 'do not descend into subdirectories')
  .option('--png-to-jpg', 'also convert PNG files to JPG (ignored when --format is set)', false)
  .option('--keep-original', 'keep source files when the format changes (e.g. keep .webp)', false)
  .option('--dry-run', 'preview only; do not write or delete anything', false)
  .option('-v, --verbose', 'print every file', false)
  .option('-c, --concurrency <n>', 'number of parallel workers', parseIntArg('concurrency', 1, 64), DEFAULTS.concurrency)
  .option('--install-menu', 'open the right-click-menu installer (add, update or remove Finder/Explorer entries), then exit', false)
  .action(async (target, options) => {
    // Parse/validate --format and --prefix/--suffix once — shared by a normal
    // run AND by --install-menu (which bakes these flags into the menu entry).
    let format = null;
    if (options.format) {
      format = String(options.format).toLowerCase();
      if (!extForFormat(format)) {
        console.error('fitimage: --format must be one of jpg, jpeg, png, webp, gif');
        process.exitCode = 1;
        return;
      }
    }

    if (options.prefix && options.suffix) {
      console.error('fitimage: use only one of --prefix or --suffix');
      process.exitCode = 1;
      return;
    }
    const affix = options.prefix
      ? { position: 'prefix', text: options.prefix }
      : options.suffix
        ? { position: 'suffix', text: options.suffix }
        : null;

    // --install-menu launches the right-click-menu installer (a separate wizard)
    // and exits without compressing. Works with or without a <path>/--format.
    if (options.installMenu) {
      if (!process.stdin.isTTY) {
        console.error('fitimage: --install-menu needs a terminal (it asks a couple of questions).');
        process.exitCode = 1;
        return;
      }
      try {
        await installCommandMenu({
          options: { quality: options.quality, format, affix, keepOriginal: options.keepOriginal },
        });
      } catch (err) {
        console.error(`fitimage: ${(err && err.message) || err}`);
        process.exitCode = 1;
      }
      return;
    }

    // No path (or -i) launches the wizard — but only when attached to a terminal.
    if (options.interactive || !target) {
      if (!process.stdin.isTTY) {
        console.error(
          'fitimage: interactive mode needs a terminal. Pass a <path> for ' +
          'non-interactive use, or run `fitimage --help`.'
        );
        process.exitCode = 1;
        return;
      }
      try {
        await runInteractive();
      } catch (err) {
        console.error(`fitimage: ${(err && err.message) || err}`);
        process.exitCode = 1;
      }
      return;
    }

    const opts = {
      quality: options.quality,
      recursive: options.recursive,        // commander maps --no-recursive => false
      out: options.out || null,
      pngToJpg: options.pngToJpg,
      keepOriginal: options.keepOriginal,
      dryRun: options.dryRun,
      concurrency: options.concurrency,
      format,
      affix,
    };

    let out;
    try {
      out = await run(target, opts);
    } catch (err) {
      console.error(`fitimage: ${(err && err.message) || err}`);
      process.exitCode = 1;
      return;
    }

    for (const line of reportLines(out, { dryRun: opts.dryRun, verbose: options.verbose })) {
      (line.level === 'error' ? console.error : console.log)(line.text);
    }
    if (out.summary.errors > 0) process.exitCode = 1;
  });

program.parseAsync(process.argv);

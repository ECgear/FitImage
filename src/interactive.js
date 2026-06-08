// FitImage interactive wizard — a guided, prompt-driven front end over run().
//
// Uses Node's built-in readline/promises (no extra dependencies). Streams are
// injectable so the wizard can be driven by tests; by default it talks to the
// real stdin/stdout. The last-used folder is remembered in a small config file
// so repeat runs jump straight to the options menu.

import * as readline from 'node:readline/promises';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { run, collectImages, extForFormat, DEFAULTS } from './index.js';
import { reportLines } from './report.js';

const FORMATS = ['jpg', 'webp', 'gif', 'png'];
const ILLEGAL_FILENAME = /[/\\:*?"<>|]/;
const LIST_LIMIT = 50;

// ---- config persistence (best-effort) -------------------------------------

/** Cross-platform config location, honouring XDG_CONFIG_HOME when set. */
export function defaultConfigPath() {
  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(base, 'fitimage', 'config.json');
}

export async function loadConfig(p) {
  try {
    const data = JSON.parse(await fs.readFile(p, 'utf8'));
    return (data && typeof data === 'object') ? data : {};
  } catch {
    return {};
  }
}

export async function saveConfig(p, data) {
  try {
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, JSON.stringify({ version: 1, ...data }, null, 2));
  } catch {
    // Persisting the last folder is a convenience; never fail a run over it.
  }
}

// ---- pure helpers ----------------------------------------------------------

/** Build a run() options object from the wizard's collected answers. */
export function buildOptions({ format = null, affix = null, quality = DEFAULTS.quality, keepOriginal = false } = {}) {
  return { quality, recursive: true, format, affix, keepOriginal };
}

/**
 * Quote a single command-line argument so it can be pasted safely into a
 * terminal on macOS/Linux (bash/zsh) AND Windows (cmd/PowerShell).
 *
 * Bare values that only contain path-safe characters are returned as-is (this
 * keeps Windows paths like `C:\Users\me` readable). Anything else — most
 * importantly a space — is wrapped in double quotes, which every common shell
 * understands. Backslashes are intentionally NOT escaped (that would corrupt
 * Windows paths); affix text already forbids `"` and other illegal characters
 * (see ILLEGAL_FILENAME), and `"` in a folder name is illegal on Windows and
 * pathological on POSIX, so it is the one unhandled edge case.
 */
export function shellQuote(value) {
  const s = String(value);
  if (s !== '' && /^[A-Za-z0-9._\-~:/\\]+$/.test(s)) return s;
  return `"${s}"`;
}

/**
 * Build just the option flags (no positional <path>) that reproduce a wizard
 * run, mirroring bin/cli.js. Returns an array of already-quoted tokens.
 *
 * - format       -> --format <fmt>            (the wizard always picks one)
 * - affix        -> --prefix/--suffix <text>  (omitted = overwrite in place)
 * - keepOriginal -> --keep-original           (save-as-new with no rename: a new
 *                   extension already yields a distinct name, so the source is kept)
 * - quality      -> --quality <n>             (omitted when equal to the default)
 *
 * Shared by buildOneShotCommand (here) and the right-click menu installer
 * (src/menu.js), which bakes these same flags into a Finder/Explorer entry.
 */
export function oneShotFlags({ format = null, affix = null, quality = DEFAULTS.quality, keepOriginal = false } = {}) {
  const parts = [];
  if (format) parts.push('--format', format);
  if (affix && affix.text) {
    parts.push(affix.position === 'prefix' ? '--prefix' : '--suffix', shellQuote(affix.text));
  } else if (keepOriginal) {
    parts.push('--keep-original');
  }
  if (quality != null && quality !== DEFAULTS.quality) parts.push('--quality', String(quality));
  return parts;
}

/**
 * Build the one-shot `fitimage` command line that reproduces a wizard run.
 * Mirrors the flags accepted by bin/cli.js. Returns a single string.
 *
 * - folder       -> the positional <path> (quoted when needed)
 * - (see oneShotFlags for the option flags)
 */
export function buildOneShotCommand({ folder, format = null, affix = null, quality = DEFAULTS.quality, keepOriginal = false } = {}) {
  return ['fitimage', shellQuote(folder), ...oneShotFlags({ format, affix, quality, keepOriginal })].join(' ');
}

function expandHome(p) {
  if (p === '~' || p.startsWith('~/') || p.startsWith('~\\')) {
    return path.join(os.homedir(), p.slice(1));
  }
  return p;
}

async function isDir(p) {
  try { return (await fs.stat(p)).isDirectory(); } catch { return false; }
}

// ---- prompt primitives -----------------------------------------------------

export async function choose(rl, output, title, labels) {
  for (;;) {
    output.write(`\n${title}\n`);
    labels.forEach((label, i) => output.write(`  ${i + 1}) ${label}\n`));
    const n = Number.parseInt((await rl.question('> ')).trim(), 10);
    if (Number.isInteger(n) && n >= 1 && n <= labels.length) return n - 1;
    output.write(`Please enter a number between 1 and ${labels.length}.\n`);
  }
}

async function askFolder(rl, output, cwd, remembered) {
  const hasRemembered = remembered && await isDir(remembered);
  for (;;) {
    const prompt = hasRemembered
      ? `\nTarget folder [${remembered}] (Enter to keep, or type a new path): `
      : `\nTarget folder [${cwd}]: `;
    let answer = (await rl.question(prompt)).trim();
    if (answer === '') {
      if (hasRemembered) return remembered;
      answer = cwd;
    }
    const resolved = path.resolve(expandHome(answer));
    if (await isDir(resolved)) return resolved;
    output.write(`Not a folder: ${resolved}\n`);
  }
}

async function askAffixText(rl, output) {
  for (;;) {
    const text = (await rl.question('Text to add: ')).trim();
    if (text === '') { output.write('Please enter at least one character.\n'); continue; }
    if (ILLEGAL_FILENAME.test(text)) {
      output.write('That contains an illegal filename character (/ \\ : * ? " < > |).\n');
      continue;
    }
    return text;
  }
}

function emit(output, out, opts) {
  for (const line of reportLines(out, opts)) output.write(line.text + '\n');
}

/**
 * After a real run, offer to print the equivalent `fitimage` command so the
 * user can repeat exactly this operation next time without the questions.
 */
async function offerOneShotCommand(rl, output, { folder, options }) {
  const pick = await choose(rl, output, 'One-Shot Command — turn this run into a single reusable command?', [
    'Yes — show me the command',
    'No thanks',
  ]);
  if (pick !== 0) return;

  const cmd = buildOneShotCommand({
    folder,
    format: options.format,
    affix: options.affix,
    keepOriginal: options.keepOriginal,
    quality: options.quality,
  });

  output.write('\nOne-Shot Command — run this in your terminal to repeat exactly this operation:\n\n');
  output.write(`  ${cmd}\n\n`);
  output.write('Next time, just paste this command instead of answering the questions —\n');
  output.write('it reproduces this run in a single step.\n');
  output.write('(Using npx? Prefix it: npx @ecgear/fitimage … )\n');
  output.write('\nTip: append  --install-menu  to that command to add it to your right-click menu\n');
  output.write('     (Finder Quick Action on macOS, Explorer menu on Windows).\n');
}

// ---- wizard ----------------------------------------------------------------

/**
 * Run the interactive wizard. Returns the run() result, or null if the user
 * cancelled or no images were found.
 */
export async function runInteractive({
  input = process.stdin,
  output = process.stdout,
  cwd = process.cwd(),
  configPath = defaultConfigPath(),
} = {}) {
  const rl = readline.createInterface({ input, output });
  try {
    output.write('FitImage — interactive mode\n');
    const config = await loadConfig(configPath);

    // 1. Pick (or confirm the remembered) folder.
    const folder = await askFolder(rl, output, cwd, config.lastFolder);

    // 2. List the images that will be processed.
    const files = await collectImages(folder, true);
    if (files.length === 0) {
      output.write(`\nNo .jpg/.jpeg/.png/.webp images found under ${folder}.\n`);
      return null;
    }
    output.write(`\n${files.length} image(s) found under ${folder}:\n`);
    for (const f of files.slice(0, LIST_LIMIT)) output.write(`  - ${path.relative(folder, f)}\n`);
    if (files.length > LIST_LIMIT) output.write(`  ... and ${files.length - LIST_LIMIT} more\n`);
    output.write(`\nThese ${files.length} image(s) will be processed.\n`);

    // 3. Output format.
    const fmtIdx = await choose(rl, output, 'Output format (size-reduced):', [
      'JPG  (.jpg)',
      'WebP (.webp)',
      'GIF  (.gif)  — 256-colour palette; photos may end up larger',
      'PNG  (.png)',
    ]);
    const format = FORMATS[fmtIdx];

    // 4. Overwrite vs. save under a new name. The text-position question only
    // applies to "save as a new name"; overwrite leaves the filename unchanged.
    const saveMode = await choose(rl, output, 'Save mode:', [
      'Overwrite originals (in place)',
      'Save as a new name (keep originals)',
    ]);
    let affix = null;
    let keepOriginal = false;
    if (saveMode === 1) {
      // When every source shares one extension AND the chosen format has a
      // different extension, the new file already gets a distinct name (e.g.
      // photo.jpg -> photo.webp), so it can sit beside the original without a
      // rename. Skip the text question and just keep the originals.
      const outExt = extForFormat(format);
      const exts = new Set(files.map((f) => path.extname(f).toLowerCase()));
      const uniformExt = exts.size === 1 ? [...exts][0] : null;
      if (uniformExt && outExt && outExt !== uniformExt) {
        keepOriginal = true;
      } else {
        const pos = await choose(rl, output, 'Where should the text be added?', [
          'Prefix — at the beginning of the filename',
          'Suffix — at the end of the filename',
        ]);
        const text = await askAffixText(rl, output);
        affix = { position: pos === 0 ? 'prefix' : 'suffix', text };
      }
    }

    const options = buildOptions({ format, affix, keepOriginal });

    // 5. Plan summary + safety gate.
    const naming = affix
      ? `add ${affix.position} "${affix.text}" (originals kept)`
      : keepOriginal
        ? `save as .${format} next to originals (same name, originals kept)`
        : 'overwrite in place (originals replaced)';
    output.write('\nPlan:\n');
    output.write(`  Folder : ${folder}\n`);
    output.write(`  Images : ${files.length}\n`);
    output.write(`  Output : .${format} (quality ${options.quality})\n`);
    output.write(`  Naming : ${naming}\n`);

    const action = await choose(rl, output, 'Proceed?', [
      'Run now',
      'Dry-run preview first (write nothing)',
      'Cancel',
    ]);
    if (action === 2) {
      output.write('Cancelled.\n');
      return null;
    }

    // The folder is now committed — remember it for next time.
    await saveConfig(configPath, { ...config, lastFolder: folder });

    if (action === 1) {
      const preview = await run(folder, { ...options, dryRun: true });
      output.write('\nDry-run preview:\n');
      emit(output, preview, { dryRun: true, verbose: true });
      const ans = (await rl.question('\nRun for real now? [y/N] ')).trim().toLowerCase();
      if (ans !== 'y' && ans !== 'yes') {
        output.write('Cancelled.\n');
        return null;
      }
    }

    const result = await run(folder, options);
    output.write('\nDone.\n');
    emit(output, result, { verbose: false });

    // 6. Offer to capture this run as a single reusable command.
    await offerOneShotCommand(rl, output, { folder, options });
    return result;
  } finally {
    rl.close();
  }
}

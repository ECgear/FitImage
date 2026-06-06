import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough, Writable } from 'node:stream';
import sharp from 'sharp';

import { run, extForFormat, applyAffix } from '../src/index.js';
import { runInteractive, buildOptions, loadConfig } from '../src/interactive.js';

const W = 256, H = 256, C = 3;

function noisyRaw() {
  const buf = Buffer.allocUnsafe(W * H * C);
  let x = 123456789;
  for (let i = 0; i < buf.length; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    buf[i] = (x >> 16) & 0xff;
  }
  return buf;
}

async function tmpdir() {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'fitimage-i-'));
}

async function writeJpeg(file, quality = 90) {
  const data = await sharp(noisyRaw(), { raw: { width: W, height: H, channels: C } })
    .jpeg({ quality })
    .toBuffer();
  await fs.writeFile(file, data);
  return data.length;
}

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

// Drive the wizard with scripted answers. readline consumes input eagerly in
// flowing mode, so pre-buffering every line would lose lines emitted before a
// question's listener attaches. Instead we feed the next answer only after the
// wizard prints a prompt (prompts don't end in '\n'; informational lines do).
async function driveWizard(answers, { cwd, configPath }) {
  const input = new PassThrough();
  let idx = 0;
  let text = '';
  const feed = () => { if (idx < answers.length) input.write(`${answers[idx++]}\n`); };
  const output = new Writable({
    write(chunk, _enc, cb) {
      const s = chunk.toString();
      text += s;
      cb();
      if (!s.endsWith('\n')) queueMicrotask(feed); // a prompt awaiting input
    },
  });
  const result = await runInteractive({ input, output, cwd, configPath });
  return { result, text };
}

// ---- pure helpers ----------------------------------------------------------

test('extForFormat maps formats to extensions', () => {
  assert.equal(extForFormat('jpg'), '.jpg');
  assert.equal(extForFormat('jpeg'), '.jpg');
  assert.equal(extForFormat('PNG'), '.png');
  assert.equal(extForFormat('webp'), '.webp');
  assert.equal(extForFormat('gif'), '.gif');
  assert.equal(extForFormat('bmp'), null);
  assert.equal(extForFormat(null), null);
});

test('applyAffix adds prefix/suffix and is a no-op when null', () => {
  assert.equal(applyAffix('photo', null), 'photo');
  assert.equal(applyAffix('photo', { position: 'prefix', text: 'min_' }), 'min_photo');
  assert.equal(applyAffix('photo', { position: 'suffix', text: '_min' }), 'photo_min');
});

test('buildOptions produces run() options with quality 75', () => {
  assert.deepEqual(buildOptions({ format: 'webp' }), {
    quality: 75, recursive: true, format: 'webp', affix: null,
  });
  assert.deepEqual(buildOptions({ format: 'jpg', affix: { position: 'suffix', text: '_x' } }), {
    quality: 75, recursive: true, format: 'jpg', affix: { position: 'suffix', text: '_x' },
  });
});

// ---- core: explicit output format ------------------------------------------

test('run with format=webp converts and removes the source by default', async () => {
  const dir = await tmpdir();
  await writeJpeg(path.join(dir, 'a.jpg'));
  const { summary } = await run(dir, { format: 'webp' });
  assert.equal(summary.errors, 0);
  assert.ok(await exists(path.join(dir, 'a.webp')), 'a.webp created');
  assert.ok(!(await exists(path.join(dir, 'a.jpg'))), 'a.jpg removed');
});

test('run with format=png and format=gif produce the chosen extension', async () => {
  const dir = await tmpdir();
  await writeJpeg(path.join(dir, 'p.jpg'));
  await writeJpeg(path.join(dir, 'g.jpg'));
  await run(dir, { format: 'png' });
  assert.ok(await exists(path.join(dir, 'p.png')), 'p.png created');
  // gif still works even though it may not shrink (palette format)
  const { summary } = await run(dir, { format: 'gif' });
  assert.equal(summary.errors, 0);
  assert.ok(await exists(path.join(dir, 'p.gif')), 'p.gif created');
});

// ---- core: affix keeps the original ----------------------------------------

test('affix suffix writes a renamed copy and keeps the original', async () => {
  const dir = await tmpdir();
  await writeJpeg(path.join(dir, 'a.jpg'));
  await run(dir, { format: 'jpg', affix: { position: 'suffix', text: '_min' } });
  assert.ok(await exists(path.join(dir, 'a_min.jpg')), 'a_min.jpg created');
  assert.ok(await exists(path.join(dir, 'a.jpg')), 'a.jpg kept');
});

test('affix prefix keeps the original even across a format change', async () => {
  const dir = await tmpdir();
  await writeJpeg(path.join(dir, 'a.jpg'));
  await run(dir, { format: 'webp', affix: { position: 'prefix', text: 'min_' } });
  assert.ok(await exists(path.join(dir, 'min_a.webp')), 'min_a.webp created');
  assert.ok(await exists(path.join(dir, 'a.jpg')), 'a.jpg kept');
});

// ---- wizard end-to-end ------------------------------------------------------

test('wizard: rename + webp + run writes a renamed file and remembers the folder', async () => {
  const dir = await tmpdir();
  await writeJpeg(path.join(dir, 'a.jpg'));
  const configPath = path.join(await tmpdir(), 'config.json');

  const { result, text } = await driveWizard([
    dir,     // target folder (none remembered)
    '2',     // save mode: save as new name
    '2',     // position: suffix
    '_min',  // text
    '2',     // format: webp
    '1',     // proceed: run now
  ], { cwd: dir, configPath });

  assert.ok(result, 'wizard returned a result');
  assert.equal(result.summary.errors, 0);
  assert.ok(await exists(path.join(dir, 'a_min.webp')), 'a_min.webp created');
  assert.ok(await exists(path.join(dir, 'a.jpg')), 'original kept');

  const config = await loadConfig(configPath);
  assert.equal(config.lastFolder, path.resolve(dir), 'folder remembered');
  assert.match(text, /These 1 image\(s\) will be processed/);
});

test('wizard: dry-run preview then decline writes nothing', async () => {
  const dir = await tmpdir();
  const before = await writeJpeg(path.join(dir, 'a.jpg'));
  const configPath = path.join(await tmpdir(), 'config.json');

  const { result, text } = await driveWizard([
    dir,   // target folder
    '1',   // save mode: overwrite
    '3',   // format: gif
    '2',   // proceed: dry-run preview first
    'n',   // run for real? -> no
  ], { cwd: dir, configPath });

  assert.equal(result, null, 'declined run returns null');
  assert.ok(await exists(path.join(dir, 'a.jpg')), 'original still present');
  assert.equal((await fs.stat(path.join(dir, 'a.jpg'))).size, before, 'original untouched');
  assert.ok(!(await exists(path.join(dir, 'a.gif'))), 'no gif written');
  assert.match(text, /\[dry-run\]/);
});

test('wizard: empty folder reports no images and returns null', async () => {
  const dir = await tmpdir();
  const configPath = path.join(await tmpdir(), 'config.json');

  const { result, text } = await driveWizard([dir], { cwd: dir, configPath });

  assert.equal(result, null);
  assert.match(text, /No .* images found/);
});

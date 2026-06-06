import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

import { run, collectImages } from '../src/index.js';

const W = 256, H = 256, C = 3;

// Deterministic high-entropy (noisy) raw image — worst case for compression,
// so lowering quality reliably reduces size.
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
  return await fs.mkdtemp(path.join(os.tmpdir(), 'fitimage-'));
}

async function writeJpeg(file, quality) {
  const data = await sharp(noisyRaw(), { raw: { width: W, height: H, channels: C } })
    .jpeg({ quality })
    .toBuffer();
  await fs.writeFile(file, data);
  return data.length;
}

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function writeGif(file) {
  const raw = noisyRaw();
  const data = await sharp(raw, { raw: { width: W, height: H, channels: C } })
    .gif()
    .toBuffer();
  await fs.writeFile(file, data);
  return data.length;
}

test('collectImages finds images recursively', async () => {
  const dir = await tmpdir();
  await fs.mkdir(path.join(dir, 'sub'));
  await writeJpeg(path.join(dir, 'a.jpg'), 90);
  await writeJpeg(path.join(dir, 'sub', 'b.jpg'), 90);
  const all = await collectImages(dir, true);
  assert.equal(all.length, 2);
  const flat = await collectImages(dir, false);
  assert.equal(flat.length, 1);
});

test('compresses JPEG in place and reduces size', async () => {
  const dir = await tmpdir();
  const file = path.join(dir, 'a.jpg');
  const before = await writeJpeg(file, 100);

  const { summary } = await run(dir, { quality: 30 });
  assert.equal(summary.errors, 0);

  const after = (await fs.stat(file)).size;
  assert.ok(after < before, `expected ${after} < ${before}`);
  assert.ok(summary.saved > 0);
});

test('converts WebP to JPG and removes the .webp by default', async () => {
  const dir = await tmpdir();
  const webp = path.join(dir, 'b.webp');
  const data = await sharp(noisyRaw(), { raw: { width: W, height: H, channels: C } })
    .webp({ quality: 90 })
    .toBuffer();
  await fs.writeFile(webp, data);

  const { summary } = await run(dir, { quality: 70 });
  assert.equal(summary.errors, 0);
  assert.ok(await exists(path.join(dir, 'b.jpg')), 'b.jpg should exist');
  assert.ok(!(await exists(webp)), 'original .webp should be removed');
});

test('--keep-original keeps the source .webp', async () => {
  const dir = await tmpdir();
  const webp = path.join(dir, 'c.webp');
  const data = await sharp(noisyRaw(), { raw: { width: W, height: H, channels: C } })
    .webp({ quality: 90 })
    .toBuffer();
  await fs.writeFile(webp, data);

  await run(dir, { quality: 70, keepOriginal: true });
  assert.ok(await exists(webp), '.webp should be kept');
  assert.ok(await exists(path.join(dir, 'c.jpg')), '.jpg should be created');
});

test('dry-run writes and deletes nothing', async () => {
  const dir = await tmpdir();
  const file = path.join(dir, 'a.jpg');
  const before = await writeJpeg(file, 100);

  const { summary } = await run(dir, { quality: 20, dryRun: true });
  const after = (await fs.stat(file)).size;
  assert.equal(after, before, 'file must be untouched in dry-run');
  assert.equal(summary.written, 0);
});

test('GIF is collected as input (IMAGE_EXTS includes .gif)', async () => {
  const dir = await tmpdir();
  await writeGif(path.join(dir, 'a.gif'));
  await writeJpeg(path.join(dir, 'b.jpg'), 90);
  const all = await collectImages(dir, true);
  assert.equal(all.length, 2);
  assert.ok(all.some(f => f.endsWith('.gif')));
});

test('GIF input converts to JPG via --format jpg', async () => {
  const dir = await tmpdir();
  await writeGif(path.join(dir, 'a.gif'));
  const { summary } = await run(dir, { format: 'jpg' });
  assert.equal(summary.errors, 0);
  assert.ok(await exists(path.join(dir, 'a.jpg')), 'a.jpg created');
  assert.ok(!(await exists(path.join(dir, 'a.gif'))), 'a.gif removed');
});

test('GIF input converts to WebP via --format webp', async () => {
  const dir = await tmpdir();
  await writeGif(path.join(dir, 'a.gif'));
  const { summary } = await run(dir, { format: 'webp' });
  assert.equal(summary.errors, 0);
  assert.ok(await exists(path.join(dir, 'a.webp')), 'a.webp created');
});

test('GIF input converts to PNG via --format png', async () => {
  const dir = await tmpdir();
  await writeGif(path.join(dir, 'a.gif'));
  const { summary } = await run(dir, { format: 'png' });
  assert.equal(summary.errors, 0);
  assert.ok(await exists(path.join(dir, 'a.png')), 'a.png created');
});

test('GIF input re-encodes in place when no --format given', async () => {
  const dir = await tmpdir();
  await writeGif(path.join(dir, 'a.gif'));
  const { summary } = await run(dir, {});
  assert.equal(summary.errors, 0);
  assert.ok(await exists(path.join(dir, 'a.gif')), 'a.gif still present');
});

test('--out writes to a separate dir and leaves sources intact', async () => {
  const src = await tmpdir();
  const out = await tmpdir();
  const file = path.join(src, 'a.jpg');
  const before = await writeJpeg(file, 100);

  await run(src, { quality: 40, out });
  assert.equal((await fs.stat(file)).size, before, 'source untouched');
  assert.ok(await exists(path.join(out, 'a.jpg')), 'output written');
});

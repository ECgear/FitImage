import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough, Writable } from 'node:stream';

import { oneShotFlags } from '../src/interactive.js';
import {
  buildMacQuickAction,
  buildWindowsPlan,
  buildVbs,
  macShellScript,
  macBundleName,
  winSlug,
  installCommandMenu,
  MAX_ENTRIES,
} from '../src/menu.js';

// ---- test doubles ----------------------------------------------------------

// `seed.dirs[path]` → array returned by readdir; `seed.files[path]` → readFile
// content; `seed.run(file, args)` → stdout string for a spawned command.
function fakeIO(seed = {}) {
  const calls = { writeFile: [], mkdirp: [], rm: [], run: [], readdir: [], readFile: [] };
  return {
    calls,
    writeFile: async (p, c) => { calls.writeFile.push([p, c]); },
    mkdirp: async (p) => { calls.mkdirp.push(p); },
    rm: async (p) => { calls.rm.push(p); },
    run: async (f, a) => { calls.run.push([f, a]); return { stdout: (seed.run && seed.run(f, a)) || '' }; },
    // Look up seeded paths with forward slashes so seeds written with '/' match
    // even on Windows, where path.join() produces '\\'.
    readdir: async (p) => { calls.readdir.push(p); return (seed.dirs && seed.dirs[p.replaceAll('\\', '/')]) || []; },
    readFile: async (p) => {
      calls.readFile.push(p);
      const key = p.replaceAll('\\', '/');
      if (seed.files && key in seed.files) return seed.files[key];
      throw new Error(`ENOENT ${p}`);
    },
  };
}

// An io whose every method throws — proves a code path performed no real work.
function throwingIO() {
  const boom = () => { throw new Error('io should not be touched'); };
  return { writeFile: boom, mkdirp: boom, rm: boom, run: boom, readdir: boom, readFile: boom };
}

// Drive the installer with scripted answers (same approach as interactive.test).
async function driveMenu(answers, opts = {}) {
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
  const result = await installCommandMenu({ input, output, ...opts });
  return { result, text };
}

// ---- shared flag builder ---------------------------------------------------

test('oneShotFlags mirrors the buildOneShotCommand flag logic', () => {
  assert.deepEqual(oneShotFlags({ format: 'webp' }), ['--format', 'webp']);
  assert.deepEqual(oneShotFlags({ format: 'jpg', quality: 60 }), ['--format', 'jpg', '--quality', '60']);
  assert.deepEqual(oneShotFlags({ format: 'jpg', quality: 75 }), ['--format', 'jpg']); // default omitted
  assert.deepEqual(oneShotFlags({ format: 'webp', keepOriginal: true }), ['--format', 'webp', '--keep-original']);
  assert.deepEqual(oneShotFlags({ affix: { position: 'prefix', text: 'min_' } }), ['--prefix', 'min_']);
  assert.deepEqual(oneShotFlags({}), []);
});

// ---- macOS builder ---------------------------------------------------------

test('buildMacQuickAction embeds label, launcher, flags, and a notification', () => {
  const files = buildMacQuickAction({
    label: 'Shrink it',
    flags: ['--format', 'webp', '--quality', '60'],
    node: '/usr/bin/node',
    cli: '/opt/fi/cli.js',
  });
  const info = files['Contents/Info.plist'];
  const wflow = files['Contents/document.wflow'];

  // Info.plist: the label + both file kinds (images and folders).
  assert.match(info, /<string>Shrink it<\/string>/);
  assert.match(info, /public\.image/);
  assert.match(info, /public\.folder/);
  assert.match(info, /runWorkflowAsService/);
  // macOS Sequoia required keys.
  assert.match(info, /NSIconName/);
  assert.match(info, /NSActionTemplate/);

  // document.wflow: absolute launcher, baked flags, pass-as-arguments, notify.
  assert.match(wflow, /\/usr\/bin\/node/);
  assert.match(wflow, /\/opt\/fi\/cli\.js/);
  assert.match(wflow, /--format webp --quality 60/);
  assert.match(wflow, /<key>inputMethod<\/key>\s*<integer>1<\/integer>/);
  assert.match(wflow, /com\.apple\.Automator\.fileSystemObject/);
  assert.match(wflow, /display notification/);
  // Finder binding and presentationMode 15.
  assert.match(wflow, /applicationBundleID/);
  assert.match(wflow, /com\.apple\.finder/);
  assert.match(wflow, /<integer>15<\/integer>/);
});

test('buildMacQuickAction XML-escapes the label', () => {
  const files = buildMacQuickAction({ label: 'A & B <x>', node: '/n', cli: '/c' });
  assert.match(files['Contents/Info.plist'], /A &amp; B &lt;x&gt;/);
});

test('macShellScript loops over arguments and keeps originals out of the script', () => {
  const s = macShellScript({ node: '/n', cli: '/c', flags: ['--format', 'png'] });
  assert.match(s, /for f in "\$@"; do/);
  assert.match(s, /"\/n" "\/c" "\$f" --format png/);
});

// ---- Windows builder -------------------------------------------------------

test('buildWindowsPlan covers image extensions + folders with a hidden launcher', () => {
  const plan = buildWindowsPlan({
    label: 'Shrink',
    flags: ['--format', 'webp'],
    node: 'C:\\node.exe',
    cli: 'C:\\fi\\cli.js',
    dataDir: 'C:\\data\\FitImage',
  });

  // Subkey + .vbs are slugged from the label so several entries coexist.
  assert.equal(plan.key, 'FitImage_Shrink');
  assert.ok(plan.vbsPath.endsWith('fitimage-menu-Shrink.vbs'));
  assert.equal(plan.regEntries.length, 6); // 5 image exts + folders

  const bases = plan.regEntries.map((e) => e.base);
  assert.ok(bases.includes('HKCU\\Software\\Classes\\SystemFileAssociations\\.jpg\\shell\\FitImage_Shrink'));
  assert.ok(bases.includes('HKCU\\Software\\Classes\\SystemFileAssociations\\.gif\\shell\\FitImage_Shrink'));
  assert.ok(bases.includes('HKCU\\Software\\Classes\\Directory\\shell\\FitImage_Shrink'));

  for (const e of plan.regEntries) {
    assert.equal(e.label, 'Shrink');
    assert.match(e.command, /^wscript\.exe /);
    assert.match(e.command, /"%1"/);
  }

  assert.match(plan.vbsContent, /WScript\.Shell/);
  assert.match(plan.vbsContent, /sh\.Run cmd, 0, True/);
  assert.match(plan.vbsContent, /--format webp/);
});

test('macBundleName / winSlug derive safe, unique names per label', () => {
  assert.equal(macBundleName('jpg'), 'FitImage - jpg.workflow');
  assert.equal(macBundleName('webp'), 'FitImage - webp.workflow');
  assert.notEqual(macBundleName('jpg'), macBundleName('webp'));
  // Path separators / colons are stripped so the filename is always valid.
  assert.equal(macBundleName('a/b:c'), 'FitImage - a-b-c.workflow');
  assert.equal(macBundleName('   '), 'FitImage - FitImage.workflow'); // empty → fallback

  assert.equal(winSlug('Compress to JPG'), 'Compress_to_JPG');
  assert.equal(winSlug('jpg'), 'jpg');
  assert.equal(winSlug('!!!'), 'entry'); // non-alphanumeric → fallback
});

test('two labels produce distinct Windows subkeys and .vbs files', () => {
  const a = buildWindowsPlan({ label: 'jpg', flags: [], node: 'C:\\n', cli: 'C:\\c' });
  const b = buildWindowsPlan({ label: 'webp', flags: [], node: 'C:\\n', cli: 'C:\\c' });
  assert.equal(a.key, 'FitImage_jpg');
  assert.equal(b.key, 'FitImage_webp');
  assert.notEqual(a.vbsPath, b.vbsPath);
  assert.notEqual(a.regEntries[0].base, b.regEntries[0].base);
});

test('buildVbs encodes embedded quotes as Chr(34) so the .vbs stays valid', () => {
  // A suffix with a space becomes a shell-quoted token; the .vbs must not break.
  const flags = oneShotFlags({ format: 'webp', affix: { position: 'suffix', text: '_my min' } });
  const vbs = buildVbs({ node: '/n', cli: '/c', flags });
  assert.match(vbs, /q = Chr\(34\)/);
  assert.match(vbs, / & q & /);       // quotes spliced via the q variable
  assert.match(vbs, /_my min/);       // the value text survives
});

// ---- installer wizard ------------------------------------------------------

test('installCommandMenu on an unsupported platform only prints manual help', async () => {
  let text = '';
  const output = new Writable({ write(c, _e, cb) { text += c.toString(); cb(); } });
  const result = await installCommandMenu({ platform: 'linux', options: { format: 'webp' }, output, io: throwingIO() });
  assert.equal(result.installed, false);
  assert.equal(result.reason, 'unsupported-platform');
  assert.match(text, /macOS and Windows only/);
  assert.match(text, /--format webp/);
});

test('installCommandMenu installs a macOS Quick Action via the injected io', async () => {
  const io = fakeIO();
  const { result, text } = await driveMenu(['1', 'My Label'], {
    platform: 'darwin',
    servicesDir: '/tmp/Services',
    launcher: { node: '/usr/bin/node', cli: '/opt/fi/cli.js' },
    options: { format: 'webp' },
    io,
  });
  assert.equal(result.installed, true);
  assert.equal(result.label, 'My Label');

  // The bundle is named after the label (prefixed) so multiple can coexist.
  // Normalise separators so the assertion holds on Windows (path.join → '\\').
  const written = io.calls.writeFile.map(([p]) => p.replaceAll('\\', '/'));
  assert.ok(written.some((p) => p.endsWith('FitImage - My Label.workflow/Contents/Info.plist')));
  assert.ok(written.some((p) => p.endsWith('FitImage - My Label.workflow/Contents/document.wflow')));
  assert.match(text, /Quick Actions/);
  // lsregister called to register the bundle with Launch Services.
  assert.ok(io.calls.run.some(([f]) => f.includes('lsregister')));
});

test('installCommandMenu installs Windows registry entries via the injected io', async () => {
  const io = fakeIO();
  const { result } = await driveMenu(['1', 'Compress'], {
    platform: 'win32',
    launcher: { node: 'C:\\node.exe', cli: 'C:\\fi\\cli.js' },
    options: { format: 'webp' },
    io,
  });
  assert.equal(result.installed, true);

  const regAdds = io.calls.run.filter(([f, a]) => f === 'reg' && a[0] === 'add');
  assert.equal(regAdds.length, 12); // 6 bases × (label + command)
  // The subkey + .vbs are slugged from the label so multiple can coexist.
  assert.ok(regAdds.every(([, a]) => a[1].includes('FitImage_Compress')));
  assert.ok(io.calls.writeFile.some(([p]) => p.endsWith('fitimage-menu-Compress.vbs')));
});

test('two different labels install to distinct macOS bundles (no overwrite)', async () => {
  const launcher = { node: '/usr/bin/node', cli: '/opt/fi/cli.js' };
  const ioJpg = fakeIO();
  await driveMenu(['1', 'jpg'], { platform: 'darwin', servicesDir: '/tmp/S', launcher, options: { format: 'jpg' }, io: ioJpg });
  const ioWebp = fakeIO();
  await driveMenu(['1', 'webp'], { platform: 'darwin', servicesDir: '/tmp/S', launcher, options: { format: 'webp' }, io: ioWebp });

  assert.ok(ioJpg.calls.writeFile.some(([p]) => p.includes('FitImage - jpg.workflow')));
  assert.ok(ioWebp.calls.writeFile.some(([p]) => p.includes('FitImage - webp.workflow')));
  // The two bundle paths differ — the second install does not clobber the first.
  assert.notEqual(macBundleName('jpg'), macBundleName('webp'));
});

test('installCommandMenu lists entries and removes the chosen macOS Quick Action', async () => {
  const dir = '/tmp/Services';
  const seed = {
    dirs: { [dir]: ['FitImage - jpg.workflow', 'FitImage - webp.workflow'] },
    files: {
      [`${dir}/FitImage - jpg.workflow/Contents/Info.plist`]: '<key>default</key>\n<string>jpg</string>',
      [`${dir}/FitImage - webp.workflow/Contents/Info.plist`]: '<key>default</key>\n<string>webp</string>',
    },
  };
  const io = fakeIO(seed);
  // Remove → pick the second listed entry (webp).
  const { result, text } = await driveMenu(['2', '2'], { platform: 'darwin', servicesDir: dir, options: {}, io });
  assert.equal(result.removed, true);
  assert.equal(result.count, 1);
  assert.deepEqual(io.calls.rm.map((p) => p.replaceAll('\\', '/')), [`${dir}/FitImage - webp.workflow`]);
  assert.match(text, /Removed "webp"/);
});

test('installCommandMenu can remove all macOS entries at once', async () => {
  const dir = '/tmp/Services';
  const seed = {
    dirs: { [dir]: ['FitImage - jpg.workflow', 'FitImage.workflow'] }, // new + legacy
    files: {
      [`${dir}/FitImage - jpg.workflow/Contents/Info.plist`]: '<key>default</key>\n<string>jpg</string>',
      [`${dir}/FitImage.workflow/Contents/Info.plist`]: '<key>default</key>\n<string>old</string>',
    },
  };
  const io = fakeIO(seed);
  // Remove → "All FitImage entries" is the option after the two labels.
  const { result } = await driveMenu(['2', '3'], { platform: 'darwin', servicesDir: dir, options: {}, io });
  assert.equal(result.removed, true);
  assert.equal(result.count, 2);
  assert.equal(io.calls.rm.length, 2);
});

test('Remove reports nothing to do when no entries exist', async () => {
  const io = fakeIO(); // readdir → []
  const { result, text } = await driveMenu(['2'], { platform: 'darwin', servicesDir: '/tmp/Services', options: {}, io });
  assert.equal(result.removed, false);
  assert.equal(result.count, 0);
  assert.match(text, /Nothing to remove/);
  assert.equal(io.calls.rm.length, 0);
});

test('a new label is refused once MAX_ENTRIES already exist', async () => {
  const dir = '/tmp/Services';
  const names = Array.from({ length: MAX_ENTRIES }, (_, i) => `FitImage - e${i}.workflow`);
  const files = {};
  names.forEach((n, i) => { files[`${dir}/${n}/Contents/Info.plist`] = `<key>default</key>\n<string>e${i}</string>`; });
  const io = fakeIO({ dirs: { [dir]: names }, files });

  const { result, text } = await driveMenu(['1', 'a-brand-new-label'], {
    platform: 'darwin', servicesDir: dir, options: { format: 'jpg' }, io,
  });
  assert.equal(result.installed, false);
  assert.equal(result.reason, 'limit-reached');
  assert.equal(io.calls.writeFile.length, 0); // nothing written
  assert.match(text, new RegExp(`maximum is ${MAX_ENTRIES}`));
});

test('updating an existing label is allowed even at the limit', async () => {
  const dir = '/tmp/Services';
  const names = Array.from({ length: MAX_ENTRIES }, (_, i) => `FitImage - e${i}.workflow`);
  const files = {};
  names.forEach((n, i) => { files[`${dir}/${n}/Contents/Info.plist`] = `<key>default</key>\n<string>e${i}</string>`; });
  const io = fakeIO({ dirs: { [dir]: names }, files });

  // Label "e0" maps to an existing bundle → it's an update, not an addition.
  const { result } = await driveMenu(['1', 'e0'], {
    platform: 'darwin', servicesDir: dir,
    launcher: { node: '/n', cli: '/c' }, options: { format: 'jpg' }, io,
  });
  assert.equal(result.installed, true);
  assert.equal(result.isUpdate, true);
  assert.ok(io.calls.writeFile.some(([p]) => p.includes('FitImage - e0.workflow')));
});

test('installCommandMenu cancels without touching the system', async () => {
  const { result, text } = await driveMenu(['3'], {
    platform: 'darwin',
    servicesDir: '/tmp/Services',
    options: {},
    io: throwingIO(),
  });
  assert.equal(result.cancelled, true);
  assert.match(text, /Cancelled/);
});

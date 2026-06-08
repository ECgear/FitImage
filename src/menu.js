// FitImage right-click menu integration.
//
// Turns a "one-shot command" (the fitimage flags the wizard captured) into a
// native context-menu entry:
//   - macOS  : an Automator Quick Action (.workflow) in ~/Library/Services
//   - Windows: HKCU registry entries + a hidden VBScript launcher
//
// The menu entry runs the SAME compression non-interactively on whatever file
// or folder you right-clicked, then shows a notification (no terminal window).
//
// This module is the "second" interactive interface: it is reached only by
// appending --install-menu to a one-shot command (see bin/cli.js); it never
// appears as a step in the normal wizard.
//
// No new dependencies: Node built-ins + OS tools (osascript / reg / wscript).

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as readline from 'node:readline/promises';

import { oneShotFlags, choose } from './interactive.js';

const execFileAsync = promisify(execFile);

export const DEFAULT_LABEL = 'Compress with FitImage';
export const BUNDLE_NAME = 'FitImage.workflow';   // legacy single-entry name (still detected on remove)
export const MENU_KEY = 'FitImage';               // legacy single-entry registry key (still detected)
export const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// Multiple right-click entries can coexist — one per label. To avoid clutter in
// the context menu (and an unwieldy remove list), cap how many we keep.
export const MAX_ENTRIES = 10;
export const BUNDLE_PREFIX = 'FitImage - ';       // on-disk bundle name prefix (NOT shown in Finder)
export const MENU_KEY_PREFIX = 'FitImage_';       // Windows registry subkey prefix

/** Filesystem-safe macOS bundle name for a label (the name itself never shows in Finder). */
export function macBundleName(label) {
  const safe = String(label).replace(/[/:\x00]+/g, '-').replace(/\s+/g, ' ').trim() || 'FitImage';
  return `${BUNDLE_PREFIX}${safe}.workflow`;
}

/** Registry-safe slug for a label (used in the HKCU subkey and the .vbs filename). */
export function winSlug(label) {
  return String(label).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'entry';
}

// ---- launcher + locations --------------------------------------------------

/** Absolute paths the menu bakes in so it never depends on PATH/global install. */
export function resolveLauncher() {
  return {
    node: process.execPath,
    cli: fileURLToPath(new URL('../bin/cli.js', import.meta.url)),
  };
}

/** ~/Library/Services — where macOS looks for Quick Actions. */
export function macServiceDir() {
  return path.join(os.homedir(), 'Library', 'Services');
}

/** %LOCALAPPDATA%\FitImage — where we keep the hidden Windows launcher. */
export function windowsDataDir() {
  const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(base, 'FitImage');
}

// ---- tiny escapers ---------------------------------------------------------

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Render a JS string as a VBScript string expression, encoding any double quote
 * as the runtime variable `q` (= Chr(34)). Lets us embed shell-quoted flags
 * (which may contain ") into the .vbs without breaking its string literals.
 */
function vbsLiteral(s) {
  return String(s).split('"').map((seg) => `"${seg}"`).join(' & q & ');
}

// ---- macOS: Automator Quick Action -----------------------------------------

/** The shell the Quick Action runs: compress each argument, then notify. */
export function macShellScript({ node, cli, flags = [] } = {}) {
  const tail = flags.length ? ' ' + flags.join(' ') : '';
  return [
    'for f in "$@"; do',
    `  "${node}" "${cli}" "$f"${tail}`,
    'done',
    `osascript -e 'display notification "FitImage: done" with title "FitImage"'`,
  ].join('\n');
}

function macInfoPlist(label) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>NSServices</key>
	<array>
		<dict>
			<key>NSBackgroundColorName</key>
			<string>background</string>
			<key>NSIconName</key>
			<string>NSActionTemplate</string>
			<key>NSMenuItem</key>
			<dict>
				<key>default</key>
				<string>${xmlEscape(label)}</string>
			</dict>
			<key>NSMessage</key>
			<string>runWorkflowAsService</string>
			<key>NSRequiredContext</key>
			<dict>
				<key>NSApplicationIdentifier</key>
				<string>com.apple.finder</string>
			</dict>
			<key>NSSendFileTypes</key>
			<array>
				<string>public.image</string>
				<string>public.folder</string>
			</array>
		</dict>
	</array>
</dict>
</plist>
`;
}

function macWflow(script) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>AMApplicationBuild</key>
	<string>523</string>
	<key>AMApplicationVersion</key>
	<string>2.10</string>
	<key>AMDocumentVersion</key>
	<string>2</string>
	<key>actions</key>
	<array>
		<dict>
			<key>action</key>
			<dict>
				<key>AMAccepts</key>
				<dict>
					<key>Container</key>
					<string>List</string>
					<key>Optional</key>
					<true/>
					<key>Types</key>
					<array>
						<string>com.apple.cocoa.string</string>
					</array>
				</dict>
				<key>AMActionVersion</key>
				<string>2.0.3</string>
				<key>AMApplication</key>
				<array>
					<string>Automator</string>
				</array>
				<key>AMParameterProperties</key>
				<dict>
					<key>COMMAND_STRING</key>
					<dict/>
					<key>CheckedForUserDefaultShell</key>
					<dict/>
					<key>inputMethod</key>
					<dict/>
					<key>shell</key>
					<dict/>
					<key>source</key>
					<dict/>
				</dict>
				<key>AMProvides</key>
				<dict>
					<key>Container</key>
					<string>List</string>
					<key>Types</key>
					<array>
						<string>com.apple.cocoa.string</string>
					</array>
				</dict>
				<key>ActionBundlePath</key>
				<string>/System/Library/Automator/Run Shell Script.action</string>
				<key>ActionName</key>
				<string>Run Shell Script</string>
				<key>ActionParameters</key>
				<dict>
					<key>COMMAND_STRING</key>
					<string>${xmlEscape(script)}</string>
					<key>CheckedForUserDefaultShell</key>
					<true/>
					<key>inputMethod</key>
					<integer>1</integer>
					<key>shell</key>
					<string>/bin/zsh</string>
					<key>source</key>
					<string></string>
				</dict>
				<key>BundleIdentifier</key>
				<string>com.apple.RunShellScript</string>
				<key>CFBundleVersion</key>
				<string>2.0.3</string>
				<key>CanShowSelectedItemsWhenRun</key>
				<false/>
				<key>CanShowWhenRun</key>
				<true/>
				<key>Category</key>
				<array>
					<string>AMCategoryUtilities</string>
				</array>
				<key>Class Name</key>
				<string>RunShellScriptAction</string>
				<key>InputUUID</key>
				<string>3F2A1B4C-0001-4E2A-9C11-A00000000001</string>
				<key>Keywords</key>
				<array>
					<string>Shell</string>
					<string>Script</string>
					<string>Command</string>
					<string>Run</string>
					<string>Unix</string>
				</array>
				<key>OutputUUID</key>
				<string>3F2A1B4C-0002-4E2A-9C11-A00000000002</string>
				<key>UUID</key>
				<string>3F2A1B4C-0003-4E2A-9C11-A00000000003</string>
				<key>UnlocalizedApplications</key>
				<array>
					<string>Automator</string>
				</array>
				<key>arguments</key>
				<dict>
					<key>0</key>
					<dict>
						<key>default value</key>
						<integer>0</integer>
						<key>name</key>
						<string>inputMethod</string>
						<key>required</key>
						<string>0</string>
						<key>type</key>
						<string>0</string>
						<key>uuid</key>
						<string>0</string>
					</dict>
					<key>1</key>
					<dict>
						<key>default value</key>
						<false/>
						<key>name</key>
						<string>CheckedForUserDefaultShell</string>
						<key>required</key>
						<string>0</string>
						<key>type</key>
						<string>0</string>
						<key>uuid</key>
						<string>1</string>
					</dict>
					<key>2</key>
					<dict>
						<key>default value</key>
						<string></string>
						<key>name</key>
						<string>source</string>
						<key>required</key>
						<string>0</string>
						<key>type</key>
						<string>0</string>
						<key>uuid</key>
						<string>2</string>
					</dict>
					<key>3</key>
					<dict>
						<key>default value</key>
						<string></string>
						<key>name</key>
						<string>COMMAND_STRING</string>
						<key>required</key>
						<string>0</string>
						<key>type</key>
						<string>0</string>
						<key>uuid</key>
						<string>3</string>
					</dict>
					<key>4</key>
					<dict>
						<key>default value</key>
						<string>/bin/sh</string>
						<key>name</key>
						<string>shell</string>
						<key>required</key>
						<string>0</string>
						<key>type</key>
						<string>0</string>
						<key>uuid</key>
						<string>4</string>
					</dict>
				</dict>
				<key>isViewVisible</key>
				<integer>1</integer>
				<key>location</key>
				<string>309.000000:253.000000</string>
				<key>nibPath</key>
				<string>/System/Library/Automator/Run Shell Script.action/Contents/Resources/Base.lproj/main.nib</string>
			</dict>
			<key>isViewVisible</key>
			<integer>1</integer>
		</dict>
	</array>
	<key>connectors</key>
	<dict/>
	<key>workflowMetaData</key>
	<dict>
		<key>applicationBundleID</key>
		<string>com.apple.finder</string>
		<key>applicationBundleIDsByPath</key>
		<dict>
			<key>/System/Library/CoreServices/Finder.app</key>
			<string>com.apple.finder</string>
		</dict>
		<key>applicationPath</key>
		<string>/System/Library/CoreServices/Finder.app</string>
		<key>applicationPaths</key>
		<array>
			<string>/System/Library/CoreServices/Finder.app</string>
		</array>
		<key>inputTypeIdentifier</key>
		<string>com.apple.Automator.fileSystemObject</string>
		<key>outputTypeIdentifier</key>
		<string>com.apple.Automator.nothing</string>
		<key>presentationMode</key>
		<integer>15</integer>
		<key>processesInput</key>
		<integer>0</integer>
		<key>serviceApplicationBundleID</key>
		<string>com.apple.finder</string>
		<key>serviceApplicationPath</key>
		<string>/System/Library/CoreServices/Finder.app</string>
		<key>serviceInputTypeIdentifier</key>
		<string>com.apple.Automator.fileSystemObject</string>
		<key>serviceOutputTypeIdentifier</key>
		<string>com.apple.Automator.nothing</string>
		<key>serviceProcessesInput</key>
		<integer>0</integer>
		<key>systemImageName</key>
		<string>NSActionTemplate</string>
		<key>useAutomaticInputType</key>
		<integer>0</integer>
		<key>workflowTypeIdentifier</key>
		<string>com.apple.Automator.servicesMenu</string>
	</dict>
</dict>
</plist>
`;
}

/**
 * Build the file map for the .workflow bundle (pure — no I/O).
 * Returns { 'Contents/Info.plist': string, 'Contents/document.wflow': string }.
 */
export function buildMacQuickAction({ label = DEFAULT_LABEL, flags = [], node, cli } = {}) {
  return {
    'Contents/Info.plist': macInfoPlist(label),
    'Contents/document.wflow': macWflow(macShellScript({ node, cli, flags })),
  };
}

// ---- Windows: registry + hidden VBScript launcher --------------------------

/** Hidden launcher: run node on the right-clicked item, then a brief popup. */
export function buildVbs({ node, cli, flags = [] } = {}) {
  let cmdExpr =
    `q & "${node}" & q & " " & q & "${cli}" & q & " " & q & target & q`;
  if (flags.length) cmdExpr += ` & " " & ${vbsLiteral(flags.join(' '))}`;
  return [
    'Set sh = CreateObject("WScript.Shell")',
    'If WScript.Arguments.Count = 0 Then WScript.Quit',
    'q = Chr(34)',
    'target = WScript.Arguments(0)',
    `cmd = ${cmdExpr}`,
    'sh.Run cmd, 0, True',
    'sh.Popup "FitImage: done", 3, "FitImage", 64',
    '',
  ].join('\r\n');
}

/**
 * Build the Windows install plan (pure — no I/O). Returns the .vbs to write and
 * the HKCU registry entries to add (one per image extension + folders).
 */
export function buildWindowsPlan({ label = DEFAULT_LABEL, flags = [], node, cli, dataDir = windowsDataDir() } = {}) {
  const slug = winSlug(label);
  const key = `${MENU_KEY_PREFIX}${slug}`;
  const vbsPath = path.join(dataDir, `fitimage-menu-${slug}.vbs`);
  const vbsContent = buildVbs({ node, cli, flags });
  const command = `wscript.exe "${vbsPath}" "%1"`;
  const bases = [
    ...IMAGE_EXTS.map((ext) => `HKCU\\Software\\Classes\\SystemFileAssociations\\${ext}\\shell\\${key}`),
    `HKCU\\Software\\Classes\\Directory\\shell\\${key}`,
  ];
  const regEntries = bases.map((base) => ({ base, label, command }));
  return { slug, key, vbsPath, vbsContent, command, regEntries };
}

/** The parent `...\shell` keys we register entries under (used to enumerate entries). */
function windowsShellParents() {
  return [
    ...IMAGE_EXTS.map((ext) => `HKCU\\Software\\Classes\\SystemFileAssociations\\${ext}\\shell`),
    `HKCU\\Software\\Classes\\Directory\\shell`,
  ];
}

// ---- I/O layer (injectable for tests) --------------------------------------

const LSREG =
  '/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/' +
  'LaunchServices.framework/Versions/A/Support/lsregister';

export const realIO = {
  writeFile: (p, content) => fs.writeFile(p, content),
  mkdirp: (p) => fs.mkdir(p, { recursive: true }),
  rm: (p) => fs.rm(p, { recursive: true, force: true }),
  run: (file, args) => execFileAsync(file, args),
  readdir: (p) => fs.readdir(p),
  readFile: (p) => fs.readFile(p, 'utf8'),
};

export async function installMac({ files, label = DEFAULT_LABEL, servicesDir = macServiceDir(), io = realIO } = {}) {
  const root = path.join(servicesDir, macBundleName(label));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    await io.mkdirp(path.dirname(full));
    await io.writeFile(full, content);
  }
  // Register with Launch Services so the Quick Action appears in Finder immediately.
  await io.run(LSREG, [root]).catch(() => {});
  return root;
}

export async function uninstallMac({ label = null, bundleName = null, servicesDir = macServiceDir(), io = realIO } = {}) {
  const name = bundleName || (label != null ? macBundleName(label) : BUNDLE_NAME);
  await io.rm(path.join(servicesDir, name));
}

/** Read NSMenuItem.default (the label shown in Finder) out of an Info.plist string. */
function labelFromInfoPlist(xml) {
  const m = xml.match(/<key>default<\/key>\s*<string>([\s\S]*?)<\/string>/);
  if (!m) return null;
  return m[1]
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

/** List FitImage Quick Action bundles in ~/Library/Services (legacy + prefixed). */
export async function listMacEntries({ servicesDir = macServiceDir(), io = realIO } = {}) {
  let names;
  try { names = await io.readdir(servicesDir); } catch { return []; }
  const bundles = names.filter(
    (n) => n === BUNDLE_NAME || (n.startsWith(BUNDLE_PREFIX) && n.endsWith('.workflow')),
  );
  const out = [];
  for (const bundleName of bundles) {
    const bundlePath = path.join(servicesDir, bundleName);
    let label = null;
    try { label = labelFromInfoPlist(await io.readFile(path.join(bundlePath, 'Contents', 'Info.plist'))); }
    catch { /* unreadable — fall back to the bundle name */ }
    if (!label) {
      label = bundleName === BUNDLE_NAME
        ? bundleName.replace(/\.workflow$/, '')
        : bundleName.slice(BUNDLE_PREFIX.length).replace(/\.workflow$/, '');
    }
    out.push({ bundleName, label, path: bundlePath });
  }
  return out;
}

export async function installWindows({ plan, io = realIO } = {}) {
  await io.mkdirp(path.dirname(plan.vbsPath));
  await io.writeFile(plan.vbsPath, plan.vbsContent);
  for (const e of plan.regEntries) {
    await io.run('reg', ['add', e.base, '/ve', '/d', e.label, '/f']);
    await io.run('reg', ['add', `${e.base}\\command`, '/ve', '/d', e.command, '/f']);
  }
}

export async function uninstallWindows({ plan, io = realIO } = {}) {
  for (const e of plan.regEntries) {
    try { await io.run('reg', ['delete', e.base, '/f']); } catch { /* not present */ }
  }
  try { await io.rm(plan.vbsPath); } catch { /* already gone */ }
}

/** List FitImage entries in HKCU by enumerating the shell parent keys. */
export async function listWindowsEntries({ io = realIO } = {}) {
  const parents = windowsShellParents();
  const found = new Map(); // key -> { key, label, bases }
  for (const parent of parents) {
    let out;
    try { out = (await io.run('reg', ['query', parent])).stdout || ''; }
    catch { continue; /* parent has no subkeys yet */ }
    for (const line of out.split(/\r?\n/)) {
      const trimmed = line.trim();
      const sub = trimmed.slice(trimmed.lastIndexOf('\\') + 1);
      const isOurs = trimmed.startsWith('HKEY') &&
        (sub === MENU_KEY || sub.startsWith(MENU_KEY_PREFIX));
      if (!isOurs) continue;
      const base = `${parent}\\${sub}`;
      let entry = found.get(sub);
      if (!entry) {
        let label = sub;
        try {
          const q = (await io.run('reg', ['query', base, '/ve'])).stdout || '';
          const m = q.match(/REG_SZ\s+(.+)\s*$/m);
          if (m) label = m[1].trim();
        } catch { /* no default value */ }
        entry = { key: sub, label, bases: [] };
        found.set(sub, entry);
      }
      entry.bases.push(base);
    }
  }
  return [...found.values()];
}

// ---- the installer wizard (the "second" interactive interface) -------------

function manualHint(output, flags) {
  const human = ['fitimage', '"<the item you right-click>"', ...flags].join(' ');
  output.write('\nFitImage right-click menu\n');
  output.write('Automatic setup is available on macOS and Windows only.\n');
  output.write('On this system, run FitImage directly, e.g.:\n');
  output.write(`  ${human}\n`);
}

/** List existing FitImage entries for the given platform: [{ label, ... }]. */
async function listEntries({ platform, servicesDir, io }) {
  return platform === 'darwin'
    ? listMacEntries({ servicesDir, io })
    : listWindowsEntries({ io });
}

/** Remove one previously-listed entry (platform-specific). */
async function removeEntry({ entry, platform, servicesDir, launcher, io }) {
  if (platform === 'darwin') {
    await uninstallMac({ bundleName: entry.bundleName, servicesDir, io });
  } else {
    const slug = entry.key.startsWith(MENU_KEY_PREFIX) ? entry.key.slice(MENU_KEY_PREFIX.length) : entry.key;
    const vbsName = entry.key === MENU_KEY ? 'fitimage-menu.vbs' : `fitimage-menu-${slug}.vbs`;
    await uninstallWindows({
      plan: { regEntries: entry.bases.map((base) => ({ base })), vbsPath: path.join(windowsDataDir(), vbsName) },
      io,
    });
  }
}

/** The Remove sub-flow: list entries, let the user pick one or all, delete. */
async function removeFlow({ rl, output, platform, servicesDir, launcher, io }) {
  const entries = await listEntries({ platform, servicesDir, io });
  if (entries.length === 0) {
    output.write('\nNothing to remove — no FitImage menu entries are installed.\n');
    return { installed: false, removed: false, platform, count: 0 };
  }

  const pick = await choose(rl, output, 'Which entry would you like to remove?', [
    ...entries.map((e) => e.label),
    'All FitImage entries',
    'Cancel',
  ]);
  if (pick === entries.length + 1) {
    output.write('Cancelled.\n');
    return { installed: false, cancelled: true, platform };
  }

  const targets = pick === entries.length ? entries : [entries[pick]];
  for (const entry of targets) {
    await removeEntry({ entry, platform, servicesDir, launcher, io });
    output.write(`Removed "${entry.label}".\n`);
  }
  return { installed: false, removed: true, platform, count: targets.length };
}

/**
 * Launch the right-click-menu installer. Reached only via `--install-menu`.
 * Uses the flags captured from the one-shot command; asks only what it must
 * (install vs remove, the menu label). Multiple entries coexist — one per label,
 * up to MAX_ENTRIES. Returns a small result object.
 */
export async function installCommandMenu({
  options = {},
  input = process.stdin,
  output = process.stdout,
  platform = process.platform,
  servicesDir = macServiceDir(),
  launcher = resolveLauncher(),
  io = realIO,
} = {}) {
  const flags = oneShotFlags(options);

  if (platform !== 'darwin' && platform !== 'win32') {
    manualHint(output, flags);
    return { installed: false, platform, reason: 'unsupported-platform' };
  }

  const rl = readline.createInterface({ input, output });
  try {
    output.write('\nFitImage — right-click menu setup\n');
    output.write('This adds a menu entry that runs, on whatever you right-click:\n');
    output.write(`  fitimage "<item>"${flags.length ? ' ' + flags.join(' ') : ''}\n`);
    output.write(`You can keep several entries (one per label, up to ${MAX_ENTRIES}).\n`);

    const action = await choose(rl, output, 'What would you like to do?', [
      'Add / update a right-click menu entry',
      'Remove a right-click menu entry',
      'Cancel',
    ]);
    if (action === 2) {
      output.write('Cancelled.\n');
      return { installed: false, cancelled: true, platform };
    }

    if (action === 1) {
      return await removeFlow({ rl, output, platform, servicesDir, launcher, io });
    }

    const label = (await rl.question(`\nMenu label [${DEFAULT_LABEL}]: `)).trim() || DEFAULT_LABEL;

    // Decide add-vs-update and enforce the cap (updates are always allowed).
    const existing = await listEntries({ platform, servicesDir, io });
    const isUpdate = platform === 'darwin'
      ? existing.some((e) => e.bundleName === macBundleName(label))
      : existing.some((e) => e.key === `${MENU_KEY_PREFIX}${winSlug(label)}` || e.key === MENU_KEY);
    if (!isUpdate && existing.length >= MAX_ENTRIES) {
      output.write(
        `\nYou already have ${existing.length} entries (the maximum is ${MAX_ENTRIES}).\n` +
        'Remove one first, then add a new one.\n',
      );
      return { installed: false, platform, reason: 'limit-reached', count: existing.length };
    }
    output.write(isUpdate
      ? `\nUpdating the existing "${label}" entry…\n`
      : `\nAdding a new "${label}" entry (${existing.length + 1}/${MAX_ENTRIES})…\n`);

    if (platform === 'darwin') {
      const files = buildMacQuickAction({ label, flags, ...launcher });
      await installMac({ files, label, servicesDir, io });
      output.write(`\nDone. In Finder, right-click an image or folder → Quick Actions → "${label}".\n`);
    } else {
      const plan = buildWindowsPlan({ label, flags, ...launcher });
      await installWindows({ plan, io });
      output.write(`\nDone. In File Explorer, right-click an image or folder → "${label}".\n`);
      output.write('(On Windows 11 it may sit under "Show more options".)\n');
    }
    output.write('\nTip: run --install-menu again with a different label to add another entry,\n');
    output.write('or the same label to update it. Choose "Remove" to delete one.\n');
    output.write('Note: the menu remembers the current Node path; re-run after reinstalling Node.\n');
    return { installed: true, platform, label, isUpdate };
  } finally {
    rl.close();
  }
}

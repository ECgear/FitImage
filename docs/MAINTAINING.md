# Maintaining FitImage

A maintainer's guide: how the code is laid out, the invariants you must not
break, how to extend it safely, and how to ship a release. Read this before
changing `src/` or cutting a version.

> This is the engineering companion to [`CONTRIBUTING.md`](../CONTRIBUTING.md).

---

## 1. What FitImage is

A cross-platform, zero-extra-dependency batch image compressor built on
[sharp](https://github.com/lovell/sharp). It can re-compress `.jpg/.jpeg/.png/.webp`
and convert between **JPG / WebP / PNG / GIF**, either via CLI flags or a guided
**interactive wizard**. Only `commander` and `sharp` are runtime deps; tests use
the Node built-in `node:test`; the wizard uses the built-in `readline/promises`.
**Do not add dependencies** without a strong reason — "no deprecated deps" is a
selling point.

---

## 2. Architecture (module map)

```
bin/cli.js        Argument parsing (commander). Routes to the wizard (no path / -i,
                  TTY required) or to run(). Maps flags -> run() options. Prints via report.js.
src/index.js      Core engine + programmatic API. The only place that touches sharp/fs.
src/interactive.js  The readline wizard. Streams are injectable for testing. Owns config persistence.
src/report.js     Pure output formatting shared by the CLI and the wizard.
test/             node:test. compress.test.js = legacy/core; interactive.test.js = new surface.
scripts/preflight.mjs  Pre-publish safety gate (secrets / dangerous names / private-dir leak / GPL deps).
.githooks/        pre-commit (preflight --staged) and pre-push (full preflight). Enabled via core.hooksPath.
```

Dependency direction: `bin/cli.js → {index, interactive, report}`,
`interactive.js → {index, report}`, `index.js → sharp`. **Nothing imports
`bin/cli.js`** (it runs `program.parseAsync` on import — importing it would
execute the CLI). That is why shared formatting lives in `report.js`, not in `bin/`.

---

## 3. Core engine — invariants you must not break

`src/index.js` exports the public API: `run`, `collectImages`, `processFile`,
`summarize`, plus helpers `extForFormat`, `applyAffix`, and the `DEFAULTS` and
`IMAGE_EXTS` constants. Tests and external callers depend on these signatures.

`DEFAULTS` (the option contract):

| key | meaning |
|---|---|
| `quality` | JPEG/WebP quality 1–100 (PNG/GIF ignore it) |
| `recursive` | descend into subdirectories |
| `out` | write results under this dir (non-destructive); preserves subdir structure |
| `dryRun` | compute only, write nothing |
| `keepOriginal` | keep source when the format changes |
| `pngToJpg` | **legacy adaptive path only** — convert PNG→JPG when `format` is null |
| `concurrency` | parallel workers |
| `format` | `null` = legacy adaptive behaviour; else `'jpg'\|'jpeg'\|'png'\|'webp'\|'gif'` |
| `affix` | `null` = overwrite in place; else `{ position:'prefix'\|'suffix', text }` |

**Invariants:**

1. **`format: null` must reproduce the original v0.1 behaviour exactly.** webp→jpg,
   png→png (or →jpg with `pngToJpg`), jpg/jpeg re-encoded keeping their own
   extension. `compress.test.js` is the regression guard — it must pass unchanged.
2. **`convertsFormat` is derived as `outExt !== inputExt`** — do not reintroduce
   hand-set flags; the derivation already reproduces every legacy case.
3. **Source deletion only when** `!out && !affix && convertsFormat && !keepOriginal
   && destPath !== file`. `affix` and `out` always keep the source (they write a
   new file). Breaking this risks data loss — it is the most dangerous line in the repo.
4. **`willWrite = (out || affix) ? true : (convertsFormat ? true : newBytes < origBytes)`.**
   Same-format in-place re-compression is skipped when it would not shrink;
   conversions, `--out`, and renamed (`affix`) outputs always write. A GIF that
   grows is still written (the user asked for it) — `summarize` reports a negative
   `saved`, and `report.js`/`fmtBytes` render negatives.
5. **Affix renames the basename only**, never directory components; subdir
   structure under `--out` is preserved via `path.dirname(relative(...))`.

Encoders: `encodeJpeg` (mozjpeg, falls back if the libvips build lacks it),
`encodePng` (`palette:false`), `encodeWebp`, `encodeGif`. `encodeAs(format,…)`
dispatches by `extForFormat`. Keep PNG on `palette:false` (truecolour) — GIF is
the only path that uses palette quantization.

---

## 4. Interactive wizard notes

- **Streams are injectable**: `runInteractive({ input, output, cwd, configPath })`.
  Production uses stdin/stdout; tests inject streams. Never call `process.stdin`
  directly inside the wizard.
- **Config persistence is best-effort** and must never fail a run. Stored at
  `$XDG_CONFIG_HOME/fitimage/config.json` else `~/.config/fitimage/config.json`
  (`defaultConfigPath`). Only `lastFolder` is remembered today; the menu is always
  shown (per product decision: 2nd+ run skips only the folder *question*).
- **Quality is fixed at 75** in the wizard by design. If you ever expose it, add a
  prompt — do not change `buildOptions`' default silently.
- **Safety gate**: the wizard always offers Run / Dry-run preview / Cancel, and
  the folder is saved only after the user commits (not on Cancel).
- **The CLI launches the wizard only on a TTY.** No path + non-TTY prints a guide
  and exits 1 (so piped/CI use never hangs waiting for input).

---

## 5. Testing

Run `npm test` (Node's test runner; no framework). Two files:

- `test/compress.test.js` — **legacy/core regression. Treat as frozen** unless
  behaviour intentionally changes.
- `test/interactive.test.js` — pure helpers, explicit-format conversions, affix
  semantics, and **end-to-end wizard runs**.

### The wizard test harness (important gotcha)

`readline` consumes its input stream **eagerly in flowing mode**, and a
`question()` only captures the *next* line emitted *after* it attaches its
listener. If you pre-buffer every answer (e.g. `pt.end(allLines)`), readline
emits the early lines before the first `question()` is awaited (the wizard does
async work like `loadConfig` first) — those lines are lost, and either the
interface auto-closes on stream end (`ERR_USE_AFTER_CLOSE`) or the next question
hangs forever.

The fix used by `driveWizard()` in `interactive.test.js`: **feed the next answer
only after the wizard prints a prompt.** Prompts don't end in `\n`; informational
lines do. So the capturing `Writable` calls `feed()` (writing one more answer
line) whenever it sees a chunk that does not end in `\n`. This keeps input and
output in lockstep and is robust. Reuse this pattern for any new wizard test; do
not pre-buffer.

When scripting answers, the count must match the prompts **exactly** (each
`choose`/`question` consumes one line). A surplus is ignored; a shortfall hangs.

---

## 6. How to add a new output format

Example: add AVIF.

1. `src/index.js`: extend `extForFormat` (`'avif' → '.avif'`), add `encodeAvif`,
   add a `case '.avif'` to `encodeAs`.
2. **Licensing check first** — confirm the codec path is permissive in sharp's
   prebuilt binary (see §8). Update `NOTICE` and README "How it works".
3. `bin/cli.js`: `--format` already validates via `extForFormat`, so no change
   beyond docs.
4. `src/interactive.js`: add the label to the format `choose` list and to the
   `FORMATS` array (keep order in sync — the menu index maps to `FORMATS[idx]`).
5. Tests: add a conversion assertion in `interactive.test.js`.
6. `CHANGELOG.md` (Added), bump minor version.

To add a new **wizard question**: add a `choose`/`question` step, thread the
answer into `buildOptions`, update the plan summary, and **add exactly one input
line** to every `driveWizard([...])` script in the tests (or they will hang).

---

## 7. Releasing

SemVer + [Keep a Changelog](https://keepachangelog.com/). Adding features = minor;
fixes = patch; breaking the API contract in §3 = major (avoid).

```bash
# 0. Identity & safety
gh auth status                      # must be ECgear
npm test                            # green
node scripts/preflight.mjs          # clean (secrets / private dirs / GPL deps)
npm pack --dry-run                  # only bin/, src/, README, LICENSE, NOTICE, CHANGELOG ship

# 1. Version + changelog
#    bump package.json "version", move CHANGELOG [Unreleased] -> [x.y.z] - <date>,
#    update the compare links at the bottom.

# 2. Commit, tag, release (Conventional Commits)
git add -A && git commit -m "feat: <summary>"
git tag vX.Y.Z && git push && git push --tags
gh release create vX.Y.Z --notes-from-tag      # or --notes "..."

# 3. (optional) publish to npm — published as the SCOPED name @ecgear/fitimage
#    (the bare name "fitimage" is refused by npm as too similar to "fit-image").
#    publishConfig.access=public makes the scoped package public; 2FA OTP is on
#    the user's npm account. The installed CLI command stays `fitimage`.
npm publish            # add --otp=<code> if prompted for a one-time password
```

`files` in `package.json` controls the tarball. New runtime modules under `src/`
are included automatically (the whole `src` dir ships); docs/tests do not. The
npm package name is **`@ecgear/fitimage`** while the CLI command and repo are
named `fitimage` / `FitImage`.

---

## 8. Licensing posture (read before touching codecs)

FitImage is **MIT** and ships only source + npm deps (never `node_modules`, never
a vendored libvips). All codec paths in use are permissive:

| Format | Path | License |
|---|---|---|
| JPEG | mozjpeg / libjpeg-turbo | BSD-3-Clause / IJG |
| PNG  | zlib / libpng (`palette:false`) | zlib / libpng |
| WebP | libwebp | BSD-3-Clause |
| GIF  | cgif + libimagequant | MIT + **BSD-2-Clause** |

**Key fact (commonly misremembered):** GIF/palette quantization uses
**libimagequant**, but sharp's prebuilt `@img/sharp-libvips-*` binaries bundle
**lovell's BSD-2-Clause fork (v2.x)**, *not* the GPL-licensed upstream. Verify in
`node_modules/@img/sharp-libvips-<platform>/README.md` (licence table) and
`versions.json` (`imagequant: 2.x`). So GIF output is licensing-clean on the
default install. The only GPL exposure is if a user *replaces* sharp's libvips
with a system build linked against upstream GPL libimagequant — that is their
choice and not something FitImage distributes.

`scripts/preflight.mjs` automatically flags any GPL/AGPL dependency in
`node_modules` (LGPL is allowed) and runs in the git hooks and before publish.
**Never add a GPL/AGPL dependency, and never vendor a GPL-linked binary.**

---

## 9. Known edge cases / backlog

- **Name collisions on conversion**: `a.jpg` and `a.png` both → `a.webp` collide
  (last writer wins). Not handled in v0.2; consider a conflict guard.
- **GIF on photos grows** the file (256-colour palette). Reported honestly via the
  size delta; no auto-skip when an explicit `format` is chosen.
- **No pixel-dimension resize** — FitImage only changes file size via encoding.
  Adding `--resize`/max-dimensions would be a deliberate scope expansion.
- **Config stores only `lastFolder`.** Remembering last format/naming as menu
  defaults is a possible enhancement.

# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] - 2026-06-08

### Added
- **Right-click menu integration** (`--install-menu`): append `--install-menu` to
  a one-shot command (e.g. `fitimage --format webp --suffix _min --install-menu`)
  to open a small installer that adds that exact operation to your file manager's
  right-click menu. Afterwards you can right-click any image **or folder** and run
  it without opening a terminal — it runs quietly and shows a completion
  notification (no terminal window).
  - **Multiple entries, one per label (up to 10).** Re-run with a **new** label to
    **add** another entry, or with an **existing** label to **update** it. The
    label you type is exactly what appears in the right-click menu.
  - **Remove from the same installer.** Choose *Remove* to delete a single entry
    from a list, or remove them all at once.
  - **macOS** — installs Automator Quick Actions in `~/Library/Services`
    (right-click → Quick Actions). No admin rights needed.
  - **Windows** — adds per-user `HKEY_CURRENT_USER` registry entries for image
    files and folders, launched hidden via a small VBScript (no console window).
    On Windows 11 they may appear under "Show more options". No admin rights needed.
  - The installer is a **separate** flow — it is *not* part of the normal
    interactive wizard, which only prints a one-line hint about it.
  - No new dependencies (uses OS tools `osascript` / `reg` / `wscript`).

## [0.4.0] - 2026-06-08

### Changed
- **Interactive wizard order**: the wizard now asks for the output format *before*
  the save mode (folder → output format → save mode → text position). The
  "Where should the text be added?" question is still shown only for
  "Save as a new name"; choosing "Overwrite originals" skips it.
- **Smarter "Save as a new name"**: when every image in the folder shares one
  extension and you pick a *different* output format, the new file already gets a
  distinct name (e.g. `photo.jpg` → `photo.webp`), so the wizard no longer asks
  "Where should the text be added?" — it keeps the originals and writes the
  converted copy beside them (equivalent to `--keep-original`). The text question
  still appears when the output format matches the source extension or the folder
  mixes extensions.

## [0.3.2] - 2026-06-07

### Added
- **Update notifications**: FitImage now checks for newer versions in the
  background (once per day) and shows an upgrade hint the next time you run it,
  powered by [`update-notifier`](https://github.com/yeoman/update-notifier).

## [0.3.1] - 2026-06-07

### Added
- **GIF input support**: `.gif` files are now collected and processed as input.
  Converting GIF → JPG / WebP / PNG works with `--format` (or the wizard's
  format menu). Without `--format`, a GIF re-encodes in place (GIF → GIF).
  Animated GIFs are decoded by sharp; only the first frame is used when
  converting to a single-image format (JPG/WebP/PNG).

## [0.3.0] - 2026-06-07

### Added
- **One-Shot Command**: after a run completes, the interactive wizard offers to
  print the equivalent `fitimage` command line (with the folder, `--format`, and
  `--prefix`/`--suffix` you chose) so you can paste it next time and repeat the
  same operation in a single step — no questions. New exported helper
  `buildOneShotCommand` (paths are quoted to work in bash/zsh and Windows shells).

## [0.2.0] - 2026-06-06

### Added
- **Interactive mode**: run `fitimage` with no path (or `-i`) in a terminal to
  launch a guided wizard — pick a folder, review the images, choose overwrite
  vs. save-as-new (with a prefix/suffix), and select the output format.
- The last-used folder is remembered (`$XDG_CONFIG_HOME/fitimage/config.json`,
  else `~/.config/...`) so repeat runs jump straight to the options menu.
- Explicit output format for any input: `--format jpg|webp|png|gif` (and the
  wizard's format menu). GIF uses cgif + sharp's BSD-2-Clause libimagequant
  fork — still no GPL codec path.
- Save under a new name without touching the source: `--prefix` / `--suffix`.
- A dry-run preview step inside the wizard before any destructive write.

### Changed
- Errored files are now always listed in CLI output (not only with `--verbose`).
- Byte sizes can render negatives (e.g. a GIF that grew vs. its source).

## [0.1.0] - 2026-06-06

### Added
- Initial release.
- Recursive batch compression of a directory tree.
- WebP → JPG conversion (mozjpeg), with optional `--png-to-jpg`.
- JPEG re-compression (mozjpeg) and PNG re-encode (zlib, no GPL palette path).
- Options: `--quality`, `--out`, `--no-recursive`, `--png-to-jpg`,
  `--keep-original`, `--dry-run`, `--verbose`, `--concurrency`.
- Safe defaults: skips files that would grow; `--dry-run` and `--out` for
  non-destructive use.
- Programmatic API (`run`, `collectImages`, `processFile`, `summarize`).
- Cross-platform CI (Ubuntu/macOS/Windows × Node 18/20/22).

[Unreleased]: https://github.com/ECgear/FitImage/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/ECgear/FitImage/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/ECgear/FitImage/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/ECgear/FitImage/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/ECgear/FitImage/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/ECgear/FitImage/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ECgear/FitImage/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ECgear/FitImage/releases/tag/v0.1.0

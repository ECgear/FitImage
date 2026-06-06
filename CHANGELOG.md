# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/ECgear/FitImage/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/ECgear/FitImage/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ECgear/FitImage/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ECgear/FitImage/releases/tag/v0.1.0

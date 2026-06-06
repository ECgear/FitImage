# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/ECgear/FitImage/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ECgear/FitImage/releases/tag/v0.1.0

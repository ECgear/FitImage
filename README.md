# FitImage

> Cross-platform batch image compressor — convert **WebP → JPG** and shrink **JPEG/PNG** in one command. Powered by [sharp](https://sharp.pixelplumbing.com/). No deprecated dependencies, no GPL codecs.

[![CI](https://github.com/ECgear/FitImage/actions/workflows/ci.yml/badge.svg)](https://github.com/ECgear/FitImage/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

FitImage walks a folder, converts `.webp` files to `.jpg`, and re-compresses
`.jpg/.jpeg/.png` using mozjpeg-quality JPEG and zlib PNG — fast and in parallel.
It runs the same on **macOS, Linux and Windows** (no `sips`, no native CLI tools).

## Features

- 🗂️ **Recursive batch** processing of a whole directory tree
- 🔄 **WebP → JPG** conversion (with optional `--png-to-jpg`)
- 🗜️ **mozjpeg** JPEG compression + lossless-ish PNG re-encode
- 💻 **Cross-platform** — pure Node + sharp, works everywhere
- 🛟 **Safe by default** — `--dry-run` to preview, `--out` to keep originals, skips files that wouldn't shrink
- ⚡ **Parallel** with configurable `--concurrency`
- ⚖️ **Clean licensing** — permissive codecs only, no GPL `libimagequant`/`pngquant` path

## Install

```bash
# one-off
npx fitimage ./images

# or install globally
npm install -g fitimage
fitimage ./images
```

Requires **Node.js ≥ 18**.

## Usage

```bash
# Compress every image under ./images IN PLACE at quality 75 (default)
fitimage ./images

# Preview first — writes nothing
fitimage ./images --dry-run --verbose

# Non-destructive: write results into ./out, leave sources untouched
fitimage ./images --out ./out

# Stronger compression, also turn PNGs into JPGs, keep the original .webp files
fitimage ./images -q 60 --png-to-jpg --keep-original
```

> ⚠️ **In-place is the default.** Re-compressed JPG/PNG files overwrite the
> originals, and converted `.webp` files are replaced by `.jpg`. Use `--dry-run`
> to preview or `--out <dir>` for a non-destructive run. Re-compressions that
> would *grow* a file are skipped automatically.

## Options

| Option | Default | Description |
|---|---|---|
| `-q, --quality <n>` | `75` | JPEG quality (1–100) |
| `-o, --out <dir>` | — | Write results to this directory (non-destructive) |
| `--no-recursive` | off | Do not descend into subdirectories |
| `--png-to-jpg` | off | Also convert `.png` files to `.jpg` |
| `--keep-original` | off | Keep source files when the format changes (e.g. keep `.webp`) |
| `--dry-run` | off | Preview only — write/delete nothing |
| `-v, --verbose` | off | Print every file |
| `-c, --concurrency <n>` | `4` | Number of parallel workers |

## How it works

FitImage uses [sharp](https://sharp.pixelplumbing.com/) (which wraps
[libvips](https://www.libvips.org/)) for all decoding/encoding:

- **JPEG** via mozjpeg / libjpeg-turbo (BSD / IJG)
- **PNG** via zlib / libpng — `palette` quantization is **intentionally not used**
- **WebP** decode via libwebp (BSD)

This keeps the whole pipeline on permissively-licensed code paths. See
[`NOTICE`](./NOTICE) for the full licensing posture.

## Programmatic API

```js
import { run } from 'fitimage';

const { summary } = await run('./images', { quality: 70, out: './out' });
console.log(summary); // { count, written, skipped, errors, origTotal, newTotal, saved, pct }
```

## Development

```bash
git clone https://github.com/ECgear/FitImage.git
cd FitImage
npm install
npm test
```

Contributions welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) and
[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## License

[MIT](./LICENSE) © ECgear

## Credits

Inspired by Google's [Squoosh](https://squoosh.app/). FitImage does **not** use
Squoosh's code; it is an independent tool built on
[sharp](https://github.com/lovell/sharp), [libvips](https://www.libvips.org/) and
[mozjpeg](https://github.com/mozilla/mozjpeg). Thanks to those projects.

---

## 日本語

`.webp` を `.jpg` に変換し、`.jpg/.jpeg/.png` を mozjpeg 品質で一括圧縮する
クロスプラットフォーム CLI です（macOS / Linux / Windows 共通、`sips` 不要）。

```bash
npx fitimage ./images            # 既定: その場で品質75圧縮（webpはjpg化）
fitimage ./images --dry-run -v   # まず確認（書き込みなし）
fitimage ./images --out ./out    # 非破壊（別フォルダに出力）
```

> 既定は**その場上書き**です。`--dry-run` で事前確認、`--out` で非破壊実行できます。
> ライセンス上クリーン（GPL の `libimagequant`/`pngquant` 経路は使いません）。

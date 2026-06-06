# FitImage

> 画像をまとめて**軽く（ファイルサイズを小さく）**できるツールです。質問に答えるだけで
> **JPG / WebP / PNG / GIF** への変換・圧縮ができます。画像編集の知識は不要。
> macOS / Windows / Linux で同じように動きます。Powered by [sharp](https://sharp.pixelplumbing.com/).

[![CI](https://github.com/ECgear/FitImage/actions/workflows/ci.yml/badge.svg)](https://github.com/ECgear/FitImage/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

> 🇬🇧 **English version is at the bottom of this page — jump to [English ↓](#english).**

**言語 / Languages:** [日本語（はじめての方へ）](#日本語はじめての方へ) · [English](#english)

---

## 日本語（はじめての方へ）

FitImage は、フォルダの中の画像を**まとめて軽く（ファイルサイズを小さく）**できる
ツールです。画像編集ソフトを開く必要はありません。**JPG / WebP / PNG / GIF** の
**形式変換**もできます（例：重い `.png` のスクリーンショットを軽い `.webp` に）。

むずかしいコマンドは不要です。`fitimage` と入力すると、**質問に答えるだけ**で
処理できます。macOS / Windows / Linux で同じように動きます。

たとえばこんな結果になります：

```
24.3 MB  →  6.1 MB   （約75%小さくなりました）
```

> 🛟 **安心して試せます。** 元の画像をそのまま残す「別名で保存」や、何も書き換えずに
> 結果だけ確認する「プレビュー（dry-run）」があります → [元の画像は消えませんか？](#元の画像は消えませんか)

### はじめかた（順番にやればOK）

**手順1と2は最初の一度だけ**。次回からは手順3・4だけです。

#### 手順1 — Node.js を入れる（最初の一度だけ）

FitImage は **Node.js** という無料ツールの上で動きます。

1. **<https://nodejs.org/>** を開く
2. 緑色の大きな **「LTS」** ボタンからダウンロードして、インストーラーを実行
3. 「次へ / 続ける」を押していくだけ（初期設定のままでOK）

確認するには、ターミナル（→[手順3](#手順3--ターミナルを開く)）でこう入力します：

```bash
node -v
```

`v20.11.1` のような数字が出れば準備完了です（**18以上**ならOK）。

#### 手順2 — FitImage を入れる（最初の一度だけ）

ターミナルで次を入力して **Enter**：

```bash
npm install -g fitimage
```

入ったか確認：

```bash
fitimage --version
```

数字が出れば完了です。🎉

> 💡 **インストールしたくない場合**は、`npx fitimage` でもその都度実行できます
> （起動は少し遅いですが、準備不要です）。

#### 手順3 — ターミナルを開く

「ターミナル」はコマンドを入力する窓です。

- **macOS** … `⌘`+`Space` →「**ターミナル**」と入力して Enter
- **Windows** … `⊞`(Windows)キー →「**ターミナル**」または「**PowerShell**」と入力して Enter
- **Linux** … アプリ一覧から「**端末／Terminal**」を開く

#### 手順4 — 実行して質問に答える

次を入力して **Enter**：

```bash
fitimage
```

あとは案内に従うだけです。実際の表示例（`>` やプロンプトの後ろが**あなたの入力**）：

```
FitImage — interactive mode

Target folder [/Users/you]: /Users/you/Pictures/旅行

12 image(s) found under /Users/you/Pictures/旅行:
  - IMG_0001.jpg
  - IMG_0002.jpg
  ... and 10 more

These 12 image(s) will be processed.

Save mode:                                  ← 保存方法
  1) Overwrite originals (in place)          （上書き）
  2) Save as a new name (keep originals)     （別名で保存・元は残す）
> 2

Where should the text be added?             ← 付け足す位置
  1) Prefix — at the beginning of the filename   （先頭）
  2) Suffix — at the end of the filename         （末尾）
> 2
Text to add: _small                          ← 付け足す文字

Output format (size-reduced):               ← 出力形式
  1) JPG  (.jpg)
  2) WebP (.webp)
  3) GIF  (.gif)  — 写真は逆に大きくなることがあります
  4) PNG  (.png)
> 2

Plan:                                        ← 実行内容の確認
  Folder : /Users/you/Pictures/旅行
  Images : 12
  Output : .webp (quality 75)
  Naming : add suffix "_small" (originals kept)

Proceed?                                     ← 実行しますか？
  1) Run now                                  （今すぐ実行）
  2) Dry-run preview first (write nothing)    （まず確認・書き込みなし）
  3) Cancel                                   （中止）
> 1

Done.

12 image(s) | written: 12 | skipped: 0 | errors: 0
24.3 MB -> 6.1 MB  (saved 18.2 MB, 74.9%)
```

この例では、元の `IMG_0001.jpg` …はそのまま残り、軽くなったコピー
`IMG_0001_small.webp` …が同じフォルダに作られます。

> 🔁 **次回からは**、前回のフォルダが自動で提示されます。**Enter** で再利用、別の
> パスを入力すれば変更できます。

##### フォルダのパスはどう入力するの？

手入力しなくて大丈夫です。

- **macOS / Linux** … Finder/ファイルから**フォルダをターミナルにドラッグ&ドロップ**
  するとパスが入ります。そのまま Enter。
- **Windows** … エクスプローラーで **Shift を押しながらフォルダを右クリック** →
  **「パスのコピー」** を選び、ターミナルに貼り付け（右クリックで貼り付け）。

### 元の画像は消えませんか？

**あなたが選んだとおりにしか動きません。**「Save mode（保存方法）」で選びます：

| 選択 | どうなる | おすすめ |
|---|---|---|
| **別名で保存（Save as a new name）** | 元はそのまま。軽くしたコピーを隣に作る（指定した先頭/末尾の文字つき）。 | 👍 まずはこれが安全 |
| **上書き（Overwrite originals）** | 元ファイルを軽い版に置き換え。形式が変わる場合（例 `.png`→`.webp`）は元ファイルは削除。 | 元が不要なとき |

さらに安心な仕組み：

- **プレビュー（Dry-run）** … 最後に「Dry-run preview first」を選ぶと、**何も書き込まず**に
  「こうなります」という結果だけ確認できます。
- 同じ形式で上書きする場合、**小さくならないファイルは自動でスキップ**します。
- 💾 大切な写真は、念のため**フォルダごとコピーしてから**実行すると確実です。

### どの形式を選べばいい？

| 形式 | 向いている用途 | メモ |
|---|---|---|
| **JPG** | 写真 | 万能。ファイルが小さい。透過は不可 |
| **WebP** | Web用の写真 | JPGよりさらに小さいことが多い。最新ブラウザで表示可 |
| **PNG** | スクショ・ロゴ・透過画像 | 輪郭がくっきり。JPG/WebPより大きめ |
| **GIF** | どうしても `.gif` が必要なときだけ | 256色。写真は逆に大きくなることあり |

迷ったら、写真は **JPG**、Webに載せるなら **WebP**。

### よくある質問

**「`command not found: fitimage`」と出る**
Node.js か FitImage がまだ入っていないか、インストール前からターミナルを開いていた
可能性。[手順1](#手順1--nodejs-を入れる最初の一度だけ)・[手順2](#手順2--fitimage-を入れる最初の一度だけ)を行い、ターミナルを**いったん閉じて開き直して**ください。

**インストールで権限エラー（`EACCES`）が出る（macOS/Linux）**
<https://nodejs.org/> の公式インストーラーを使うか、インストールせず `npx fitimage`
で実行してください。

**画像のサイズ（縦横の大きさ）は変わりますか？**
変わりません。**ファイル容量**を小さくする（と形式を変える）だけです。

**GIF にしたら逆に大きくなった**
仕様です。GIFは256色なので写真は大きくなりがち。写真は JPG か WebP を。増減は毎回
表示されます。

**インターネットは必要？**
インストール時だけ。あとは完全オフラインで動きます。

> 詳しい使い方（コマンドのオプション・プログラムからの利用・ライセンス）は、下の
> [English](#english) セクションにまとめています。

---

## English

> Make your images smaller — and convert between **JPG / WebP / PNG / GIF** —
> by answering a few simple questions. No image-editing skills required.
> Works the same on **macOS, Windows and Linux**.
>
> 🇯🇵 日本語のガイドはこのページ上部にあります → [日本語（はじめての方へ）↑](#日本語はじめての方へ).

### What is FitImage?

FitImage takes a folder full of pictures and makes the files **smaller** so they
upload faster and take less space — without you having to open each one in an
image editor. It can also **change the file type** (for example turn heavy `.png`
screenshots into light `.webp` or `.jpg`).

You don't need to type complicated commands: just run `fitimage` and it will
**ask you what to do**, step by step.

A typical result:

```
24.3 MB  →  6.1 MB   (saved 18.2 MB, about 75% smaller)
```

> 🛟 **It's safe to try.** FitImage can keep your originals untouched (it offers a
> "save as a new name" option) and has a **preview mode** that shows what would
> happen without changing anything. See [Will it ruin my originals?](#will-it-ruin-my-originals)

### Getting started (step by step)

You only do **Steps 1 and 2 once**. After that, using FitImage is just Step 3 + 4.

#### Step 1 — Install Node.js (one time)

FitImage runs on a free tool called **Node.js**.

1. Go to **<https://nodejs.org/>**
2. Download the big green **“LTS”** button and run the installer.
3. Click **Next / Continue** through the installer (the defaults are fine).

To check it worked, open a terminal (see [Step 3](#step-3--open-a-terminal)) and type:

```bash
node -v
```

If you see a version number like `v20.11.1`, you're ready. (Any number **18 or
higher** is fine.)

#### Step 2 — Install FitImage (one time)

In the terminal, type this and press **Enter**:

```bash
npm install -g fitimage
```

Check it installed:

```bash
fitimage --version
```

If you see a version number, you're done. 🎉

> 💡 **Don't want to install anything?** You can also run FitImage on demand with
> `npx fitimage` instead of installing it. It's a little slower to start but needs
> no setup.

#### Step 3 — Open a terminal

The "terminal" is a window where you type commands.

- **macOS** — Press `⌘ Command` + `Space`, type **Terminal**, press Enter.
- **Windows** — Press the `⊞ Windows` key, type **Terminal** (or **PowerShell**),
  press Enter.
- **Linux** — Open your **Terminal** app from the applications menu.

#### Step 4 — Run FitImage and follow the questions

Type this and press **Enter**:

```bash
fitimage
```

FitImage now guides you. Here is a real example — the lines after `>` and after
prompts are **what you type**:

```
FitImage — interactive mode

Target folder [/Users/you]: /Users/you/Pictures/trip

12 image(s) found under /Users/you/Pictures/trip:
  - IMG_0001.jpg
  - IMG_0002.jpg
  - IMG_0003.jpg
  ... and 9 more

These 12 image(s) will be processed.

Save mode:
  1) Overwrite originals (in place)
  2) Save as a new name (keep originals)
> 2

Where should the text be added?
  1) Prefix — at the beginning of the filename
  2) Suffix — at the end of the filename
> 2
Text to add: _small

Output format (size-reduced):
  1) JPG  (.jpg)
  2) WebP (.webp)
  3) GIF  (.gif)  — 256-colour palette; photos may end up larger
  4) PNG  (.png)
> 2

Plan:
  Folder : /Users/you/Pictures/trip
  Images : 12
  Output : .webp (quality 75)
  Naming : add suffix "_small" (originals kept)

Proceed?
  1) Run now
  2) Dry-run preview first (write nothing)
  3) Cancel
> 1

Done.

12 image(s) | written: 12 | skipped: 0 | errors: 0
24.3 MB -> 6.1 MB  (saved 18.2 MB, 74.9%)
```

In this example, the originals (`IMG_0001.jpg` …) are kept, and smaller copies
named `IMG_0001_small.webp` … are created next to them.

> 🔁 **Next time** you run `fitimage`, it remembers the last folder and offers it
> automatically — just press **Enter** to reuse it, or type a different path.

##### How do I type the folder path?

You don't have to type it by hand:

- **macOS / Linux** — **drag the folder** from Finder/Files into the terminal
  window and its path appears. Then press Enter.
- **Windows** — In File Explorer, hold **Shift**, **right-click** the folder, and
  choose **“Copy as path”**, then paste it into the terminal (right-click to paste).

### Will it ruin my originals?

Short answer: **only if you ask it to.** When FitImage asks **“Save mode”**:

| You choose | What happens | Best for |
|---|---|---|
| **Save as a new name** | Your originals stay exactly as they are; smaller copies are created next to them (with the prefix/suffix you chose). | 👍 Most people — completely safe |
| **Overwrite originals** | The original files are replaced by the smaller versions. If the file type changes (e.g. `.png` → `.webp`), the old file is removed. | When you don't need the originals |

Extra safety nets:

- **Dry-run preview** — at the final step, pick *“Dry-run preview first”* to see
  exactly what *would* happen, with **nothing written or deleted**.
- FitImage **skips** files that wouldn't actually get smaller (when overwriting in
  the same format), so it won't make things worse.
- 💾 If the photos are irreplaceable, **make a copy of the folder first** — peace
  of mind is free.

### Which format should I choose?

| Format | Choose it for | Notes |
|---|---|---|
| **JPG** | Photographs | Great all-round choice; small files; no transparency |
| **WebP** | Photos for the web | Usually even smaller than JPG; works in all modern browsers |
| **PNG** | Screenshots, logos, images with transparency | Keeps sharp edges; larger than JPG/WebP |
| **GIF** | Only if you specifically need a `.gif` | 256 colours — photos can end up **larger**, so avoid it for photos |

Not sure? **JPG** for photos, **WebP** if they're going on a website.

### Frequently asked questions

**“`command not found: fitimage`” (or “'fitimage' is not recognized”)**
Node.js or FitImage isn't installed yet, or the terminal was open before you
installed it. Do [Step 1](#step-1--install-nodejs-one-time) and
[Step 2](#step-2--install-fitimage-one-time), then **close and reopen** the
terminal and try again.

**A permission error when installing (`EACCES`) on macOS/Linux.**
Use the official installer from <https://nodejs.org/> (it sets permissions up
correctly), or simply run FitImage without installing: `npx fitimage`.

**Does it change the size (width/height) of my images?**
No. FitImage only reduces the **file size** (and can change the format). The
pixels-wide × pixels-tall stay the same.

**It said a GIF got *bigger* — is that a bug?**
No. GIF only supports 256 colours, so photos often grow. Use JPG or WebP for
photos. FitImage always shows you the size change so there are no surprises.

**Does it need the internet?**
Only to install. After that it works fully offline.

### Command-line usage (for advanced users / scripting)

You can skip the questions and pass everything as flags:

```bash
# Compress every image under ./images IN PLACE at quality 75 (default)
fitimage ./images

# Preview first — writes nothing
fitimage ./images --dry-run --verbose

# Non-destructive: write results into ./out, leave sources untouched
fitimage ./images --out ./out

# Convert everything to WebP, saving new files as *_min.webp (originals kept)
fitimage ./images --format webp --suffix _min

# Stronger compression, also turn PNGs into JPGs, keep the original .webp files
fitimage ./images -q 60 --png-to-jpg --keep-original
```

> ⚠️ **With a `<path>` and no `--prefix/--suffix/--out`, FitImage works in place**
> (re-compressed files overwrite the originals; a format change replaces the
> source file). Use `--dry-run` to preview, or `--prefix/--suffix/--out` to keep
> originals.

#### Options

| Option | Default | Description |
|---|---|---|
| _(no path)_ / `-i, --interactive` | — | Launch the interactive wizard (needs a terminal) |
| `-q, --quality <n>` | `75` | JPEG/WebP quality (1–100) |
| `-f, --format <fmt>` | — | Force output format: `jpg` \| `webp` \| `png` \| `gif` |
| `--prefix <text>` | — | Save under a new name: add `<text>` to the **start** of the filename |
| `--suffix <text>` | — | Save under a new name: add `<text>` to the **end** of the filename |
| `-o, --out <dir>` | — | Write results to this directory (non-destructive) |
| `--no-recursive` | off | Do not descend into subfolders |
| `--png-to-jpg` | off | Also convert `.png` files to `.jpg` (ignored when `--format` is set) |
| `--keep-original` | off | Keep source files when the format changes (e.g. keep `.webp`) |
| `--dry-run` | off | Preview only — write/delete nothing |
| `-v, --verbose` | off | Print every file |
| `-c, --concurrency <n>` | `4` | Number of parallel workers |

`--prefix`/`--suffix` always keep the originals (the renamed copy is a new file).
The interactive wizard always uses quality **75**; use `-q/--quality` on the
command line for other values.

### Programmatic API

```js
import { run } from 'fitimage';

const { summary } = await run('./images', { quality: 70, out: './out' });
console.log(summary); // { count, written, skipped, errors, origTotal, newTotal, saved, pct }

// Convert to WebP, writing *_min.webp beside each source (originals kept):
await run('./images', { format: 'webp', affix: { position: 'suffix', text: '_min' } });
```

### How it works

FitImage uses [sharp](https://sharp.pixelplumbing.com/) (which wraps
[libvips](https://www.libvips.org/)) for all decoding/encoding:

- **JPEG** via mozjpeg / libjpeg-turbo (BSD / IJG)
- **PNG** via zlib / libpng — re-encoded with `palette: false` (truecolour)
- **WebP** via libwebp (BSD)
- **GIF** via cgif (MIT) + sharp's bundled **BSD-2-Clause** fork of
  libimagequant for palette quantization — **not** the GPL upstream

This keeps the whole pipeline on permissively-licensed code paths. GIF is a
256-colour palette format, so for photographs the result may be **larger** than
the source — FitImage reports the size delta either way. See [`NOTICE`](./NOTICE)
for the full licensing posture, and [`docs/MAINTAINING.md`](./docs/MAINTAINING.md)
for the architecture.

### Development

```bash
git clone https://github.com/ECgear/FitImage.git
cd FitImage
npm install
npm test
```

Contributions welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) and
[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

### License

[MIT](./LICENSE) © ECgear

### Credits

Inspired by Google's [Squoosh](https://squoosh.app/). FitImage does **not** use
Squoosh's code; it is an independent tool built on
[sharp](https://github.com/lovell/sharp), [libvips](https://www.libvips.org/) and
[mozjpeg](https://github.com/mozilla/mozjpeg). Thanks to those projects.

> **Disclaimer:** FitImage is not affiliated with, endorsed by, or derived from
> Google or the Squoosh project. It is an independent reimplementation built on
> sharp and contains no Squoosh code. All product and library names are the
> property of their respective owners.

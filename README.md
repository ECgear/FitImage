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
**形式変換**もできます（例：重い `.png` のスクリーンショットを軽い `.webp` に、
`.gif` を軽い `.jpg` や `.webp` に）。

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
npm install -g @ecgear/fitimage
```

入ったか確認：

```bash
fitimage --version
```

数字が出れば完了です。🎉

> 💡 **インストールしたくない場合**は、`npx @ecgear/fitimage` でもその都度実行できます
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

Output format (size-reduced):               ← 出力形式
  1) JPG  (.jpg)
  2) WebP (.webp)
  3) GIF  (.gif)  — 写真は逆に大きくなることがあります
  4) PNG  (.png)
> 2

Save mode:                                  ← 保存方法
  1) Overwrite originals (in place)          （上書き）
  2) Save as a new name (keep originals)     （別名で保存・元は残す）
> 2

Plan:                                        ← 実行内容の確認
  Folder : /Users/you/Pictures/旅行
  Images : 12
  Output : .webp (quality 75)
  Naming : save as .webp next to originals (same name, originals kept)

Proceed?                                     ← 実行しますか？
  1) Run now                                  （今すぐ実行）
  2) Dry-run preview first (write nothing)    （まず確認・書き込みなし）
  3) Cancel                                   （中止）
> 1

Done.

12 image(s) | written: 12 | skipped: 0 | errors: 0
24.3 MB -> 6.1 MB  (saved 18.2 MB, 74.9%)

One-Shot Command — turn this run into a single reusable command?
  1) Yes — show me the command                ← はい・コマンドを表示
  2) No thanks                                 （いいえ）
> 1

One-Shot Command — run this in your terminal to repeat exactly this operation:

  fitimage "/Users/you/Pictures/旅行" --format webp --keep-original

Next time, just paste this command instead of answering the questions —
it reproduces this run in a single step.
```

この例では、フォルダの画像がすべて同じ拡張子（`.jpg`）で、出力に**別の形式**（`.webp`）を
選んだので、ファイル名はそのままに `IMG_0001.webp` …が作られ、元の `IMG_0001.jpg` …は
そのまま残ります（拡張子が違うので同名でも上書きされません）。このとき「付け足す文字」は
不要なので**質問されません**。

> 💡 **「付け足す位置（Prefix/Suffix）」を聞かれるのはどんな時？** … 出力に**同じ形式**を選んだ
> 場合（例: `.jpg` を `.jpg` に圧縮）や、フォルダに**複数の拡張子が混在**している場合です。
> このときは新ファイルが元と同名・同拡張子になり得るため、区別用の文字（先頭/末尾）を尋ねます。

> 🔁 **次回からは**、前回のフォルダが自動で提示されます。**Enter** で再利用、別の
> パスを入力すれば変更できます。

##### ワンショット・コマンド（同じ操作をすぐ繰り返す）

処理が終わると、最後に **「One-Shot Command（ワンショット・コマンド）を作りますか？」**
と聞かれます。**「Yes」** を選ぶと、**今回とまったく同じ操作を 1 行で実行できるコマンド**
が表示されます。例：

```bash
fitimage "/Users/you/Pictures/旅行" --format webp --keep-original
```

次回からは、質問に答える代わりに **このコマンドをターミナルに貼り付けて Enter** する
だけ。同じフォルダ・同じ形式・同じ保存方法で、**メニューなしの最短ステップ**で実行できます。

- フォルダのパスに**スペースや日本語**が含まれる場合は、自動で `"…"` で囲まれます
  （そのままコピペでOK）。
- インストールせず `npx` で使っている方は、先頭に `npx @ecgear/fitimage` を付けてください。
- 各オプションの意味は、下の [English](#english) セクションの
  [Options](#options) 表にまとめています。

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
| **別名で保存（Save as a new name）** | 元はそのまま。軽くしたコピーを隣に作る。出力が別形式なら同名・別拡張子で保存（例 `.jpg`→ `IMG.webp`）、同じ形式なら区別用の文字（先頭/末尾）を付けて保存。 | 👍 まずはこれが安全 |
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

> **GIF を変換したい場合:** `.gif` ファイルも入力として対応しています。フォルダに
> `.gif` が入っていれば、出力形式に **JPG / WebP / PNG** を選ぶことで変換できます
>（アニメーション GIF は最初のフレームのみ変換されます）。

### よくある質問

**「`command not found: fitimage`」と出る**
Node.js か FitImage がまだ入っていないか、インストール前からターミナルを開いていた
可能性。[手順1](#手順1--nodejs-を入れる最初の一度だけ)・[手順2](#手順2--fitimage-を入れる最初の一度だけ)を行い、ターミナルを**いったん閉じて開き直して**ください。

**インストールで権限エラー（`EACCES`）が出る（macOS/Linux）**
<https://nodejs.org/> の公式インストーラーを使うか、インストールせず `npx @ecgear/fitimage`
で実行してください。

**画像のサイズ（縦横の大きさ）は変わりますか？**
変わりません。**ファイル容量**を小さくする（と形式を変える）だけです。

**GIF にしたら逆に大きくなった**
仕様です。GIFは256色なので写真は大きくなりがち。写真は JPG か WebP を。増減は毎回
表示されます。

**インターネットは必要？**
インストール時だけ。あとは完全オフラインで動きます。

**新しいバージョンが出たことを知るには？**
FitImage は**1日1回バックグラウンドで更新確認**を行い、新しいバージョンが出ていれば
次回の起動時に案内を表示します：

```
╭──────────────────────────────────────────────╮
│  Update available 0.3.1 → 0.4.0             │
│  Run npm install -g @ecgear/fitimage to update  │
╰──────────────────────────────────────────────╯
```

表示されたコマンドを実行するだけで最新版になります。
また、[GitHub のリポジトリ](https://github.com/ECgear/FitImage) を「Watch → Releases only」
に設定しておくと、メールでリリース通知も受け取れます。

### 右クリックメニューに登録する（上級者向け）

よく使う圧縮操作を **ファイルやフォルダの右クリックメニュー** に登録できます。
登録すると、画像やフォルダを右クリックしてメニューを選ぶだけで、ターミナルを
開かずに同じ処理を実行できます。処理は静かに走り、終わると通知が出ます。

#### 登録するには

ワンショットコマンド（操作後に表示される `fitimage …` の1行）の末尾に
`--install-menu` を付けて実行します。通常のウィザードとは別の、小さなインストーラが
起動します。

```bash
# 例：「WebP に変換して元画像は *_min.webp で残す」をメニューに追加
fitimage --format webp --suffix _min --install-menu
```

1. **「Add / update a right-click menu entry」**（追加・更新）を選びます。
2. **メニュー名（ラベル）** を入力します。ここで入力した名前が、**右クリック
   メニューにそのまま表示されます**（例：`WebPに変換`）。
3. これで完了です。画像やフォルダを右クリックして、その名前を選べば実行できます。

#### 複数の操作を登録する

**ラベルを変えれば、いくつでも追加できます（最大 10 個）。** 例えば「JPGに圧縮」と
「WebPに変換」を別々に登録しておけば、右クリックメニューから用途に応じて選べます。

- **別の名前**で登録すると、新しい項目として **追加** されます。
- **同じ名前**で登録し直すと、その項目が **更新** されます（設定を変えたいとき）。

#### 削除するには

もう一度 `fitimage --install-menu` を実行して、

1. **「Remove a right-click menu entry」**（削除）を選びます。
2. 登録済みの一覧が表示されるので、**削除したい項目** を選びます。
   すべて消したいときは **「All FitImage entries」**（すべて削除）を選びます。

> 💡 引数なしの `fitimage --install-menu` だけでもインストーラは起動します
> （削除や一覧の確認だけしたいときに便利です）。

#### 各 OS での動作

- **macOS** … `~/Library/Services` に Automator の**クイックアクション**を作成
  します（右クリック →「クイックアクション」）。管理者権限は不要です。
- **Windows** … 画像ファイルとフォルダ向けにユーザー単位のレジストリ項目を追加し、
  小さな VBScript 経由で**ウィンドウを出さずに**実行します。**Windows 11** では
  「**その他のオプションを表示**」の中に出ることがあります。管理者権限は不要です。

> ⚠️ メニューには **登録した時点の Node.js の場所** が記録されます。Node を入れ直すと
> メニューが動かなくなることがあります。その場合は **Add / update** で同じラベルを
> 選び、作り直してください。

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
screenshots into light `.webp` or `.jpg`, or convert `.gif` files to `.jpg` or `.webp`).

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
npm install -g @ecgear/fitimage
```

Check it installed:

```bash
fitimage --version
```

If you see a version number, you're done. 🎉

> 💡 **Don't want to install anything?** You can also run FitImage on demand with
> `npx @ecgear/fitimage` instead of installing it. It's a little slower to start but needs
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

Output format (size-reduced):
  1) JPG  (.jpg)
  2) WebP (.webp)
  3) GIF  (.gif)  — 256-colour palette; photos may end up larger
  4) PNG  (.png)
> 2

Save mode:
  1) Overwrite originals (in place)
  2) Save as a new name (keep originals)
> 2

Plan:
  Folder : /Users/you/Pictures/trip
  Images : 12
  Output : .webp (quality 75)
  Naming : save as .webp next to originals (same name, originals kept)

Proceed?
  1) Run now
  2) Dry-run preview first (write nothing)
  3) Cancel
> 1

Done.

12 image(s) | written: 12 | skipped: 0 | errors: 0
24.3 MB -> 6.1 MB  (saved 18.2 MB, 74.9%)

One-Shot Command — turn this run into a single reusable command?
  1) Yes — show me the command
  2) No thanks
> 1

One-Shot Command — run this in your terminal to repeat exactly this operation:

  fitimage /Users/you/Pictures/trip --format webp --keep-original

Next time, just paste this command instead of answering the questions —
it reproduces this run in a single step.
```

In this example, every image shares one extension (`.jpg`) and the output uses a
**different** format (`.webp`), so `IMG_0001.webp` … are created with the **same
names** and the originals (`IMG_0001.jpg` …) are kept next to them (a different
extension can't overwrite them). No "text to add" is needed, so it isn't asked.

> 💡 **When *is* "Where should the text be added?" asked?** When you pick the
> **same** format as your files (e.g. `.jpg` → `.jpg`), or the folder mixes
> extensions — there the new file could share the original's name and extension,
> so FitImage asks for a distinguishing prefix/suffix.

> 🔁 **Next time** you run `fitimage`, it remembers the last folder and offers it
> automatically — just press **Enter** to reuse it, or type a different path.

##### One-Shot Command — repeat a run in one step

When a run finishes, FitImage asks **"One-Shot Command — turn this run into a
single reusable command?"** Choose **Yes** and it prints the exact `fitimage`
command that reproduces what you just did, for example:

```bash
fitimage /Users/you/Pictures/trip --format webp --keep-original
```

Next time, instead of answering the questions, just **paste that command into your
terminal and press Enter** — same folder, same format, same save mode, in a single
step with no menus.

- Folder paths that contain **spaces or non-ASCII characters** are automatically
  wrapped in `"…"` so you can copy-paste them as-is (works in bash/zsh and Windows
  PowerShell/cmd).
- If you run FitImage with `npx` instead of installing it, prefix the command with
  `npx @ecgear/fitimage`.
- See the [Options](#options) table below for what each flag means.

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
| **Save as a new name** | Your originals stay exactly as they are; smaller copies are created next to them. With a different output format the copy keeps the same name and a new extension (e.g. `.jpg` → `IMG.webp`); with the same format it adds the prefix/suffix you choose. | 👍 Most people — completely safe |
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

> **Converting from GIF?** `.gif` files are accepted as input too. Drop a folder
> containing GIFs into FitImage and choose **JPG**, **WebP**, or **PNG** as the
> output format to convert them. (Animated GIFs: only the first frame is kept
> when converting to a single-image format.)

### Frequently asked questions

**“`command not found: fitimage`” (or “'fitimage' is not recognized”)**
Node.js or FitImage isn't installed yet, or the terminal was open before you
installed it. Do [Step 1](#step-1--install-nodejs-one-time) and
[Step 2](#step-2--install-fitimage-one-time), then **close and reopen** the
terminal and try again.

**A permission error when installing (`EACCES`) on macOS/Linux.**
Use the official installer from <https://nodejs.org/> (it sets permissions up
correctly), or simply run FitImage without installing: `npx @ecgear/fitimage`.

**Does it change the size (width/height) of my images?**
No. FitImage only reduces the **file size** (and can change the format). The
pixels-wide × pixels-tall stay the same.

**It said a GIF got *bigger* — is that a bug?**
No. GIF only supports 256 colours, so photos often grow. Use JPG or WebP for
photos. FitImage always shows you the size change so there are no surprises.

**Does it need the internet?**
Only to install. After that it works fully offline.

**How do I know when a new version is available?**
FitImage checks for updates **once a day in the background** and shows a hint
the next time you run it if a newer version is found:

```
╭──────────────────────────────────────────────╮
│  Update available 0.3.1 → 0.4.0             │
│  Run npm install -g @ecgear/fitimage to update  │
╰──────────────────────────────────────────────╯
```

Just run the command shown to upgrade. You can also watch the
[GitHub repository](https://github.com/ECgear/FitImage) (**Watch → Releases only**)
to receive an email whenever a new release is published.

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
| `--install-menu` | off | Open the right-click-menu installer (add / update / remove Finder / Explorer entries), then exit |

`--prefix`/`--suffix` always keep the originals (the renamed copy is a new file).
The interactive wizard always uses quality **75**; use `-q/--quality` on the
command line for other values.

#### Right-click menu (`--install-menu`)

Add an operation you use often to your file manager's **right-click menu**, so you
can run it on any image or folder without opening a terminal. It runs quietly and
shows a completion notification when finished.

**To add an entry**, append `--install-menu` to a one-shot command. A short
installer (a **separate** prompt — not part of the normal wizard) then guides you:

```bash
# e.g. "convert to WebP, keep originals as *_min.webp" — added to the menu:
fitimage --format webp --suffix _min --install-menu
```

1. Choose **"Add / update a right-click menu entry."**
2. Type a **menu label** — the name you type is **exactly what appears in the
   right-click menu** (e.g. `Convert to WebP`).
3. Done. Right-click any image or folder and pick that name to run it.

**Add as many as you like (up to 10).** Run `--install-menu` again with a
**different** label to add another entry, or with the **same** label to update an
existing one. For example, keep separate `Compress to JPG` and `Convert to WebP`
entries and pick whichever you need.

**To remove an entry**, run `fitimage --install-menu` again and:

1. Choose **"Remove a right-click menu entry."**
2. Pick the entry to delete from the list — or **"All FitImage entries"** to
   remove every one at once.

> 💡 Plain `fitimage --install-menu` (no other flags) also opens the installer —
> handy when you just want to remove or review entries.

Platform details:

- **macOS** — installs Automator **Quick Actions** in `~/Library/Services`
  (right-click → *Quick Actions*). No admin rights.
- **Windows** — adds per-user `HKEY_CURRENT_USER` registry entries for image files
  and folders, launched hidden via a tiny VBScript (no console window). On
  **Windows 11** they may sit under **"Show more options."** No admin rights.

The menu remembers the exact **Node.js path** it was set up with, so if you
reinstall Node, re-run **Add / update** (same label) to refresh it. Uses only OS
tools (`osascript` / `reg` / `wscript`) — no extra dependencies.

### Programmatic API

```js
import { run } from '@ecgear/fitimage';

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

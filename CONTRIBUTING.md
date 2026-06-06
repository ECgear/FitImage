# Contributing to FitImage

Thanks for your interest in contributing! 🙌

## Ways to contribute

- 🐛 Report bugs via [Issues](https://github.com/ECgear/FitImage/issues)
- 💡 Propose features (open an issue first to discuss)
- 📖 Improve docs
- 🔧 Submit pull requests

## Development setup

```bash
git clone https://github.com/ECgear/FitImage.git
cd FitImage
npm install   # also enables git hooks (core.hooksPath = .githooks)
npm test
```

> `npm install` runs `prepare`, which enables a local **preflight** secret/license
> scan on `pre-commit` and `pre-push`. You can run it any time with `npm run preflight`.
> A false positive can be bypassed with `git commit --no-verify` (use sparingly).

## Pull request guidelines

1. Fork & create a branch from `main` (`feat/...`, `fix/...`).
2. Keep changes focused; add or update tests in `test/`.
3. Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`...).
4. Ensure `npm test` passes and CI is green.
5. Update `CHANGELOG.md` under "Unreleased".
6. Open the PR with a clear description of what & why.

## Project layout

```
bin/cli.js     # CLI entry (argument parsing, output)
src/index.js   # core library (collect/compress/summarize)
test/          # node:test suite
```

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). By participating you agree to uphold it.

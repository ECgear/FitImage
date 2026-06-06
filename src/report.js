// Shared output formatting for the FitImage CLI and the interactive wizard.
// Kept separate from bin/cli.js (which parses argv on import) so both entry
// points can render results identically.

/** Human-readable byte size. Handles negatives (e.g. a GIF that grew). */
export function fmtBytes(n) {
  const sign = n < 0 ? '-' : '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = Math.abs(n);
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${sign}${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Turn a run() result into an ordered list of `{ level, text }` lines.
 * `level` is 'log' or 'error' so callers can route to stdout/stderr (CLI) or
 * write everything to one stream (wizard). Mirrors the original CLI output.
 */
export function reportLines(out, { dryRun = false, verbose = false } = {}) {
  const { results, summary: s } = out;
  const tag = dryRun ? '[dry-run] ' : '';
  const lines = [];

  // Errored files are always listed; per-file successes/skips only when verbose.
  for (const r of results) {
    if (r.error) {
      lines.push({ level: 'error', text: `  ✗ ${r.file}  (${r.error})` });
    } else if (verbose) {
      if (r.willWrite) {
        const arrow = r.convertsFormat ? ` -> ${r.destPath}` : '';
        lines.push({
          level: 'log',
          text: `  ${tag}${fmtBytes(r.origBytes)} -> ${fmtBytes(r.newBytes)}  ${r.file}${arrow}`,
        });
      } else {
        lines.push({ level: 'log', text: `  ${tag}skip (no gain)  ${r.file}` });
      }
    }
  }

  lines.push({
    level: 'log',
    text: `\n${tag}${s.count} image(s) | written: ${s.written} | skipped: ${s.skipped} | errors: ${s.errors}`,
  });
  lines.push({
    level: 'log',
    text: `${tag}${fmtBytes(s.origTotal)} -> ${fmtBytes(s.newTotal)}  ` +
      `(saved ${fmtBytes(s.saved)}, ${s.pct.toFixed(1)}%)`,
  });
  return lines;
}

/**
 * Minimal line-level diff, used by NoteHistoryPanel to compare a historical
 * note version against the note's current content. Hand-rolled (classic LCS
 * backtrack) rather than pulling in a diff dependency — the app's bundle is
 * already flagged as oversized (see docs/mvp-readiness.md), and this need is
 * small enough not to justify a new dependency.
 */

export type LineDiffOp = "unchanged" | "added" | "removed";

export interface LineDiffEntry {
  type: LineDiffOp;
  value: string;
}

/**
 * Computes a line-level diff between `oldText` and `newText`, expressed as
 * the sequence of edits that turns `oldText` into `newText`: lines present
 * only in `oldText` are "removed", lines present only in `newText` are
 * "added", and lines common to both (found via longest common subsequence)
 * are "unchanged".
 */
export function diffLines(oldText: string, newText: string): LineDiffEntry[] {
  const oldLines = oldText.length === 0 ? [] : oldText.split("\n");
  const newLines = newText.length === 0 ? [] : newText.split("\n");

  const oldLen = oldLines.length;
  const newLen = newLines.length;

  // lcs[i][j] = length of the longest common subsequence of
  // oldLines[i:] and newLines[j:]
  const lcs: number[][] = Array.from({ length: oldLen + 1 }, () => new Array<number>(newLen + 1).fill(0));

  for (let i = oldLen - 1; i >= 0; i--) {
    for (let j = newLen - 1; j >= 0; j--) {
      lcs[i][j] = oldLines[i] === newLines[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const entries: LineDiffEntry[] = [];
  let i = 0;
  let j = 0;
  while (i < oldLen && j < newLen) {
    if (oldLines[i] === newLines[j]) {
      entries.push({ type: "unchanged", value: oldLines[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      entries.push({ type: "removed", value: oldLines[i] });
      i++;
    } else {
      entries.push({ type: "added", value: newLines[j] });
      j++;
    }
  }
  while (i < oldLen) {
    entries.push({ type: "removed", value: oldLines[i] });
    i++;
  }
  while (j < newLen) {
    entries.push({ type: "added", value: newLines[j] });
    j++;
  }

  return entries;
}

// Line diff for the Forge's Changes tab. Generated files are a few hundred lines, so a plain LCS table is fine.

export type DiffLine = { kind: "same" | "add" | "del"; text: string };

export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  // lcs[i][j] = length of the longest common subsequence of a[i:] and b[j:]
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      out.push({ kind: "same", text: a[i++] });
      j++;
    } else if (i < a.length && (j === b.length || lcs[i + 1][j] >= lcs[i][j + 1])) {
      out.push({ kind: "del", text: a[i++] });
    } else {
      out.push({ kind: "add", text: b[j++] });
    }
  }
  return out;
}

/** The changed regions of a diff, each with `context` unchanged lines around it; empty when nothing changed. */
export function hunks(lines: DiffLine[], context = 3): DiffLine[][] {
  const keep = lines.map(() => false);
  lines.forEach((line, idx) => {
    if (line.kind === "same") return;
    for (let k = Math.max(0, idx - context); k <= Math.min(lines.length - 1, idx + context); k++) keep[k] = true;
  });
  const out: DiffLine[][] = [];
  let current: DiffLine[] | null = null;
  lines.forEach((line, idx) => {
    if (!keep[idx]) {
      current = null;
      return;
    }
    if (!current) {
      current = [];
      out.push(current);
    }
    current.push(line);
  });
  return out;
}

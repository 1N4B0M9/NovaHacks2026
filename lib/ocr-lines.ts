export type Box = { x0: number; y0: number; x1: number; y1: number };
export type LocalLine = {
  text: string;
  confidence: number | null;
  box: Box | null;
};
export type ReviewLine = {
  local: string | null;
  online: string | null;
  box: Box | null;
  reason: "different" | "missing" | "unclear" | "low" | null;
};

// Anchor identical lines first so an omitted ingredient cannot shift every subsequent pair.
function key(text: string) {
  return text
    .normalize("NFKC")
    .trim()
    .replace(/(\p{Script=Han})\s+(?=\p{Script=Han})/gu, "$1")
    .replace(/\s+/g, " ")
    .replace(/(\p{Script=Han})\s+(?=\d)|(\d)\s+(?=\p{Script=Han})/gu, "$1$2");
}
export function compareReadings(
  local: LocalLine[],
  onlineText: string,
): ReviewLine[] {
  const online = onlineText
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (local.length > 100 || online.length > 100)
    throw new Error("note_too_long");
  const a = local.map((l) => key(l.text)),
    b = online.map(key);
  const n = a.length,
    m = b.length;
  const lengths = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      lengths[i][j] =
        a[i] === b[j]
          ? 1 + lengths[i + 1][j + 1]
          : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
  const anchors: [number, number][] = [];
  for (let i = 0, j = 0; i < n && j < m;) {
    if (a[i] === b[j]) {
      anchors.push([i++, j++]);
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) i++;
    else j++;
  }
  const out: ReviewLine[] = [];
  function add(left?: LocalLine, right?: string) {
    const reason =
      !left || !right
        ? "missing"
        : key(left.text) !== key(right)
          ? "different"
          : /[?？]/.test(right)
            ? "unclear"
            : left.confidence === null || left.confidence < 75
              ? "low"
              : null;
    out.push({
      local: left?.text ?? null,
      online: right ?? null,
      box: left?.box ?? null,
      reason,
    });
  }
  let i = 0,
    j = 0;
  for (const [x, y] of [...anchors, [n, m]]) {
    while (i < x || j < y)
      add(i < x ? local[i++] : undefined, j < y ? online[j++] : undefined);
    if (x < n) add(local[i++], online[j++]);
  }
  return out;
}

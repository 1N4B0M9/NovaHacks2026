import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { interpret, type Line } from "./interpret";
import { isHeading } from "./match";
import { OrderError } from "./order-error";
export { OrderError } from "./order-error";

type Input = Record<string, unknown>;
type Locale = "en" | "es";
type Draft = {
  id: string;
  version: number;
  reviewLanguage: Locale;
  currency: "USD";
  lines: Line[];
  headings?: string[];
  totalMinor: number;
  canApprove: boolean;
};
type Order = {
  orderId: string;
  draftId: string;
  version: number;
  simulated: true;
  currency: "USD";
  totalMinor: number;
  lines: { sku: string; cases: number; priceMinor: number }[];
};
function requiredText(value: unknown, limit: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > limit)
    throw new OrderError(400, "invalid_text");
  return value.trim();
}
function summarize(draft: Draft) {
  const ready = draft.lines.filter((line) => line.status === "ready");
  draft.totalMinor = ready.reduce(
    (sum, line) => sum + line.cases! * line.priceMinor!,
    0,
  );
  draft.canApprove =
    ready.length > 0 &&
    draft.lines.every((line) => line.status !== "needs_review");
  return draft;
}
export class Orders {
  private db: DatabaseSync;
  constructor(file: string) {
    if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec(`PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY, body TEXT NOT NULL, receipt TEXT);`);
  }
  close() {
    this.db.close();
  }
  create(input: Input) {
    const text = requiredText(input.text, 5000);
    if (input.reviewLanguage !== "en" && input.reviewLanguage !== "es")
      throw new OrderError(400, "invalid_language");
    // Decimal commas are ambiguous in bilingual notes. Keep those lines intact for review.
    const sources = text
      .split(/\r?\n|[;；，、]|,(?!\d)/)
      .map((s) => s.trim())
      .filter(Boolean);
    const headings = sources.filter(isHeading);
    const lines = sources
      .filter((source) => !isHeading(source))
      .map((source) => interpret(randomUUID(), source));
    if (!lines.length || sources.length > 50)
      throw new OrderError(400, "invalid_line_count");
    const draft = summarize({
      id: randomUUID(),
      version: 1,
      reviewLanguage: input.reviewLanguage,
      currency: "USD",
      lines,
      headings,
      totalMinor: 0,
      canApprove: false,
    });
    this.db
      .prepare("INSERT INTO drafts(id,body) VALUES (?,?)")
      .run(draft.id, JSON.stringify(draft));
    return draft;
  }
  private change<T>(
    id: string,
    version: unknown,
    fn: (draft: Draft, receipt: Order | null) => T,
  ): T {
    if (!Number.isSafeInteger(version) || Number(version) < 1)
      throw new OrderError(400, "invalid_version");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const row = this.db
        .prepare("SELECT body,receipt FROM drafts WHERE id=?")
        .get(id);
      if (!row) throw new OrderError(404, "draft_not_found");
      const draft: Draft = JSON.parse(String(row.body));
      if (draft.version !== version)
        throw new OrderError(409, "stale_version", draft);
      const result = fn(
        draft,
        row.receipt ? JSON.parse(String(row.receipt)) : null,
      );
      this.db.exec("COMMIT");
      return result;
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }
  edit(id: string, lineId: string, input: Input) {
    return this.change(id, input.version, (draft, receipt) => {
      if (receipt) throw new OrderError(409, "draft_finalized", draft);
      const line = draft.lines.find((candidate) => candidate.id === lineId);
      if (!line) throw new OrderError(404, "line_not_found");
      switch (input.action) {
        case "skip":
          Object.assign(line, { status: "skipped", cases: null, reason: null });
          break;
        case "edit":
          Object.assign(
            line,
            interpret(lineId, line.source, requiredText(input.text, 500)),
          );
          break;
        case "accept_pack":
          if (
            line.reason !== "pack_mismatch" ||
            line.sku !== input.sku ||
            typeof input.cases !== "number" ||
            !Number.isSafeInteger(input.cases) ||
            input.cases < 1 ||
            input.cases > 100000
          )
            throw new OrderError(400, "invalid_pack");
          Object.assign(line, {
            status: "ready",
            reason: null,
            cases: input.cases,
          });
          break;
        default:
          throw new OrderError(400, "invalid_action");
      }
      draft.version++;
      summarize(draft);
      this.db
        .prepare("UPDATE drafts SET body=? WHERE id=?")
        .run(JSON.stringify(draft), id);
      return draft;
    });
  }
  approve(id: string, input: Input) {
    return this.change(id, input.version, (draft, receipt) => {
      if (receipt) return receipt;
      if (!summarize(draft).canApprove)
        throw new OrderError(409, "review_required", draft);
      const order: Order = {
        orderId: randomUUID(),
        draftId: id,
        version: draft.version,
        simulated: true,
        currency: "USD",
        totalMinor: draft.totalMinor,
        lines: draft.lines
          .filter((l) => l.status === "ready")
          .map((l) => ({
            sku: l.sku!,
            cases: l.cases!,
            priceMinor: l.priceMinor!,
          })),
      };
      this.db
        .prepare("UPDATE drafts SET receipt=? WHERE id=?")
        .run(JSON.stringify(order), id);
      return order;
    });
  }
}
let local: Orders | undefined;
export function orders() {
  return (local ??= new Orders(
    process.env.NOVA_DB_PATH || resolve("data", "orders.sqlite"),
  ));
}

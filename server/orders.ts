import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { interpret, type Line } from "./interpret";
import { isHeading } from "./match";
import { OrderError } from "./order-error";
import { research } from "./research/run";
export { OrderError } from "./order-error";

type Input = Record<string, unknown>;
import type { Language as Locale } from "../lib/locale";
type Draft = {
  id: string;
  version: number;
  reviewLanguage: Locale;
  currency: "USD";
  lines: Line[];
  headings?: string[];
  deliveryZip?: string;
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
    (sum, line) => sum + (line.cases ?? 0) * (line.priceMinor ?? 0),
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
    if (
      input.reviewLanguage !== "en" &&
      input.reviewLanguage !== "es" &&
      input.reviewLanguage !== "zh"
    )
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
            priceMinor: l.priceMinor ?? 0,
          })),
      };
      this.db
        .prepare("UPDATE drafts SET receipt=? WHERE id=?")
        .run(JSON.stringify(order), id);
      return order;
    });
  }
  async recommend(
    id: string,
    input: Input,
    locate: (
      request: Record<string, unknown>,
    ) => Promise<{
      items: {
        source: string;
        offers: {
          canCompare?: boolean;
          packs?: number | null;
          priceMinor?: number | null;
          packQuantity?: number | null;
          packUnit?: string | null;
          supplier?: string;
          title?: string;
          productId?: string;
          url?: string;
        }[];
      }[];
    }> = research,
  ) {
    const zip = postalCode(input.zip);
    const row = this.db.prepare("SELECT body FROM drafts WHERE id=?").get(id);
    if (!row) throw new OrderError(404, "draft_not_found");
    const current: Draft = JSON.parse(String(row.body));
    if (current.version !== input.version)
      throw new OrderError(409, "stale_version", current);
    const updates = new Map<string, Partial<Line>>();
    for (const group of groupsOf(
      current.lines.filter((line) => line.status === "needs_review"),
    )) {
      let items: { source: string; offers: OfferPick[] }[] = [];
      try {
        const found = await locate({
          text: group.map((line) => line.source).join("\n"),
          reviewLanguage: current.reviewLanguage,
          deliveryLocation: zip,
        });
        items = found.items;
      } catch {
        items = [];
      }
      group.forEach((line, index) => {
        const item = items[index];
        const offer =
          item?.source === line.source ? chosenOffer(item.offers) : undefined;
        updates.set(line.id, offer ? fromOffer(offer, line) : fromCatalog(line));
      });
    }
    return this.change(id, input.version, (draft, receipt) => {
      if (receipt) throw new OrderError(409, "draft_finalized", draft);
      draft.deliveryZip = zip;
      for (const line of draft.lines) {
        const update = updates.get(line.id);
        if (update) Object.assign(line, update);
      }
      draft.version++;
      summarize(draft);
      this.db
        .prepare("UPDATE drafts SET body=? WHERE id=?")
        .run(JSON.stringify(draft), id);
      return draft;
    });
  }
}
function postalCode(value: unknown) {
  if (typeof value !== "string" || !/^\d{5}(?:-\d{4})?$/.test(value.trim()))
    throw new OrderError(400, "invalid_location");
  return value.trim();
}
function groupsOf(lines: Line[]) {
  const groups: Line[][] = [];
  let current: Line[] = [];
  let chars = 0;
  for (const line of lines) {
    const next = chars + line.source.length + 1;
    if (current.length && (current.length === 8 || next > 1800)) {
      groups.push(current);
      current = [];
      chars = 0;
    }
    current.push(line);
    chars += line.source.length + 1;
  }
  if (current.length) groups.push(current);
  return groups;
}
type OfferPick = {
  canCompare?: boolean;
  evidenceKind?: string;
  packs?: number | null;
  priceMinor?: number | null;
  packQuantity?: number | null;
  packUnit?: string | null;
  supplier?: string;
  title?: string;
  productId?: string;
  url?: string;
};
function shippedOffer(offers: OfferPick[]) {
  return offers.find(
    (offer) =>
      offer.canCompare &&
      offer.packs &&
      offer.priceMinor != null &&
      offer.packQuantity != null &&
      offer.packUnit &&
      offer.supplier &&
      offer.title &&
      offer.productId &&
      offer.url,
  );
}
function listedOffer(offers: OfferPick[]) {
  const listed = offers.filter(
    (offer) =>
      offer.evidenceKind === "web_search" &&
      offer.supplier &&
      offer.title &&
      offer.productId &&
      offer.url &&
      /^https:\/\//.test(offer.url),
  );
  return listed.find((offer) => offer.priceMinor != null) ?? listed[0];
}
function chosenOffer(offers: OfferPick[]) {
  return shippedOffer(offers) ?? listedOffer(offers);
}
function fromOffer(
  offer: NonNullable<ReturnType<typeof chosenOffer>>,
  line: Line,
): Partial<Line> {
  const packUnit = offer.packUnit ?? "each";
  const counted =
    packUnit === "each" &&
    (offer.packQuantity ?? 1) === 1 &&
    (line.requestedUnit === "each" || line.requestedUnit == null) &&
    line.requestedQuantity != null
      ? Math.ceil(line.requestedQuantity)
      : null;
  const cases =
    offer.packs && offer.packs > 0
      ? offer.packs
      : counted != null &&
          Number.isSafeInteger(counted) &&
          counted >= 1 &&
          counted <= 100000
        ? counted
        : 1;
  return {
    sku: offer.productId!,
    label: offer.title!,
    supplier: offer.supplier!,
    productUrl: offer.url!,
    packSize: offer.packQuantity ?? 1,
    packUnit,
    priceMinor: offer.priceMinor ?? null,
    cases,
    status: "ready",
    reason: null,
  };
}
function fromCatalog(line: Line): Partial<Line> {
  const quantity = line.requestedQuantity;
  const cases =
    line.sku && line.priceMinor != null && line.packSize != null && quantity != null
      ? line.requestedUnit === "case"
        ? quantity
        : line.requestedUnit === line.packUnit
          ? Math.ceil(quantity / line.packSize)
          : null
      : null;
  if (
    cases == null ||
    !Number.isSafeInteger(cases) ||
    cases < 1 ||
    cases > 100000
  )
    return { status: "skipped", cases: null, reason: null, supplier: null, productUrl: null };
  return {
    status: "ready",
    reason: null,
    cases,
    supplier: null,
    productUrl: null,
  };
}
let local: Orders | undefined;
export function orders() {
  return (local ??= new Orders(
    process.env.NOVA_DB_PATH || resolve("data", "orders.sqlite"),
  ));
}

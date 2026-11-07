"use client";
import { localize } from "../lib/locale";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { copy, unitLabel } from "./components/copy";
import { OrderTicket } from "./components/order-ticket";
import { ParsedList } from "./components/parsed-list";
import { PhotoIntake } from "./components/photo-intake";
import {
  money,
  type Draft,
  type Language,
  type Order,
} from "./components/order-types";

type Failure = { error?: string; draft?: Draft };
type SearchRow = {
  id: string;
  source: string;
  phase: "wait" | "search" | "done";
  label: string | null;
  supplier: string | null;
  priceMinor: number | null;
  productUrl: string | null;
  catalog: boolean;
};
function noteLines(value: string) {
  return value
    .split(/\r?\n|[;；，、]|,(?!\d)/)
    .map((line) => line.trim())
    .filter(Boolean);
}
function isDraft(value: unknown): value is Draft {
  const draft = value as Draft | null;
  return (
    !!draft &&
    typeof draft.id === "string" &&
    Number.isInteger(draft.version) &&
    Array.isArray(draft.lines) &&
    typeof draft.canApprove === "boolean" &&
    Number.isFinite(draft.totalMinor)
  );
}
function isOrder(value: unknown): value is Order {
  const order = value as Order | null;
  return (
    !!order &&
    order.simulated === true &&
    typeof order.orderId === "string" &&
    Array.isArray(order.lines) &&
    Number.isFinite(order.totalMinor)
  );
}
export default function Home() {
  const [language, setLanguage] = useState<Language>("en");
  const [text, setText] = useState("");
  const [zip, setZip] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [intakeMode, setIntakeMode] = useState<"extracted" | "manual" | null>(
    null,
  );
  const [draft, setDraft] = useState<Draft | null>(null);
  const [searchFeed, setSearchFeed] = useState<SearchRow[] | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [pending, setPending] = useState<"create" | "approve" | null>(null);
  const [error, setError] = useState("");
  const [finalized, setFinalized] = useState(false);
  const busy = useRef(false);
  const searchAbort = useRef<AbortController | null>(null);
  const searchGeneration = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const errorBanner = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) errorBanner.current?.focus();
  }, [error]);
  const t = copy[language];
  const focusHeading = () =>
    requestAnimationFrame(() => heading.current?.focus());
  async function request(
    path: string,
    method: string,
    body: unknown,
    operation: "create" | "approve",
  ) {
    if (busy.current) return;
    busy.current = true;
    setPending(operation);
    setError("");
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      operation === "create" ? 90000 : 15000,
    );
    try {
      const response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const value: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const failure = (value ?? {}) as Failure;
        if (isDraft(failure.draft)) setDraft(failure.draft);
        if (failure.error === "draft_finalized") setFinalized(true);
        setError(
          failure.error === "stale_version"
            ? t.stale
            : failure.error === "draft_finalized"
              ? t.finalized
              : failure.error === "review_required"
                ? t.reviewRequired
                : response.status === 404
                  ? t.unavailable
                  : response.status === 400
                    ? t.invalid
                    : t.retry,
        );
        return;
      }
      if (operation === "approve") {
        if (!isOrder(value)) {
          setError(t.unexpected);
          return;
        }
        setOrder(value);
        setFinalized(true);
        focusHeading();
      } else {
        if (!isDraft(value)) {
          setError(t.unexpected);
          return;
        }
        setDraft(value);
        if (operation === "create") {
          setOrder(null);
          setFinalized(false);
          focusHeading();
        }
      }
    } catch {
      setError(t.network);
    } finally {
      clearTimeout(timeout);
      busy.current = false;
      setPending(null);
    }
  }
  function reset() {
    if (busy.current) return;
    setDraft(null);
    setSearchFeed(null);
    setText("");
    setPhoto(null);
    setIntakeMode(null);
    setOrder(null);
    setError("");
    setFinalized(false);
    focusHeading();
  }
  function leaveSearch() {
    searchGeneration.current += 1;
    searchAbort.current?.abort();
    searchAbort.current = null;
    busy.current = false;
    setPending(null);
    setSearchFeed(null);
    setError("");
  }
  async function startSearch() {
    if (busy.current) return;
    const generation = ++searchGeneration.current;
    const alive = () => searchGeneration.current === generation;
    busy.current = true;
    flushSync(() => {
      setPending("create");
      setError("");
      setSearchFeed(
        noteLines(text).map((source, index) => ({
          id: `local-${index}`,
          source,
          phase: "wait" as const,
          label: null,
          supplier: null,
          priceMinor: null,
          productUrl: null,
          catalog: false,
        })),
      );
    });
    focusHeading();
    const controller = new AbortController();
    searchAbort.current = controller;
    const timeout = setTimeout(() => controller.abort(), 90000);
    let finished = false;
    try {
      const response = await fetch("/api/drafts/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          reviewLanguage: language,
          zip: zip.trim(),
        }),
        signal: controller.signal,
      });
      if (!alive()) return;
      if (!response.ok || !response.body) {
        setError(response.status === 400 ? t.invalid : t.retry);
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (alive()) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          if (!alive() || !chunk.trim()) continue;
          let event: Record<string, unknown>;
          try {
            event = JSON.parse(chunk) as Record<string, unknown>;
          } catch {
            continue;
          }
          if (event.type === "list" && Array.isArray(event.lines)) {
            const rows: SearchRow[] = [];
            for (const line of event.lines) {
              if (!line || typeof line !== "object") continue;
              const row = line as {
                id?: unknown;
                source?: unknown;
                status?: unknown;
              };
              if (typeof row.id !== "string" || typeof row.source !== "string")
                continue;
              rows.push({
                id: row.id,
                source: row.source,
                phase: row.status === "needs_review" ? "wait" : "done",
                label: null,
                supplier: null,
                priceMinor: null,
                productUrl: null,
                catalog: row.status === "ready",
              });
            }
            setSearchFeed(rows);
          } else if (event.type === "line" && typeof event.id === "string") {
            const id = event.id;
            const searching = event.phase === "start";
            setSearchFeed(
              (feed) =>
                feed?.map((row) =>
                  row.id === id
                    ? {
                        ...row,
                        phase: searching ? "search" : "done",
                        label:
                          typeof event.title === "string"
                            ? event.title
                            : row.label,
                        supplier:
                          typeof event.supplier === "string"
                            ? event.supplier
                            : row.supplier,
                        priceMinor:
                          typeof event.priceMinor === "number"
                            ? event.priceMinor
                            : row.priceMinor,
                        productUrl:
                          typeof event.url === "string"
                            ? event.url
                            : row.productUrl,
                      }
                    : row,
                ) ?? feed,
            );
          } else if (event.type === "draft" && isDraft(event.draft)) {
            finished = true;
            setDraft(event.draft);
            setSearchFeed(null);
            setOrder(null);
            setFinalized(false);
            focusHeading();
          } else if (event.type === "error") {
            finished = true;
            setError(t.retry);
          }
        }
      }
      if (alive() && !finished) setError(t.unexpected);
    } catch {
      if (alive()) setError(t.network);
    } finally {
      clearTimeout(timeout);
      if (searchAbort.current === controller) searchAbort.current = null;
      if (alive()) {
        busy.current = false;
        setPending(null);
      }
    }
  }
  const held =
    draft?.lines.filter((line) => line.status === "needs_review").length ?? 0;
  const included = draft?.lines.filter((line) => line.status === "ready") ?? [];
  const readyToApprove =
    !!draft?.canApprove && !held && included.length > 0 && !finalized;
  const destination = /^\d{5}(?:-\d{4})?$/.test(zip.trim());
  const l = (en: string, es: string, zh: string) =>
    localize(language, en, es, zh);
  const searching = !!searchFeed && !draft;
  const activeSearch = searchFeed?.find((row) => row.phase === "search");
  const searchKnown =
    searchFeed?.filter((row) => row.phase === "done" && row.label) ?? [];
  const searchHasPrice = searchKnown.some((row) => row.priceMinor != null);
  const step = order ? 3 : draft || searching ? 2 : 1;
  return (
    <div className="app-shell" lang={language}>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Mise home">
          <span className="brand-mark" aria-hidden="true">
            m.
          </span>
          <span>
            mise<span className="brand-dot">.</span>
          </span>
        </a>
        <label className="locale-switch">
          <span className="sr-only">{t.language}</span>
          <select
            id="review-language"
            value={language}
            disabled={!!pending || scanning || !!draft}
            onChange={(e) => setLanguage(e.target.value as Language)}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="zh">简体中文</option>
          </select>
        </label>
      </header>
      <main>
        <nav aria-label={t.workflow} className="steps">
          {[t.intake, t.check, t.preview].map((label, index) => (
            <span
              key={index}
              className={
                step === index + 1
                  ? "step active"
                  : step > index + 1
                    ? "step done"
                    : "step"
              }
              aria-current={step === index + 1 ? "step" : undefined}
            >
              <span className="step-number">
                {step > index + 1 ? "✓" : `0${index + 1}`}
              </span>
              {label}
            </span>
          ))}
        </nav>
        {error && (
          <div
            role="alert"
            className="error-banner"
            ref={errorBanner}
            tabIndex={-1}
          >
            {error}
          </div>
        )}
        <div role="status" className="sr-only">
          {searching
            ? activeSearch
              ? `${t.searchActive}: ${activeSearch.source}`
              : t.searchTitle
            : pending === "approve"
              ? t.approving
              : ""}
        </div>
        {searching ? (
          <section className="review-section">
            <div className="review-heading">
              <div>
                <h1 tabIndex={-1} ref={heading}>
                  {t.reviewTitle}
                </h1>
                <p className="lead-text">
                  {t.searchIntro} {zip.trim()}.
                </p>
              </div>
              <button className="button ghost" onClick={leaveSearch}>
                {t.searchBack}
              </button>
            </div>
            <div className="review-layout">
              <div
                className="cart-scroll"
                aria-live="polite"
                aria-busy="true"
              >
                {searchFeed?.map((row) => {
                  const status =
                    row.phase === "done"
                      ? row.label
                        ? t.searchFound
                        : row.catalog
                          ? t.searchCatalog
                          : t.noMatch
                      : row.phase === "search"
                        ? t.searchActive
                        : t.searchWaiting;
                  return (
                    <article
                      className={`cart-item search-row ${row.phase} ${
                        row.phase === "done" && row.label ? "ready" : "needs_review"
                      }`}
                      key={row.id}
                    >
                      <p className="field-label">{row.source}</p>
                      {row.phase === "done" && row.label ? (
                        <>
                          <div className="line-heading">
                            <h3>
                              {row.productUrl ? (
                                <a
                                  href={row.productUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {row.label}
                                </a>
                              ) : (
                                row.label
                              )}
                            </h3>
                            {row.priceMinor != null ? (
                              <strong>{money(row.priceMinor, language)}</strong>
                            ) : null}
                          </div>
                          <p className="purchase-description">
                            {row.supplier ? `${row.supplier} · ` : ""}
                            {row.priceMinor == null ? `${t.priceAtStore} · ` : ""}
                            {t.shipsTo} {zip.trim()}
                          </p>
                        </>
                      ) : (
                        <div className="line-heading">
                          <p className="search-status">
                            {(row.phase === "search" || row.phase === "wait") && (
                              <span className="search-dot" aria-hidden="true" />
                            )}
                            {status}
                          </p>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
              <aside className="summary-card" aria-label={t.summary}>
                <h2>{t.summary}</h2>
                <p className="muted small">{t.summaryHint}</p>
                <ul className="summary-lines">
                  {searchKnown.length === 0 ? (
                    <li className="empty-summary">{t.searchWaiting}</li>
                  ) : (
                    searchKnown.map((row) => (
                      <li key={row.id}>
                        <div>
                          <strong>{row.label}</strong>
                          <small>
                            {row.supplier ? `${row.supplier} · ` : ""}
                            {t.shipsTo} {zip.trim()}
                          </small>
                        </div>
                        <strong>
                          {row.priceMinor != null
                            ? money(row.priceMinor, language)
                            : "—"}
                        </strong>
                      </li>
                    ))
                  )}
                </ul>
                <div className="summary-total" aria-live="polite" aria-atomic="true">
                  <span>{t.subtotal}</span>
                  <strong>
                    {searchHasPrice
                      ? money(
                          searchKnown.reduce(
                            (sum, row) => sum + (row.priceMinor ?? 0),
                            0,
                          ),
                          language,
                        )
                      : "—"}
                  </strong>
                </div>
                <p className="approval-hint">{t.searchCartHint}</p>
                <button className="button primary full-width" disabled>
                  {t.approve}
                  <span aria-hidden="true">→</span>
                </button>
              </aside>
            </div>
          </section>
        ) : !draft ? (
          <section
            className={
              intakeMode ? "intake-layout confirming" : "intake-layout"
            }
          >
            {!intakeMode && (
              <div className="intro">
                <h1 ref={heading} tabIndex={-1}>
                  {l("Scan your order.", "Escanea tu pedido.", "扫描订货单。")}
                </h1>
                <OrderTicket language={language} />
              </div>
            )}
            <form
              className="intake-card"
              onSubmit={(event) => {
                event.preventDefault();
                if (text.trim() && destination && !scanning) void startSearch();
              }}
            >
              <details
                className="intake-controls"
                open={!intakeMode || !destination}
              >
                <summary>
                  {intakeMode
                    ? l("Photo and settings", "Foto y ajustes", "照片与设置")
                    : l("Your note", "Tu nota", "手写清单")}
                </summary>
                <PhotoIntake
                  locationField={
                    <div>
                      <label className="field-label" htmlFor="zip-code">
                        {t.zip}
                      </label>
                      <input
                        id="zip-code"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        value={zip}
                        placeholder="10011"
                        maxLength={10}
                        required
                        disabled={!!pending || scanning}
                        onChange={(event) => setZip(event.target.value)}
                      />
                    </div>
                  }
                  language={language}
                  t={t}
                  photo={photo}
                  disabled={!!pending}
                  onPhoto={setPhoto}
                  onStart={() => {
                    setText("");
                    setIntakeMode(null);
                    setError("");
                  }}
                  onText={(value) => {
                    setText(value);
                    setIntakeMode("extracted");
                  }}
                  onManual={() => setIntakeMode("manual")}
                  onBusy={setScanning}
                />
              </details>
              {intakeMode && (
                <div className="extracted-note">
                  <ParsedList
                    initialText={text}
                    language={language}
                    onChange={setText}
                    disabled={!!pending || scanning}
                  />
                  <button
                    className="button primary full-width"
                    disabled={
                      !!pending || scanning || !text.trim() || !destination
                    }
                  >
                    {pending === "create" ? t.reviewing : t.review}
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              )}
            </form>
          </section>
        ) : order ? (
          <section className="receipt-layout">
            <div className="completion-icon" aria-hidden="true">
              ✓
            </div>
            <p className="eyebrow">{t.receipt}</p>
            <h1 tabIndex={-1} ref={heading}>
              {t.complete}
            </h1>
            <p className="lead-text">{t.completeHint}</p>
            <div className="receipt">
              <div className="receipt-header">
                <span className="brand">mise.</span>
                <span className="demo-tag">{t.receipt}</span>
              </div>
              <p className="field-label">{t.orderId}</p>
              <p className="order-id">{order.orderId}</p>
              <ul className="receipt-lines">
                {order.lines.map((line, index) => {
                  const original = draft.lines.find(
                    (item) => item.sku === line.sku,
                  );
                  return (
                    <li key={`${line.sku}-${index}`}>
                      <div>
                        <strong>{original?.label ?? line.sku}</strong>
                        <small>
                          {t.sku} {line.sku} · {line.cases}{" "}
                          {line.cases === 1 ? t.caseUnit : t.casesUnit}
                          {original?.packSize != null
                            ? ` × ${original.packSize} ${unitLabel(original.packUnit, language)}`
                            : ""}
                        </small>
                        <small>
                          {t.price}: {money(line.priceMinor, language)}
                        </small>
                      </div>
                      <strong>
                        {money(line.priceMinor * line.cases, language)}
                      </strong>
                    </li>
                  );
                })}
              </ul>
              <div className="summary-total">
                <span>{t.total}</span>
                <strong>{money(order.totalMinor, language)}</strong>
              </div>
            </div>
            <button className="button primary" onClick={reset}>
              {t.editList}
              <span aria-hidden="true">↗</span>
            </button>
          </section>
        ) : (
          <section className="review-section">
            <div className="review-heading">
              <div>
                <h1 tabIndex={-1} ref={heading}>
                  {t.reviewTitle}
                </h1>
              </div>
              <button
                className="button ghost"
                disabled={!!pending}
                onClick={reset}
              >
                {t.editList}
              </button>
            </div>
            {!!draft.headings?.length && (
              <div className="recipe-headings">
                <p className="field-label">
                  {localize(
                    language,
                    "Recipe heading · Not a purchase item",
                    "Título de la receta · No se compra",
                    "食谱标题 · 不计入订单",
                  )}
                </p>
                {draft.headings.map((title, index) => (
                  <p key={index}>{title}</p>
                ))}
              </div>
            )}
            <div className="review-layout">
              <div
                className="line-list cart-scroll"
                role="region"
                tabIndex={0}
                aria-label={t.check}
                aria-busy={!!pending}
              >
                {draft.lines.map((line) => {
                  const cost =
                    line.status === "ready" &&
                    line.priceMinor !== null &&
                    line.cases !== null
                      ? money(line.priceMinor * line.cases, language)
                      : null;
                  return (
                    <article
                      className={`cart-item ${line.status}`}
                      key={line.id}
                    >
                      <p className="cart-source">{line.source}</p>
                      {line.status === "ready" ? (
                        <>
                          <div className="line-heading">
                            <h3>
                              {line.productUrl ? (
                                <a
                                  href={line.productUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {line.label}
                                </a>
                              ) : (
                                line.label
                              )}
                            </h3>
                            {cost ? <strong>{cost}</strong> : null}
                          </div>
                          <p className="purchase-description">
                            {line.supplier ? `${line.supplier} · ` : ""}
                            {line.packSize != null &&
                            line.packUnit &&
                            !(line.packSize === 1 && line.packUnit === "each")
                              ? `${line.cases} × ${line.packSize} ${unitLabel(line.packUnit, language)} · `
                              : ""}
                            {line.priceMinor == null
                              ? `${t.priceAtStore} · `
                              : ""}
                            {draft.deliveryZip
                              ? `${t.shipsTo} ${draft.deliveryZip}`
                              : ""}
                          </p>
                        </>
                      ) : (
                        <p className="muted small">{t.noMatch}</p>
                      )}
                    </article>
                  );
                })}
              </div>
              <aside className="summary-card" aria-label={t.summary}>
                <h2>{l("Order summary", "Resumen del pedido", "订单摘要")}</h2>
                <p className="cart-count">
                  {included.length}{" "}
                  {l("items included", "productos incluidos", "项商品")}
                </p>
                <div
                  className="summary-total"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <span>{held ? t.subtotal : t.total}</span>
                  <strong>
                    {included.some(
                      (line) => line.priceMinor !== null && line.cases !== null,
                    )
                      ? money(
                          included.reduce(
                            (sum, line) =>
                              sum +
                              (line.priceMinor != null && line.cases != null
                                ? line.priceMinor * line.cases
                                : 0),
                            0,
                          ),
                          language,
                        )
                      : "—"}
                  </strong>
                </div>
                {!readyToApprove && (
                  <p className="approval-hint">
                    {finalized
                      ? t.finalized
                      : held
                        ? t.blocked
                        : included.length === 0
                          ? t.emptyHint
                          : t.reviewRequired}
                  </p>
                )}
                <button
                  className="button primary full-width"
                  disabled={!!pending || !readyToApprove}
                  onClick={() =>
                    void request(
                      `/api/drafts/${encodeURIComponent(draft.id)}/approve`,
                      "POST",
                      { version: draft.version },
                      "approve",
                    )
                  }
                >
                  {pending === "approve" ? t.approving : t.approve}
                  <span aria-hidden="true">→</span>
                </button>
                <details className="summary-note">
                  <summary>
                    {l("Original note", "Nota original", "查看原单")}
                  </summary>
                  {photo && (
                    <img
                      className="review-photo"
                      src={photo}
                      alt={t.photoAlt}
                    />
                  )}
                  <p>{text}</p>
                </details>
              </aside>
            </div>
          </section>
        )}
      </main>
      <footer>
        <span className="footer-brand">Mise</span>
      </footer>
    </div>
  );
}

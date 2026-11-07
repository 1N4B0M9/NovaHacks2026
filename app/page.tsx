"use client";
import { useEffect, useRef, useState } from "react";
import { copy, unitLabel } from "./components/copy";
import { ReviewLine } from "./components/review-line";
import { PhotoIntake } from "./components/photo-intake";
import {
  money,
  type Draft,
  type Language,
  type LineAction,
  type Order,
} from "./components/order-types";

type Failure = { error?: string; draft?: Draft };
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
  const [photo, setPhoto] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [intakeMode, setIntakeMode] = useState<"extracted" | "manual" | null>(
    null,
  );
  const [draft, setDraft] = useState<Draft | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [pending, setPending] = useState<
    "create" | "update" | "approve" | null
  >(null);
  const [error, setError] = useState("");
  const [finalized, setFinalized] = useState(false);
  const busy = useRef(false);
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
    operation: "create" | "update" | "approve",
  ) {
    if (busy.current) return;
    busy.current = true;
    setPending(operation);
    setError("");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
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
  async function act(id: string, action: LineAction) {
    if (!draft || finalized) return;
    await request(
      `/api/drafts/${encodeURIComponent(draft.id)}/lines/${encodeURIComponent(id)}`,
      "PATCH",
      { version: draft.version, ...action },
      "update",
    );
  }
  function reset() {
    if (busy.current) return;
    setDraft(null);
    setText("");
    setPhoto(null);
    setIntakeMode(null);
    setOrder(null);
    setError("");
    setFinalized(false);
    focusHeading();
  }
  const held =
    draft?.lines.filter((line) => line.status === "needs_review").length ?? 0;
  const included = draft?.lines.filter((line) => line.status === "ready") ?? [];
  const readyToApprove =
    !!draft?.canApprove && !held && included.length > 0 && !finalized;
  const step = order ? 3 : draft ? 2 : 1;
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
        <span className="topbar-note">KITCHEN → SUPPLIER</span>
        <span className="demo-tag">
          {language === "es" ? "DEMOSTRACIÓN" : "DEMO WORKSPACE"}
        </span>
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
          {pending === "create"
            ? t.reviewing
            : pending === "update"
              ? t.saving
              : pending === "approve"
                ? t.approving
                : ""}
        </div>
        {!draft ? (
          <section className="intake-layout">
            <div className="intro">
              <p className="eyebrow">
                <span /> {t.eyebrow}
              </p>
              <h1 tabIndex={-1} ref={heading}>
                {t.title}
              </h1>
              <p className="lead-text">{t.intro}</p>
              <div className="illustration" aria-hidden="true">
                <div className="paper paper-back" />
                <div className="paper paper-front">
                  <span className="paper-title">THE CLOSING LIST</span>
                  <span className="paper-line">
                    2 docenas de huevos <span>↗</span>
                  </span>
                  <span className="paper-line">
                    leche de avena <span>✓</span>
                  </span>
                  <span className="paper-line light">
                    a fresh start tomorrow.
                  </span>
                  <span className="paper-stamp">CHECKED WITH CARE</span>
                </div>
                <div className="illustration-label">
                  a good day starts with a clear list.
                </div>
              </div>
            </div>
            <form
              className="intake-card"
              onSubmit={(event) => {
                event.preventDefault();
                if (text.trim() && !scanning)
                  void request(
                    "/api/drafts",
                    "POST",
                    { text: text.trim(), reviewLanguage: language },
                    "create",
                  );
              }}
            >
              <div className="card-kicker">01 / {t.intake.toUpperCase()}</div>
              <h2>{t.note}</h2>
              <p className="muted">{t.noteHint}</p>
              <label className="field-label" htmlFor="review-language">
                {t.language}
              </label>
              <select
                id="review-language"
                value={language}
                onChange={(event) =>
                  setLanguage(event.target.value as Language)
                }
                disabled={!!pending || scanning}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
              <PhotoIntake
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
              {intakeMode && (
                <div className="extracted-note">
                  <label className="field-label" htmlFor="kitchen-note">
                    {intakeMode === "extracted" ? t.extracted : t.manualHeading}
                  </label>
                  <p className="muted small">{t.extractedHint}</p>
                  <textarea
                    id="kitchen-note"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    rows={5}
                    required
                    maxLength={5000}
                    disabled={!!pending || scanning}
                  />
                  <button
                    className="button primary full-width"
                    disabled={!!pending || scanning || !text.trim()}
                  >
                    {pending === "create" ? t.reviewing : t.review}
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              )}
              <p className="simulation-note">{t.simulation}</p>
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
              <p className="simulation-note">{t.simulation}</p>
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
                <p className="eyebrow">02 / {t.check.toUpperCase()}</p>
                <h1 tabIndex={-1} ref={heading}>
                  {t.reviewTitle}
                </h1>
                <p className="lead-text">{t.reviewIntro}</p>
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
                  {language === "es"
                    ? "Título de la receta · No se compra"
                    : "Recipe heading · Not a purchase item"}
                </p>
                {draft.headings.map((title, index) => (
                  <p key={index}>{title}</p>
                ))}
              </div>
            )}
            <div className="review-layout">
              <div className="line-list" aria-busy={!!pending}>
                {draft.lines.map((line) => (
                  <ReviewLine
                    key={`${line.id}-${draft.version}`}
                    line={line}
                    language={language}
                    t={t}
                    disabled={!!pending || finalized}
                    onAction={act}
                  />
                ))}
              </div>
              <aside className="summary-card" aria-label={t.summary}>
                <p className="card-kicker">03 / {t.preview.toUpperCase()}</p>
                <h2>{t.summary}</h2>
                <p className="muted small">{t.summaryHint}</p>
                <ul className="summary-lines">
                  {included.length === 0 ? (
                    <li className="empty-summary">{t.empty}</li>
                  ) : (
                    included.map((line) => (
                      <li key={line.id}>
                        <div>
                          <strong>{line.label ?? line.sku}</strong>
                          <small>
                            {line.cases}{" "}
                            {line.cases === 1 ? t.caseUnit : t.casesUnit} ·{" "}
                            {line.sku}
                          </small>
                        </div>
                        <strong>
                          {line.priceMinor !== null && line.cases !== null
                            ? money(line.priceMinor * line.cases, language)
                            : "—"}
                        </strong>
                      </li>
                    ))
                  )}
                </ul>
                <div
                  className="summary-total"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <span>{held ? t.subtotal : t.total}</span>
                  <strong>{money(draft.totalMinor, language)}</strong>
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
                <p className="simulation-note">{t.simulation}</p>
                <div className="summary-note">
                  <p className="field-label">{t.source}</p>
                  {photo && (
                    <img
                      className="review-photo"
                      src={photo}
                      alt={t.photoAlt}
                    />
                  )}
                  <p>{text}</p>
                </div>
              </aside>
            </div>
          </section>
        )}
      </main>
      <footer>
        <span>
          mise. <span aria-hidden="true">/</span> NOVA HACKATHON 2026
        </span>
        <p>{t.fixtures}</p>
      </footer>
    </div>
  );
}

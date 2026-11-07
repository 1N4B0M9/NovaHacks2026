"use client";
import { useState } from "react";
import {
  money,
  type Language,
  type Line,
  type LineAction,
} from "./order-types";
import { IngredientResearch } from "./ingredient-research";
import type { Copy } from "./copy";
import { unitLabel } from "./copy";

export function ReviewLine({
  line,
  language,
  t,
  disabled,
  onAction,
}: {
  line: Line;
  language: Language;
  t: Copy;
  disabled: boolean;
  onAction: (id: string, action: LineAction) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(line.text);
  const [cases, setCases] = useState(String(line.cases ?? 1));
  const count = Number(cases);
  const validCases =
    /^\d+$/.test(cases) &&
    Number.isSafeInteger(count) &&
    count > 0 &&
    count <= 100000;
  const unit = (value: string | null) => unitLabel(value, language);
  const comparable =
    line.requestedUnit === line.packUnit &&
    line.requestedQuantity !== null &&
    line.packSize !== null;
  const purchased =
    line.packSize !== null && validCases ? line.packSize * count : null;
  const excess =
    comparable && purchased !== null ? purchased - line.requestedQuantity! : 0;
  const status =
    line.status === "ready"
      ? t.included
      : line.status === "skipped"
        ? t.skipped
        : t.attention;
  return (
    <article
      className={`line-card ${line.status}`}
      aria-label={`${line.source}: ${status}`}
    >
      <div className="line-heading">
        <span className={`status ${line.status}`}>
          <span aria-hidden="true">
            {line.status === "ready"
              ? "✓"
              : line.status === "skipped"
                ? "−"
                : "!"}
          </span>
          {status}
        </span>
        <span className="sku">{line.sku ?? "—"}</span>
      </div>
      <p className="field-label">{t.original}</p>
      <p className="source-text">“{line.source}”</p>
      {line.text !== line.source && (
        <p className="interpretation">
          <span>{t.interpreted}:</span> {line.text}
        </p>
      )}
      <IngredientResearch line={line} language={language} disabled={disabled} />
      <div className="supplier-name">
        <span className="ingredient-icon" aria-hidden="true">
          {line.sku === "E180" ? "◒" : line.sku === "M1" ? "▥" : "◇"}
        </span>
        <div>
          <p className="field-label">{t.supplier}</p>
          <h3>{line.label ?? t.noMatch}</h3>
        </div>
      </div>
      <dl className="comparison">
        <div>
          <dt>{t.requested}</dt>
          <dd>
            {line.requestedQuantity === null
              ? t.requestedUnknown
              : `${line.requestedQuantity} ${unit(line.requestedUnit)}`}
          </dd>
        </div>
        <div>
          <dt>{t.offered}</dt>
          <dd>
            {line.packSize === null
              ? "—"
              : `${line.packSize} ${unit(line.packUnit)}`}
          </dd>
        </div>
        <div>
          <dt>{t.price}</dt>
          <dd>
            {line.priceMinor === null ? "—" : money(line.priceMinor, language)}
          </dd>
        </div>
      </dl>
      {line.status === "needs_review" && (
        <p className="reason">
          {line.match?.purchaseStatus === "no_local_sku"
            ? language === "es"
              ? "Ingrediente reconocido; no está en el catálogo del pedido simulado."
              : "Ingredient recognized; not in the simulated order catalog."
            : line.reason
              ? t.reasons[line.reason]
              : t.reviewRequired}
        </p>
      )}
      {line.status === "skipped" ? (
        <p className="muted small">{t.skippedHint}</p>
      ) : line.status === "needs_review" ? (
        <p className="muted small">{t.held}</p>
      ) : (
        <p className="purchase-description">
          {line.cases} {line.cases === 1 ? t.caseUnit : t.casesUnit} ·{" "}
          {line.cases !== null && line.packSize !== null
            ? `${line.cases * line.packSize} ${unit(line.packUnit)}`
            : ""}
        </p>
      )}
      {editing ? (
        <form
          className="edit-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (text.trim())
              void onAction(line.id, { action: "edit", text: text.trim() });
          }}
        >
          <label htmlFor={`edit-${line.id}`}>{t.correction}</label>
          <textarea
            id={`edit-${line.id}`}
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={disabled}
            rows={2}
            required
            maxLength={500}
          />
          <div className="button-row">
            <button
              className="button primary small-button"
              disabled={disabled || !text.trim()}
            >
              {t.save}
            </button>
            <button
              className="button ghost small-button"
              type="button"
              disabled={disabled}
              onClick={() => {
                setText(line.text);
                setEditing(false);
              }}
            >
              {t.cancel}
            </button>
          </div>
        </form>
      ) : (
        <>
          {line.status === "needs_review" &&
            line.reason === "pack_mismatch" &&
            line.sku !== null &&
            line.packSize !== null &&
            line.priceMinor !== null && (
              <div className="pack-choice">
                <div className="case-control">
                  <label htmlFor={`cases-${line.id}`}>{t.cases}</label>
                  <input
                    id={`cases-${line.id}`}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="100000"
                    step="1"
                    value={cases}
                    onChange={(event) => setCases(event.target.value)}
                    disabled={disabled}
                  />
                  <strong>
                    {validCases
                      ? money(count * line.priceMinor, language)
                      : "—"}
                  </strong>
                </div>
                {purchased !== null && (
                  <p className="small">
                    {t.buying}:{" "}
                    <strong>
                      {purchased} {unit(line.packUnit)}
                    </strong>
                    {excess > 0 && (
                      <span className="excess">
                        {" "}
                        +{excess} {t.extra}
                      </span>
                    )}
                  </p>
                )}
                <button
                  type="button"
                  className="button primary"
                  disabled={disabled || !validCases}
                  onClick={() =>
                    void onAction(line.id, {
                      action: "accept_pack",
                      sku: line.sku!,
                      cases: count,
                    })
                  }
                >
                  {t.buy}
                </button>
              </div>
            )}
          <div className="line-actions">
            <button
              className="text-button"
              type="button"
              disabled={disabled}
              onClick={() => setEditing(true)}
            >
              {line.status === "skipped" ? t.restore : t.edit}
            </button>
            {line.status !== "skipped" && (
              <button
                className="text-button"
                type="button"
                disabled={disabled}
                onClick={() => void onAction(line.id, { action: "skip" })}
              >
                {t.skip} <span aria-hidden="true">↗</span>
              </button>
            )}
          </div>
        </>
      )}
    </article>
  );
}

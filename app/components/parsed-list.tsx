"use client";
import { useRef, useState } from "react";
import { localize, type Language } from "../../lib/locale";
export function ParsedList({
  initialText,
  language,
  onChange,
  disabled,
}: {
  initialText: string;
  language: Language;
  onChange: (s: string) => void;
  disabled: boolean;
}) {
  const [rows, setRows] = useState(() =>
    initialText.split(/\r?\n/).map((value, id) => ({ value, id })),
  );
  const next = useRef(rows.length);
  const list = useRef<HTMLDivElement>(null);
  const t = (en: string, es: string, zh: string) =>
    localize(language, en, es, zh);
  function save(items: typeof rows) {
    if (items.map((r) => r.value).join("\n").length > 5000) return;
    setRows(items);
    onChange(items.map((r) => r.value).join("\n"));
  }
  function focus(id: number) {
    requestAnimationFrame(() =>
      list.current
        ?.querySelector<HTMLInputElement>(`[data-line="${id}"]`)
        ?.focus(),
    );
  }
  function insert(id: number, values: string[]) {
    const additions = values.map((value) => ({ id: next.current++, value }));
    const index = rows.findIndex((r) => r.id === id);
    save([...rows.slice(0, index + 1), ...additions, ...rows.slice(index + 1)]);
    focus(additions.at(-1)!.id);
  }
  return (
    <section
      className="parsed-note"
      aria-label={t("Parsed list", "Lista de ingredientes", "食材清单")}
    >
      <div className="parsed-title">
        <h1>{t("Check your list", "Revisa tu lista", "核对清单")}</h1>
        <span>{rows.filter((r) => r.value.trim()).length}</span>
      </div>
      <div className="parsed-rows" ref={list}>
        {rows.map((row, i) => (
          <div key={row.id} className="parsed-row">
            <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
            <input
              data-line={row.id}
              aria-label={
                t("Ingredient", "Ingrediente", "食材") + " " + (i + 1)
              }
              value={row.value}
              disabled={disabled}
              maxLength={5000}
              onChange={(e) =>
                save(
                  rows.map((r) =>
                    r.id === row.id ? { ...r, value: e.target.value } : r,
                  ),
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  insert(row.id, [""]);
                }
              }}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text");
                if (!/[\r\n]/.test(pasted)) return;
                e.preventDefault();
                const field = e.currentTarget;
                const combined =
                  row.value.slice(0, field.selectionStart ?? 0) +
                  pasted +
                  row.value.slice(field.selectionEnd ?? row.value.length);
                const lines = combined.split(/\r?\n/);
                const entries = lines.map((value, n) => ({
                  id: n === 0 ? row.id : next.current++,
                  value,
                }));
                save([...rows.slice(0, i), ...entries, ...rows.slice(i + 1)]);
                focus(entries.at(-1)!.id);
              }}
            />
            <button
              type="button"
              disabled={disabled}
              className="remove-line"
              aria-label={
                t("Remove line", "Quitar línea", "删除行") + " " + (i + 1)
              }
              onClick={() => {
                if (rows.length === 1) {
                  save([{ id: row.id, value: "" }]);
                  focus(row.id);
                } else {
                  save(rows.filter((r) => r.id !== row.id));
                  focus(rows[i + 1]?.id ?? rows[i - 1].id);
                }
              }}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="m6 6 8 8m0-8-8 8" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="text-button add-line"
        disabled={disabled}
        onClick={() => insert(rows[rows.length - 1].id, [""])}
      >
        {t("Add line", "Añadir línea", "添加一行")}
      </button>
    </section>
  );
}

"use client";
import { useEffect, useState } from "react";
import { localize, type Language } from "../../lib/locale";
import { cropImage } from "./note-crop";
import type { ReviewLine } from "../../lib/ocr-lines";

function EvidenceRow({
  row,
  index,
  photo,
  language,
  sourceLanguage,
  onResolve,
}: {
  row: ReviewLine;
  index: number;
  photo: string;
  language: Language;
  sourceLanguage: string;
  onResolve: (text: string) => void;
}) {
  const t = (en: string, es: string, zh: string) =>
    localize(language, en, es, zh);
  const [text, setText] = useState(row.online ?? row.local ?? "");
  const [crop, setCrop] = useState("");
  const [retry, setRetry] = useState<{ local: string; online: string } | null>(
    null,
  );
  const [pending, setPending] = useState(false),
    [failed, setFailed] = useState(false);
  async function reread() {
    setPending(true);
    setFailed(false);
    setRetry(null);
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(40000),
        body: JSON.stringify({
          image: crop,
          sourceLanguage,
          lineOnly: true,
        }),
      });
      if (!res.ok) throw Error();
      const data = await res.json();
      const rows: ReviewLine[] = data.rows;
      setRetry({
        local: rows
          .map((r) => r.local)
          .filter(Boolean)
          .join(" / "),
        online: rows
          .map((r) => r.online)
          .filter(Boolean)
          .join(" / "),
      });
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }
  useEffect(() => {
    let active = true;
    if (row.box)
      cropImage(photo, row.box, false, 8)
        .then((s) => {
          if (active) setCrop(s);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [photo, row.box]);
  return (
    <fieldset className="ocr-line">
      <legend>
        {t("Check line", "Revisar línea", "核对行")} {index + 1}
      </legend>
      <p>
        {row.reason === "different"
          ? t(
              "The readings differ.",
              "Las lecturas difieren.",
              "两次识别结果不同。",
            )
          : row.reason === "low"
            ? t(
                "Tesseract flagged weak recognition.",
                "Tesseract indicó baja confianza.",
                "本地识别把握较低。",
              )
            : row.reason === "missing"
              ? t(
                  "Only one reader returned this line.",
                  "Solo un lector devolvió esta línea.",
                  "只有一种识别方式读到了此行。",
                )
              : t(
                  "A character is unclear.",
                  "Hay un carácter ilegible.",
                  "有字符无法辨认。",
                )}
      </p>
      {crop && (
        <img
          className="ocr-strip"
          src={crop}
          alt={t(
            "Detail from the original photo",
            "Detalle de la foto",
            "原图局部",
          )}
        />
      )}
      <p>
        {t("Tesseract", "Tesseract", "本地识别")} · {row.local ?? "—"}
      </p>
      <p>
        {t("Online", "En línea", "在线识别")} · {row.online ?? "—"}
      </p>
      {row.reason === "different" && (
        <div className="button-row">
          <button
            className="text-button"
            type="button"
            onClick={() => setText(row.local ?? "")}
          >
            {t("Use Tesseract reading", "Usar lectura local", "采用本地结果")}
          </button>
          <button
            className="text-button"
            type="button"
            onClick={() => setText(row.online ?? "")}
          >
            {t("Use online reading", "Usar lectura en línea", "采用在线结果")}
          </button>
        </div>
      )}
      {crop && (
        <button
          type="button"
          className="text-button"
          disabled={pending}
          onClick={() => void reread()}
        >
          {pending
            ? t("Reading…", "Leyendo…", "识别中…")
            : t(
                "Reread this crop",
                "Volver a leer este recorte",
                "重新识别此行",
              )}
        </button>
      )}
      {retry && (
        <p role="status">
          {t("Crop results", "Resultados del recorte", "局部识别结果")} ·
          Tesseract: {retry.local || "—"} · {t("Online", "En línea", "在线")}:{" "}
          {retry.online || "—"}
        </p>
      )}
      {failed && (
        <p role="alert">
          {t(
            "Retry failed. Check the photo manually.",
            "No se pudo releer. Comprueba la foto.",
            "重新识别失败，请手动核对。",
          )}
        </p>
      )}
      <label>
        {t("Verified wording", "Texto verificado", "已核对文字")}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={1}
        />
      </label>
      <div className="button-row">
        <button
          type="button"
          className="button primary"
          disabled={!text.trim() || /[?？]/.test(text)}
          onClick={() => onResolve(text.trim())}
        >
          {t("Confirm line", "Confirmar línea", "确认此行")}
        </button>
        <button
          type="button"
          className="button ghost"
          onClick={() => onResolve("")}
        >
          {t("Omit this line", "Omitir esta línea", "忽略此行")}
        </button>
      </div>
    </fieldset>
  );
}
export function OcrReview({
  rows,
  photo,
  language,
  sourceLanguage,
  onDone,
}: {
  rows: ReviewLine[];
  photo: string;
  language: Language;
  sourceLanguage: string;
  onDone: (text: string) => void;
}) {
  const [choices, setChoices] = useState<Record<number, string>>({});
  const t = (en: string, es: string, zh: string) =>
    localize(language, en, es, zh);
  const unresolved = rows.some(
    (r, i) => r.reason && !Object.hasOwn(choices, i),
  );
  const text = rows
    .map((row, i) => choices[i] ?? row.online ?? row.local)
    .filter(Boolean)
    .join("\n");
  return (
    <div className="ocr-review">
      <p>
        {t(
          "Check these readings against the photo. One reader may have missed a line or an uncertain character.",
          "Compara estas lecturas con la foto. Un lector puede haber omitido una línea o un carácter.",
          "请对照原图核对以下结果。识别可能漏行或误读字符。",
        )}
      </p>
      {rows.map(
        (r, i) =>
          r.reason &&
          (Object.hasOwn(choices, i) ? (
            <p key={i}>
              {i + 1}. {choices[i] || t("Omitted", "Omitida", "已忽略")}{" "}
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setChoices((prev) => {
                    const next = { ...prev };
                    delete next[i];
                    return next;
                  })
                }
              >
                {t("Change", "Cambiar", "修改")}
              </button>
            </p>
          ) : (
            <EvidenceRow
              key={i}
              row={r}
              index={i}
              language={language}
              sourceLanguage={sourceLanguage}
              photo={photo}
              onResolve={(value) => setChoices({ ...choices, [i]: value })}
            />
          )),
      )}
      <button
        type="button"
        className="button primary"
        disabled={unresolved || !text.trim()}
        onClick={() => onDone(text)}
      >
        {t("Use reviewed text", "Usar texto revisado", "使用已核对文字")}
      </button>
    </div>
  );
}

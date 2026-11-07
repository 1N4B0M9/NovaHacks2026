"use client";
import { useRef, useState } from "react";
import { localize, type Language } from "../../lib/locale";
import type { Box } from "../../lib/ocr-lines";

export async function cropImage(
  photo: string,
  box: Box,
  relative = false,
  padding = 0,
) {
  const image = new Image();
  image.src = photo;
  await image.decode();
  const w = image.naturalWidth,
    h = image.naturalHeight;
  const sx = Math.max(0, (relative ? box.x0 * w : box.x0) - padding);
  const sy = Math.max(0, (relative ? box.y0 * h : box.y0) - padding);
  const width = Math.min(w, (relative ? box.x1 * w : box.x1) + padding) - sx;
  const height = Math.min(h, (relative ? box.y1 * h : box.y1) + padding) - sy;
  if (width < 2 || height < 2) throw Error("invalid crop");
  const c = document.createElement("canvas");
  c.width = Math.round(width);
  c.height = Math.round(height);
  const ctx = c.getContext("2d");
  if (!ctx) throw Error("no canvas");
  ctx.drawImage(image, sx, sy, width, height, 0, 0, c.width, c.height);
  for (const quality of [0.92, 0.75, 0.6]) {
    const data = c.toDataURL("image/jpeg", quality);
    if (data.length <= 4_000_000) return data;
  }
  throw Error("crop too large");
}
const full = { x0: 0, y0: 0, x1: 1, y1: 1 };
export function NoteCrop({
  photo,
  language,
  onApply,
  onCancel,
}: {
  photo: string;
  language: Language;
  onApply: (box: Box) => void;
  onCancel: () => void;
}) {
  const [box, setBox] = useState<Box>(full);
  const start = useRef<{ x: number; y: number } | null>(null);
  function point(event: React.PointerEvent<HTMLDivElement>) {
    const r = event.currentTarget.getBoundingClientRect();
    const clamp = (v: number) => Math.max(0, Math.min(1, v));
    return {
      x: clamp((event.clientX - r.left) / r.width),
      y: clamp((event.clientY - r.top) / r.height),
    };
  }
  const t = (en: string, es: string, zh: string) =>
    localize(language, en, es, zh);
  return (
    <div className="note-crop">
      <p>
        {t(
          "Drag around the note, or adjust the four edges below.",
          "Selecciona la nota o ajusta los cuatro bordes.",
          "拖动选取清单，或调整下方四条边。",
        )}
      </p>
      <div
        className="crop-surface"
        onPointerDown={(e) => {
          start.current = point(e);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!start.current) return;
          const p = point(e);
          setBox({
            x0: Math.min(start.current.x, p.x),
            x1: Math.max(start.current.x, p.x),
            y0: Math.min(start.current.y, p.y),
            y1: Math.max(start.current.y, p.y),
          });
        }}
        onPointerUp={() => {
          start.current = null;
        }}
        onPointerCancel={() => {
          start.current = null;
        }}
      >
        <img
          src={photo}
          alt={t("Full note", "Nota completa", "清单原图")}
          draggable={false}
        />
        <span
          style={{
            left: box.x0 * 100 + "%",
            top: box.y0 * 100 + "%",
            width: (box.x1 - box.x0) * 100 + "%",
            height: (box.y1 - box.y0) * 100 + "%",
          }}
        />
      </div>
      <details>
        <summary>{t("Adjust edges", "Ajustar bordes", "调整边缘")}</summary>
        {(["x0", "y0", "x1", "y1"] as const).map((edge, i) => (
          <label key={edge}>
            {
              [
                t("Left", "Izquierda", "左"),
                t("Top", "Arriba", "上"),
                t("Right", "Derecha", "右"),
                t("Bottom", "Abajo", "下"),
              ][i]
            }{" "}
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(box[edge] * 100)}
              onChange={(e) =>
                setBox({ ...box, [edge]: Number(e.target.value) / 100 })
              }
            />
          </label>
        ))}
      </details>
      <div className="button-row">
        <button
          type="button"
          className="button primary"
          disabled={box.x1 - box.x0 < 0.02 || box.y1 - box.y0 < 0.02}
          onClick={() => onApply(box)}
        >
          {t("Read selection", "Leer selección", "识别选区")}
        </button>
        <button type="button" className="button ghost" onClick={onCancel}>
          {t("Use full photo", "Usar foto completa", "识别整张照片")}
        </button>
      </div>
    </div>
  );
}

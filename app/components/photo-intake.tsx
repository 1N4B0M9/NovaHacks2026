"use client";
import { useRef, useState } from "react";
import type { Copy } from "./copy";
import { localize, type Language } from "../../lib/locale";
import { NoteCrop, cropImage } from "./note-crop";
import type { Box } from "../../lib/ocr-lines";

// Resize on-device before transmission; the backend caps encoded input at 4M characters.
async function preparePhoto(file: File): Promise<string> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 20_000_000
  )
    throw new Error("invalid_image");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const ratio = Math.min(
      1,
      2200 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("invalid_image");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.75, 0.6]) {
      const result = canvas.toDataURL("image/jpeg", quality);
      if (result.length <= 4_000_000) return result;
    }
    throw new Error("invalid_image");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotoIntake({
  language,
  locationField,
  t,
  photo,
  disabled,
  onPhoto,
  onStart,
  onText,
  onManual,
  onBusy,
}: {
  language: Language;
  locationField: React.ReactNode;
  t: Copy;
  photo: string | null;
  disabled: boolean;
  onPhoto: (image: string | null) => void;
  onStart: () => void;
  onText: (text: string) => void;
  onManual: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const [reading, setReading] = useState(false);
  const [source, setSource] = useState("");
  const sourceLanguage = source || language;
  const [original, setOriginal] = useState("");
  const [cropFirst, setCropFirst] = useState(false);
  const [cropping, setCropping] = useState(false);
  const label = (en: string, es: string, zh: string) =>
    localize(language, en, es, zh);
  const [error, setError] = useState<"image" | "transcription" | null>(null);
  async function scan(file?: File, selection?: Box) {
    if (busyRef.current) return;
    busyRef.current = true;
    setReading(true);
    setError(null);
    onBusy(true);
    onStart();
    if (file) {
      setOriginal("");
      onPhoto(null);
    }
    let prepared = false;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const full = file ? await preparePhoto(file) : original;
      if (file) setOriginal(full);
      if (file && cropFirst) {
        onPhoto(full);
        setCropping(true);
        return;
      }
      setCropping(false);
      const image = selection ? await cropImage(full, selection, true) : full;
      onPhoto(full);
      prepared = true;
      timeout = setTimeout(() => controller.abort(), 40000);
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image,
          sourceLanguage,
        }),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => null);
      if (
        !response.ok ||
        typeof result?.text !== "string" ||
        !result.text.trim() ||
        result.text.length > 5000
      )
        throw new Error("transcription_unavailable");
      onText(result.text);
    } catch {
      setError(prepared ? "transcription" : "image");
    } finally {
      if (timeout) clearTimeout(timeout);
      busyRef.current = false;
      setReading(false);
      onBusy(false);
    }
  }
  return (
    <div className="photo-intake">
      <div className="scan-settings">
        {locationField}
        <div>
          <label className="field-label" htmlFor="note-source">
            {label("Language on the note", "Idioma de la nota", "清单原文语言")}
          </label>
          <select
            id="note-source"
            value={sourceLanguage}
            disabled={disabled || reading}
            onChange={(e) => {
              setSource(e.target.value);
              if (original) {
                onStart();
                setCropping(true);
              }
            }}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="zh">简体中文</option>
            <option value="zh-Hant">繁體中文</option>
          </select>
        </div>
      </div>
      <label className="crop-option">
        <input
          type="checkbox"
          checked={cropFirst}
          disabled={disabled || reading}
          onChange={(e) => setCropFirst(e.target.checked)}
        />
        {label("Crop before reading", "Recortar antes de leer", "先裁剪再识别")}
      </label>
      <input
        ref={camera}
        id="camera-note"
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        tabIndex={-1}
        aria-label={t.takePhoto}
        disabled={disabled || reading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void scan(file);
        }}
      />
      <input
        ref={upload}
        id="upload-note"
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        tabIndex={-1}
        aria-label={t.uploadPhoto}
        disabled={disabled || reading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void scan(file);
        }}
      />
      {cropping && original ? (
        <NoteCrop
          language={language}
          photo={original}
          onApply={(b) => void scan(undefined, b)}
          onCancel={() => void scan()}
        />
      ) : photo ? (
        <details className="photo-original">
          <summary>{label("View photo", "Ver foto", "查看原图")}</summary>
          <img src={photo} alt={t.photoAlt} />
        </details>
      ) : null}
      <div className="photo-actions">
        <button
          type="button"
          className="button primary"
          disabled={disabled || reading}
          onClick={() => camera.current?.click()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h4l2-3h4l2 3h4v13H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          {t.takePhoto}
        </button>
        <button
          type="button"
          className="button ghost"
          disabled={disabled || reading}
          onClick={() => upload.current?.click()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4" />
          </svg>
          {photo ? t.replacePhoto : t.uploadPhoto}
        </button>
      </div>
      {original && !reading && !cropping && (
        <button
          type="button"
          className="text-button"
          disabled={disabled}
          onClick={() => {
            onStart();
            setError(null);
            setCropping(true);
          }}
        >
          {label(
            "Crop and reread",
            "Recortar y volver a leer",
            "裁剪并重新识别",
          )}
        </button>
      )}

      {reading && (
        <p className="scan-status" role="status">
          <span className="scan-dot" />
          {t.scanning}
        </p>
      )}
      {error && (
        <div className="scan-error" role="alert">
          <p>{error === "image" ? t.invalidPhoto : t.scanFailure}</p>
          {error === "transcription" && (
            <button
              type="button"
              className="text-button"
              disabled={disabled}
              onClick={onManual}
            >
              {t.manualFallback}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

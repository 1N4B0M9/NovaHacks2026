"use client";
import { useRef, useState } from "react";
import type { Copy } from "./copy";
import { localize, type Language } from "../../lib/locale";

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
  const [engine, setEngine] = useState("openrouter");
  const [error, setError] = useState<"image" | "transcription" | null>(null);
  async function scan(file: File) {
    if (busyRef.current) return;
    busyRef.current = true;
    setReading(true);
    setError(null);
    onBusy(true);
    onStart();
    onPhoto(null);
    let prepared = false;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const image = await preparePhoto(file);
      onPhoto(image);
      prepared = true;
      timeout = setTimeout(() => controller.abort(), 22000);
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, engine }),
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
      <label htmlFor="note-reader" className="field-label">
        {localize(
          language,
          "Text recognition",
          "Reconocimiento de texto",
          "文字识别方式",
        )}
      </label>
      <select
        id="note-reader"
        value={engine}
        disabled={disabled || reading}
        onChange={(event) => setEngine(event.target.value)}
      >
        <option value="openrouter">
          {localize(
            language,
            "Online · multilingual",
            "En línea · multilingüe",
            "在线识别 · 多语言",
          )}
        </option>
        <option value="local-zh">
          {localize(
            language,
            "Local OCR · Simplified Chinese",
            "OCR local · chino simplificado",
            "本地识别 · 简体中文",
          )}
        </option>
      </select>
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
      {photo ? (
        <figure className="note-photo">
          <img src={photo} alt={t.photoAlt} />
          <figcaption>{t.photoCaption}</figcaption>
        </figure>
      ) : (
        <div className="scan-placeholder">
          <svg
            viewBox="0 0 64 64"
            width="56"
            height="56"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M8 23V10h13M43 10h13v13M56 41v13H43M21 54H8V41" />
            <rect
              x="20"
              y="17"
              width="25"
              height="32"
              rx="3"
              transform="rotate(7 32 33)"
            />
            <path d="m25 26 14 2m-15 6 12 2m-13 6 8 1" />
          </svg>
          <strong>{t.scanPrompt}</strong>
          <p>{t.scanHint}</p>
        </div>
      )}
      <div className="photo-actions">
        <button
          type="button"
          className="button primary"
          disabled={disabled || reading}
          onClick={() => camera.current?.click()}
        >
          {t.takePhoto}
        </button>
        <button
          type="button"
          className="button ghost"
          disabled={disabled || reading}
          onClick={() => upload.current?.click()}
        >
          {photo ? t.replacePhoto : t.uploadPhoto}
        </button>
      </div>
      <p className="photo-privacy">
        {engine === "local-zh"
          ? localize(
              language,
              "This server reads your photo locally. No external recognition service receives it.",
              "Este servidor lee la foto localmente, sin enviarla a un servicio externo.",
              "照片由本应用服务器本地识别，不会发送给外部识别服务。",
            )
          : t.photoPrivacy}
      </p>
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

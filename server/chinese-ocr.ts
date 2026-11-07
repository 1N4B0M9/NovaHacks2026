import { execFile } from "node:child_process";
import { join } from "node:path";
import { OrderError } from "./order-error";
import type { LocalLine } from "../lib/ocr-lines";

let busy = false;
export async function transcribeLocally(
  image: string,
  language = "zh",
  lineOnly = false,
): Promise<{ text: string; lines: LocalLine[] }> {
  if (busy) throw new OrderError(503, "transcription_unavailable");
  busy = true;
  try {
    const text = await new Promise<string>((resolve, reject) => {
      const proc = execFile(
        process.execPath,
        [
          join(process.cwd(), "scripts/chinese-ocr.cjs"),
          language,
          lineOnly ? "line" : "block",
        ],
        {
          timeout: 18000,
          killSignal: "SIGKILL",
          maxBuffer: 64000,
          windowsHide: true,
        },
        (error, stdout) => (error ? reject(error) : resolve(stdout.trim())),
      );
      proc.stdin?.on("error", reject);
      proc.stdin?.end(
        Buffer.from(image.slice(image.indexOf(",") + 1), "base64"),
      );
    });
    const result = JSON.parse(text);
    if (
      typeof result.text !== "string" ||
      !result.text.trim() ||
      result.text.length > 5000 ||
      !Array.isArray(result.lines)
    )
      throw new Error("invalid output");
    const lines: LocalLine[] = result.lines.length
      ? result.lines
      : result.text
          .trim()
          .split(/\r?\n/)
          .map((s: string) => ({ text: s, box: null, confidence: null }));
    return { text: result.text.trim(), lines };
  } catch {
    throw new OrderError(503, "transcription_unavailable");
  } finally {
    busy = false;
  }
}

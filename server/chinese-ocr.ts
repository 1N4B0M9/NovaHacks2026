import { execFile } from "node:child_process";
import { join } from "node:path";
import { OrderError } from "./order-error";

let busy = false;
export async function transcribeLocally(image: string): Promise<string> {
  if (busy) throw new OrderError(503, "transcription_unavailable");
  busy = true;
  try {
    const text = await new Promise<string>((resolve, reject) => {
      const proc = execFile(
        process.execPath,
        [join(process.cwd(), "scripts/chinese-ocr.cjs")],
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
    if (!text || text.length > 5000) throw new Error("invalid output");
    return text;
  } catch {
    throw new OrderError(503, "transcription_unavailable");
  } finally {
    busy = false;
  }
}

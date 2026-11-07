// One short-lived worker per scan; the server bounds concurrency and wall time.
const { createWorker, OEM, PSM } = require("tesseract.js");
const packs = {
  en: "eng",
  es: "spa",
  zh: "chi_sim",
  "zh-Hans": "chi_sim",
  "zh-Hant": "chi_tra",
};

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const code = packs[process.argv[2] || "zh"];
  if (!code) throw new Error("invalid OCR language");
  const { langPath } = require("@tesseract.js-data/" + code);
  const worker = await createWorker(code, OEM.LSTM_ONLY, {
    langPath,
    cacheMethod: "none",
  });
  try {
    await worker.setParameters({
      tessedit_pageseg_mode:
        process.argv[3] === "line" ? PSM.SINGLE_LINE : PSM.SINGLE_BLOCK,
    });
    const { data } = await worker.recognize(
      Buffer.concat(chunks),
      {},
      { text: true, blocks: true },
    );
    const lines = (data.blocks || [])
      .flatMap((b) => b.paragraphs.flatMap((p) => p.lines))
      .map((l) => ({
        text: l.text.trim(),
        confidence: Math.min(l.confidence, ...l.words.map((w) => w.confidence)),
        box: l.bbox,
      }))
      .filter((l) => l.text);
    process.stdout.write(JSON.stringify({ text: data.text, lines }));
  } finally {
    await worker.terminate();
  }
}
main().catch(() => {
  process.exitCode = 1;
});

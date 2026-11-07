// One short-lived worker per scan; the server bounds concurrency and wall time.
const { createWorker, OEM, PSM } = require("tesseract.js");
const { langPath } = require("@tesseract.js-data/chi_sim");

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const worker = await createWorker("chi_sim", OEM.LSTM_ONLY, {
    langPath,
    cacheMethod: "none",
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
    const { data } = await worker.recognize(Buffer.concat(chunks));
    process.stdout.write(data.text);
  } finally {
    await worker.terminate();
  }
}
main().catch(() => {
  process.exitCode = 1;
});

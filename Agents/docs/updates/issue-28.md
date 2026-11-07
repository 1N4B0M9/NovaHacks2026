# Simplified Chinese demo and independent OCR path

Use [the printed test image](../../../tests/fixtures/chinese-order.png), or write these lines on paper with a broad dark pen:

    鸡蛋 1 箱
    燕麦奶 1 箱

The first line is one case of eggs ($54), the second one case of oat milk ($24). This baseline exercises two exact catalog identities and a supplier-native unit. A harder second run changes eggs to 鸡蛋 2 打; the merchant must resolve 24 requested eggs versus 180 per case before approval.

## Test in the app

Select 简体中文 under Review language. Choose 本地识别 · 简体中文 to run Tesseract on the app server without an OpenRouter key; 在线识别 uses the existing online model. Upload the note, compare the raw text to the photo, then press 核对供应商商品 and 确认模拟订单. The result should contain E180 and M1 and total USD 78.00.

Both paths were exercised in a real Chromium session against a production build. Tesseract returned 鸡 蛋 1 箱 / 燕 麦 奶 1 箱; OpenRouter returned 鸡蛋 1 箱 / 燕麦奶 1 箱. The matcher preserves the original lines and removes OCR-inserted Han character spacing only for matching. Both receipts totaled 7,800 cents. This verifies a printed fixture, not unseen handwriting.

## Engineering choices and limits

One server-side Tesseract.js process reads one Simplified Chinese scan at a time. Its WASM engine and chi_sim language data install with npm, and recognition does not require external inference. The request times out and cleans up the worker on failure; manual correction remains available. The current demo deployment runs Node from the project root and must include scripts/chinese-ocr.cjs and installed runtime packages. Traditional handwriting and multilingual free-form notes remain better suited to comparative testing. The interface review locale is zh; supplier names, titles, IDs and prices remain faithful to the source.

For recognition tuning, gather separately labeled handwritten notes, compare whole-page versus cropped/deskewed receipt images, and score exact quantities/units, omitted lines and correction counts. Consider an isolated-line retry when a digit or classifier is ambiguous. Keep engine suggestions editable and measure each engine on the same held-out writers before changing defaults.

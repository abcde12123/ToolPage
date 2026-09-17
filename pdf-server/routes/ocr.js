/**
 * OCR 文字识别路由
 * 使用 Tesseract.js 识别 PDF 中的文字
 */

const { createWorker } = require('tesseract.js');
const { createCanvas, loadImage } = require('canvas');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const fs = require('fs');

async function ocrPDF(filePath, options = {}) {
  const { pages, lang = 'chi_sim' } = options;

  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdfDoc = await loadingTask.promise;

  const totalPages = pdfDoc.numPages;
  let pageNums = [];

  if (pages) {
    const parts = pages.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (/^\d+$/.test(trimmed)) {
        pageNums.push(parseInt(trimmed, 10));
      } else if (/^\d+-\d+$/.test(trimmed)) {
        const [start, end] = trimmed.split('-').map(n => parseInt(n, 10));
        for (let p = start; p <= end; p++) {
          pageNums.push(p);
        }
      }
    }
    pageNums = pageNums.filter(p => p >= 1 && p <= totalPages);
  } else {
    for (let i = 1; i <= totalPages; i++) {
      pageNums.push(i);
    }
  }

  if (pageNums.length > 10) {
    throw new Error('一次最多识别 10 页');
  }

  const worker = await createWorker(lang);
  const results = [];

  for (const pageNo of pageNums) {
    const page = await pdfDoc.getPage(pageNo);
    const viewport = page.getViewport({ scale: 2 });

    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    const imageBuffer = canvas.toBuffer('image/png');
    const { data: { text } } = await worker.recognize(imageBuffer);

    results.push({
      pageNo,
      text: text.trim()
    });
  }

  await worker.terminate();

  return results;
}

module.exports = { ocrPDF };

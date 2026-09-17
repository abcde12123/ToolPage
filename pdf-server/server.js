#!/usr/bin/env node
/**
 * 夏夜工具集 - PDF 工具箱后端服务
 *
 * 提供重度计算功能的后端支持：
 * - POST /api/pdf/render        - PDF 转图片（服务端渲染）
 * - POST /api/pdf/optimize      - PDF 优化体积（qpdf 压缩）
 * - POST /api/pdf/watermark     - 添加水印
 * - POST /api/pdf/images-to-pdf - 图片转 PDF
 * - POST /api/pdf/ocr           - OCR 文字识别
 * - POST /api/pdf/encrypt       - PDF 加密
 * - POST /api/pdf/decrypt       - PDF 解密
 * - POST /api/pdf/batch-*       - 批量处理
 *
 * 监听 127.0.0.1:8400，由 nginx /api/pdf/ 反代
 * 所有请求需要管理员密码验证（X-Admin-Password 头）
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { PDFDocument, rgb, degrees } = require('pdf-lib');
const { createCanvas } = require('canvas');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const archiver = require('archiver');
const { exec } = require('child_process');
const util = require('util');
const { ocrPDF } = require('./routes/ocr');
const { encryptPDF, decryptPDF, checkQPDF } = require('./routes/encrypt');

const execPromise = util.promisify(exec);

// ===== 配置 =====
const PORT = Number(process.env.PDF_SERVER_PORT || 8400);
const HOST = process.env.PDF_SERVER_HOST || '127.0.0.1';
const ADMIN_PASSWORD = process.env.CONTROL_PASSWORD || 'admin';
const TEMP_DIR = path.join(__dirname, 'temp');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_BATCH_SIZE = 200 * 1024 * 1024; // 200MB
const REQUEST_TIMEOUT = 120000; // 120秒

// ===== 初始化 =====
fs.mkdirSync(TEMP_DIR, { recursive: true });

// 定期清理超过1小时的临时文件
setInterval(() => {
  const now = Date.now();
  fs.readdir(TEMP_DIR, (err, files) => {
    if (err) return;
    files.forEach(file => {
      const filePath = path.join(TEMP_DIR, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        if (now - stats.mtimeMs > 3600000) {
          fs.unlink(filePath, () => {});
        }
      });
    });
  });
}, 600000); // 每10分钟清理一次

// ===== 工具函数 =====
function verifyPassword(req, res, next) {
  const password = req.headers['x-admin-password'];
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: '密码错误或未授权' });
  }
  next();
}

function generateTempPath(ext = '') {
  const random = crypto.randomBytes(16).toString('hex');
  return path.join(TEMP_DIR, `${Date.now()}_${random}${ext}`);
}

function cleanupFiles(...files) {
  files.forEach(file => {
    if (file) {
      fs.unlink(file, () => {});
    }
  });
}

function parsePageRange(str) {
  const result = [];
  const parts = str.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (/^\d+$/.test(trimmed)) {
      result.push(parseInt(trimmed, 10));
    } else if (/^\d+-\d+$/.test(trimmed)) {
      const [start, end] = trimmed.split('-').map(n => parseInt(n, 10));
      for (let p = start; p <= end; p++) {
        result.push(p);
      }
    }
  }
  return result;
}

// ===== Express 应用 =====
const app = express();

app.use(express.json());

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => {
    const random = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${random}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('只支持 PDF、PNG、JPG 格式'));
    }
    cb(null, true);
  }
});

// ===== API 路由 =====

// 1. PDF 转图片
app.post('/api/pdf/render', verifyPassword, upload.single('file'), async (req, res) => {
  const filePath = req.file?.path;

  try {
    const { format = 'png', scale = 1, from = 1, to } = req.body;

    if (!filePath) {
      return res.status(400).json({ ok: false, error: '未上传文件' });
    }

    const data = new Uint8Array(fs.readFileSync(filePath));
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDoc = await loadingTask.promise;

    const totalPages = pdfDoc.numPages;
    const startPage = parseInt(from, 10) || 1;
    const endPage = parseInt(to, 10) || totalPages;

    if (startPage < 1 || endPage > totalPages || startPage > endPage) {
      cleanupFiles(filePath);
      return res.status(400).json({ ok: false, error: '页码范围无效' });
    }

    if (endPage - startPage + 1 > 20) {
      cleanupFiles(filePath);
      return res.status(400).json({ ok: false, error: '一次最多转换 20 页' });
    }

    const images = [];
    const scaleNum = parseFloat(scale);

    for (let pageNo = startPage; pageNo <= endPage; pageNo++) {
      const page = await pdfDoc.getPage(pageNo);
      const viewport = page.getViewport({ scale: scaleNum });

      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      const mimeType = format === 'webp' ? 'image/webp' : 'image/png';
      const buffer = canvas.toBuffer(mimeType, { quality: 0.92 });
      const base64 = buffer.toString('base64');

      images.push({
        pageNo,
        data: base64,
        mimeType
      });
    }

    cleanupFiles(filePath);
    res.json({ ok: true, images });

  } catch (error) {
    cleanupFiles(filePath);
    console.error('PDF 转图片失败:', error);
    res.status(500).json({ ok: false, error: '转换失败: ' + error.message });
  }
});

// 2. PDF 优化
app.post('/api/pdf/optimize', verifyPassword, upload.single('file'), async (req, res) => {
  const filePath = req.file?.path;
  const outputPath = generateTempPath('.pdf');

  try {
    if (!filePath) {
      return res.status(400).json({ ok: false, error: '未上传文件' });
    }

    const originalSize = fs.statSync(filePath).size;

    // 使用 qpdf 优化
    try {
      await execPromise(`qpdf --optimize-images --object-streams=generate "${filePath}" "${outputPath}"`);
    } catch (qpdfError) {
      // qpdf 不可用时，使用 pdf-lib 优化
      const pdfDoc = await PDFDocument.load(fs.readFileSync(filePath));
      const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
      fs.writeFileSync(outputPath, pdfBytes);
    }

    const optimizedSize = fs.statSync(outputPath).size;
    const data = fs.readFileSync(outputPath).toString('base64');

    cleanupFiles(filePath, outputPath);

    res.json({
      ok: true,
      data,
      originalSize,
      optimizedSize
    });

  } catch (error) {
    cleanupFiles(filePath, outputPath);
    console.error('PDF 优化失败:', error);
    res.status(500).json({ ok: false, error: '优化失败: ' + error.message });
  }
});

// 3. 图片转 PDF
app.post('/api/pdf/images-to-pdf', verifyPassword, upload.array('files', 20), async (req, res) => {
  const files = req.files || [];

  try {
    if (files.length === 0) {
      return res.status(400).json({ ok: false, error: '未上传文件' });
    }

    const pdfDoc = await PDFDocument.create();

    for (const file of files) {
      const imageBytes = fs.readFileSync(file.path);
      const ext = path.extname(file.originalname).toLowerCase();

      let image;
      if (ext === '.png') {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        image = await pdfDoc.embedJpg(imageBytes);
      }

      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height
      });
    }

    const pdfBytes = await pdfDoc.save();
    const data = Buffer.from(pdfBytes).toString('base64');

    cleanupFiles(...files.map(f => f.path));

    res.json({
      ok: true,
      data,
      pageCount: files.length
    });

  } catch (error) {
    cleanupFiles(...files.map(f => f.path));
    console.error('图片转 PDF 失败:', error);
    res.status(500).json({ ok: false, error: '转换失败: ' + error.message });
  }
});

// 4. 添加水印
app.post('/api/pdf/watermark', verifyPassword, upload.single('file'), async (req, res) => {
  const filePath = req.file?.path;

  try {
    const { text, position = 'center', opacity = 0.5 } = req.body;

    if (!filePath || !text) {
      cleanupFiles(filePath);
      return res.status(400).json({ ok: false, error: '缺少文件或水印文字' });
    }

    const pdfDoc = await PDFDocument.load(fs.readFileSync(filePath));
    const pages = pdfDoc.getPages();
    const fontSize = 48;
    const color = rgb(0.5, 0.5, 0.5);
    const opacityNum = parseFloat(opacity);

    for (const page of pages) {
      const { width, height } = page.getSize();
      const textWidth = text.length * fontSize * 0.6;

      let x, y, rotate;
      if (position === 'center') {
        x = (width - textWidth) / 2;
        y = height / 2;
        rotate = degrees(0);
      } else if (position === 'diagonal') {
        x = width / 2 - textWidth / 2;
        y = height / 2;
        rotate = degrees(45);
      } else {
        x = (width - textWidth) / 2;
        y = 50;
        rotate = degrees(0);
      }

      page.drawText(text, {
        x,
        y,
        size: fontSize,
        color,
        opacity: opacityNum,
        rotate
      });
    }

    const pdfBytes = await pdfDoc.save();
    const data = Buffer.from(pdfBytes).toString('base64');

    cleanupFiles(filePath);

    res.json({ ok: true, data });

  } catch (error) {
    cleanupFiles(filePath);
    console.error('添加水印失败:', error);
    res.status(500).json({ ok: false, error: '添加失败: ' + error.message });
  }
});

// 5. 批量优化
app.post('/api/pdf/batch-optimize', verifyPassword, upload.array('files', 10), async (req, res) => {
  const files = req.files || [];

  try {
    if (files.length === 0) {
      return res.status(400).json({ ok: false, error: '未上传文件' });
    }

    const results = [];

    for (const file of files) {
      try {
        const pdfDoc = await PDFDocument.load(fs.readFileSync(file.path));
        const originalSize = file.size;
        const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
        const optimizedSize = pdfBytes.length;
        const data = Buffer.from(pdfBytes).toString('base64');

        results.push({
          name: file.originalname,
          success: true,
          data,
          originalSize,
          optimizedSize
        });
      } catch (error) {
        results.push({
          name: file.originalname,
          success: false,
          error: error.message
        });
      }
    }

    cleanupFiles(...files.map(f => f.path));

    res.json({ ok: true, results });

  } catch (error) {
    cleanupFiles(...files.map(f => f.path));
    console.error('批量优化失败:', error);
    res.status(500).json({ ok: false, error: '批量处理失败: ' + error.message });
  }
});

// 6. OCR 文字识别
app.post('/api/pdf/ocr', verifyPassword, upload.single('file'), async (req, res) => {
  const filePath = req.file?.path;

  try {
    if (!filePath) {
      return res.status(400).json({ ok: false, error: '未上传文件' });
    }

    const { pages, lang = 'chi_sim' } = req.body;

    const results = await ocrPDF(filePath, { pages, lang });

    cleanupFiles(filePath);

    res.json({ ok: true, results });

  } catch (error) {
    cleanupFiles(filePath);
    console.error('OCR 识别失败:', error);
    res.status(500).json({ ok: false, error: error.message || 'OCR 识别失败' });
  }
});

// 7. PDF 加密
app.post('/api/pdf/encrypt', verifyPassword, upload.single('file'), async (req, res) => {
  const filePath = req.file?.path;

  try {
    const { password } = req.body;

    if (!filePath) {
      return res.status(400).json({ ok: false, error: '未上传文件' });
    }

    if (!password) {
      cleanupFiles(filePath);
      return res.status(400).json({ ok: false, error: '请输入密码' });
    }

    const buffer = await encryptPDF(filePath, password);
    const data = buffer.toString('base64');

    cleanupFiles(filePath);

    res.json({ ok: true, data });

  } catch (error) {
    cleanupFiles(filePath);
    console.error('PDF 加密失败:', error);
    res.status(500).json({ ok: false, error: error.message || '加密失败' });
  }
});

// 8. PDF 解密
app.post('/api/pdf/decrypt', verifyPassword, upload.single('file'), async (req, res) => {
  const filePath = req.file?.path;

  try {
    const { password } = req.body;

    if (!filePath) {
      return res.status(400).json({ ok: false, error: '未上传文件' });
    }

    if (!password) {
      cleanupFiles(filePath);
      return res.status(400).json({ ok: false, error: '请输入密码' });
    }

    const buffer = await decryptPDF(filePath, password);
    const data = buffer.toString('base64');

    cleanupFiles(filePath);

    res.json({ ok: true, data });

  } catch (error) {
    cleanupFiles(filePath);
    console.error('PDF 解密失败:', error);
    res.status(500).json({ ok: false, error: error.message || '解密失败' });
  }
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ ok: false, error: err.message || '服务器内部错误' });
});

// ===== 启动服务 =====
app.listen(PORT, HOST, () => {
  console.log(`✓ PDF 服务器运行在 http://${HOST}:${PORT}`);
  console.log(`✓ 临时文件目录: ${TEMP_DIR}`);
  console.log(`✓ 最大文件大小: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
});

/**
 * PDF 加密/解密路由
 * 使用 qpdf 命令行工具
 */

const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const execPromise = util.promisify(exec);

function generateTempPath(ext = '') {
  const random = crypto.randomBytes(16).toString('hex');
  const tempDir = path.join(__dirname, '..', 'temp');
  return path.join(tempDir, `${Date.now()}_${random}${ext}`);
}

/**
 * 加密 PDF
 * @param {string} inputPath - 输入文件路径
 * @param {string} password - 用户密码
 * @returns {Promise<Buffer>} 加密后的 PDF Buffer
 */
async function encryptPDF(inputPath, password) {
  if (!password || password.length < 1) {
    throw new Error('密码不能为空');
  }

  const outputPath = generateTempPath('.pdf');

  try {
    // 使用 qpdf 加密：128-bit AES，用户密码 = 所有者密码
    const cmd = `qpdf --encrypt "${password}" "${password}" 128 -- "${inputPath}" "${outputPath}"`;
    await execPromise(cmd);

    const buffer = fs.readFileSync(outputPath);
    fs.unlinkSync(outputPath);

    return buffer;
  } catch (error) {
    // 清理临时文件
    try { fs.unlinkSync(outputPath); } catch (e) {}
    throw new Error('加密失败: ' + error.message);
  }
}

/**
 * 解密 PDF
 * @param {string} inputPath - 输入文件路径
 * @param {string} password - 原密码
 * @returns {Promise<Buffer>} 解密后的 PDF Buffer
 */
async function decryptPDF(inputPath, password) {
  if (!password) {
    throw new Error('密码不能为空');
  }

  const outputPath = generateTempPath('.pdf');

  try {
    // 使用 qpdf 解密
    const cmd = `qpdf --password="${password}" --decrypt "${inputPath}" "${outputPath}"`;
    await execPromise(cmd);

    const buffer = fs.readFileSync(outputPath);
    fs.unlinkSync(outputPath);

    return buffer;
  } catch (error) {
    // 清理临时文件
    try { fs.unlinkSync(outputPath); } catch (e) {}

    if (error.message.includes('password')) {
      throw new Error('密码错误或文件未加密');
    }
    throw new Error('解密失败: ' + error.message);
  }
}

/**
 * 检查 qpdf 是否可用
 * @returns {Promise<boolean>}
 */
async function checkQPDF() {
  try {
    await execPromise('qpdf --version');
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  encryptPDF,
  decryptPDF,
  checkQPDF
};

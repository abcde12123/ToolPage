# PDF 工具箱后端功能实现计划

## 📋 需求总结

根据用户选择：
1. ✅ **重度计算功能后端化**：转图片、优化体积等计算密集型功能
2. ✅ **新增高级功能**：OCR 提取 PDF 文字、PDF 加密/解密
3. ✅ **批量处理功能**：支持一次上传多个文件批量处理

## 🏗️ 架构设计

### 后端服务（Node.js + Express）

**新建服务：** `/opt/pdf-server/`（独立进程，类似下载站架构）

**技术栈：**
- Express - HTTP 服务器
- pdf-lib - PDF 编辑（服务端版本）
- canvas + pdfjs-dist - PDF 转图片（服务端渲染）
- qpdf - PDF 加密/解密/优化（命令行工具）
- tesseract.js - OCR 文字识别
- multer - 文件上传处理

**端口：** 127.0.0.1:8400（Nginx 反代）

### 前端适配

**权限保护：**
- 复用现有控制台密码验证机制
- 后端功能添加 💎 图标标识
- 前端检测管理员登录状态，未登录时提示输入密码

**双模式运行：**
- 轻量功能（合并、拆分、旋转、删页）：保持纯前端
- 重度功能（转图片、优化、图转PDF、水印）：💎 需密码，走后端
- 新增功能（OCR、加密/解密）：💎 需密码，走后端
- 批量处理：💎 需密码，走后端

## 📦 API 设计

### 1. 身份验证

```
POST /api/verify-password
Header: X-Admin-Password: <password>
Response: { ok: true } / 401
```

### 2. PDF 转图片（重度计算）

```
POST /api/pdf/render
Header: X-Admin-Password: <password>
Body: multipart/form-data
  - file: PDF 文件
  - format: 'png' | 'webp'
  - scale: 1 | 1.5 | 2
  - from: 起始页
  - to: 结束页

Response: {
  ok: true,
  images: [
    { pageNo: 1, data: 'base64...' },
    { pageNo: 2, data: 'base64...' }
  ]
}
```

### 3. PDF 优化（重度计算）

```
POST /api/pdf/optimize
Header: X-Admin-Password: <password>
Body: multipart/form-data
  - file: PDF 文件

Response: {
  ok: true,
  data: 'base64...',
  originalSize: 123456,
  optimizedSize: 98765
}
```

### 4. 图片转 PDF

```
POST /api/pdf/images-to-pdf
Header: X-Admin-Password: <password>
Body: multipart/form-data
  - files[]: 多个图片文件

Response: {
  ok: true,
  data: 'base64...',
  pageCount: 5
}
```

### 5. 添加水印

```
POST /api/pdf/watermark
Header: X-Admin-Password: <password>
Body: multipart/form-data
  - file: PDF 文件
  - text: 水印文字
  - position: 'center' | 'diagonal' | 'bottom'
  - opacity: 0.3 | 0.5 | 0.7

Response: {
  ok: true,
  data: 'base64...'
}
```

### 6. OCR 文字识别（新功能）

```
POST /api/pdf/ocr
Header: X-Admin-Password: <password>
Body: multipart/form-data
  - file: PDF 文件
  - pages: '1-3,5' (可选，默认全部)
  - lang: 'chi_sim' | 'eng' (默认 chi_sim)

Response: {
  ok: true,
  results: [
    { pageNo: 1, text: '识别的文字...' },
    { pageNo: 2, text: '识别的文字...' }
  ]
}
```

### 7. PDF 加密

```
POST /api/pdf/encrypt
Header: X-Admin-Password: <password>
Body: multipart/form-data
  - file: PDF 文件
  - password: 用户密码

Response: {
  ok: true,
  data: 'base64...'
}
```

### 8. PDF 解密

```
POST /api/pdf/decrypt
Header: X-Admin-Password: <password>
Body: multipart/form-data
  - file: PDF 文件
  - password: 原密码

Response: {
  ok: true,
  data: 'base64...'
}
```

### 9. 批量处理

```
POST /api/pdf/batch-optimize
Header: X-Admin-Password: <password>
Body: multipart/form-data
  - files[]: 多个 PDF 文件

Response: {
  ok: true,
  results: [
    { name: 'file1.pdf', success: true, data: 'base64...', originalSize: 100, newSize: 80 },
    { name: 'file2.pdf', success: false, error: '文件损坏' }
  ]
}
```

## 🎨 前端改造

### 1. 添加权限检查弹窗

```javascript
// 新增全局函数
function requireAdminPassword(callback) {
  if (window.isAdminLoggedIn) {
    callback();
    return;
  }
  
  showPasswordPrompt(function(password) {
    fetch('/api/pdf/verify-password', {
      method: 'POST',
      headers: { 'X-Admin-Password': password }
    }).then(function(r) {
      if (r.ok) {
        window.isAdminLoggedIn = true;
        window.adminPassword = password;
        callback();
      } else {
        showToast('密码错误');
      }
    });
  });
}
```

### 2. 修改现有功能切换逻辑

```javascript
// 转图片改为后端
function doRender() {
  requireAdminPassword(function() {
    // 调用后端 API
    var formData = new FormData();
    formData.append('file', convertFile);
    formData.append('format', renderFormat.value);
    formData.append('scale', renderScale.value);
    formData.append('from', renderFrom.value);
    formData.append('to', renderTo.value);
    
    fetch('/api/pdf/render', {
      method: 'POST',
      headers: { 'X-Admin-Password': window.adminPassword },
      body: formData
    }).then(/* 处理结果 */);
  });
}
```

### 3. 新增 OCR 和加密/解密标签

在现有 8 个标签基础上增加 3 个：
- 📝💎 OCR 提取文字
- 🔒💎 加密 PDF
- 🔓💎 解密 PDF

每个标签按钮添加 💎 emoji 标识需要权限。

### 4. 批量处理模式

每个后端功能增加"批量模式"复选框：
- 勾选后允许选择多个文件
- 显示批量处理进度条
- 结果打包为 ZIP 下载

## 📁 文件结构

```
/opt/pdf-server/
├── server.js           # 主服务器
├── package.json        # 依赖配置
├── routes/
│   ├── render.js       # 转图片
│   ├── optimize.js     # 优化
│   ├── watermark.js    # 水印
│   ├── ocr.js          # OCR
│   ├── encrypt.js      # 加密/解密
│   └── batch.js        # 批量处理
├── utils/
│   ├── auth.js         # 密码验证
│   └── pdf-utils.js    # PDF 工具函数
└── temp/               # 临时文件目录
```

## 🔐 安全措施

1. **密码验证**：所有 API 需要 X-Admin-Password 头
2. **文件大小限制**：单文件 50MB，批量总计 200MB
3. **文件类型检查**：只允许 PDF 和图片格式
4. **临时文件清理**：处理完成后立即删除
5. **超时保护**：单个请求最多 60 秒
6. **速率限制**：同一 IP 每分钟最多 10 次请求

## 🚀 部署步骤

1. 在服务器创建 `/opt/pdf-server/` 目录
2. 上传服务器代码
3. 安装依赖：`npm install`
4. 安装系统依赖：`apt install qpdf tesseract-ocr tesseract-ocr-chi-sim`
5. 配置环境变量：`PDF_SERVER_PASSWORD`（复用控制台密码）
6. 启动服务：`pm2 start server.js --name pdf-server`
7. Nginx 配置反向代理：
   ```nginx
   location /api/pdf/ {
       proxy_pass http://127.0.0.1:8400/api/pdf/;
       client_max_body_size 200M;
       proxy_read_timeout 120s;
   }
   ```
8. 前端更新：上传新版 pdf-tools.js

## 📊 估算成本

**开发时间：** 约 6-8 小时
- 后端服务搭建：2 小时
- API 实现（9个）：3 小时
- 前端改造：2 小时
- 测试调试：1 小时

**服务器资源：**
- 内存：约 100-200MB（闲时）
- CPU：处理时峰值 30-50%
- 磁盘：临时文件自动清理

**依赖大小：**
- Node.js 包：约 50MB
- 系统工具：约 20MB

## ✅ 验收标准

1. ✅ 所有重度计算功能可正常使用
2. ✅ 新增 OCR、加密、解密功能工作正常
3. ✅ 批量处理模式支持多文件
4. ✅ 权限验证正确，未授权返回 401
5. ✅ 临时文件正确清理，无泄漏
6. ✅ 错误处理完善，用户体验友好
7. ✅ 线上部署成功，稳定运行

## 🎯 后续扩展

可能的未来功能：
- PDF 合并/拆分也支持批量
- PDF 表单填写
- PDF 页面重排
- PDF 转 Word/Excel
- 更多 OCR 语言支持

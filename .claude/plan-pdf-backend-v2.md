# PDF 工具箱后端功能实现方案（修订版）

## 📋 最终需求确认

### 保持现有功能（纯前端，已完成）
1. 📂 合并 PDF
2. 🖼 转图片
3. 📑 拆分
4. 🔄 旋转
5. 🗑 删页
6. 🖼→📄 图转PDF
7. 💧 水印
8. ✂ 优化体积

### 新增后端专属功能（💎 需管理员密码）
9. 📝💎 OCR 提取文字 - 使用 Tesseract 识别 PDF 中的文字
10. 🔒💎 加密 PDF - 添加密码保护
11. 🔓💎 解密 PDF - 移除密码保护

### 后端加速选项（可选 💎）
- 🖼 转图片：添加"使用后端加速"复选框（服务端渲染更快）
- ✂ 优化体积：添加"使用后端优化"复选框（qpdf 压缩效果更好）

### 批量处理模式（💎 需权限）
- 所有功能支持"批量模式"复选框
- 勾选后可上传多个文件，结果打包下载

## 🏗️ 技术架构

### 后端服务
- **路径**：`/opt/pdf-server/`
- **端口**：127.0.0.1:8400
- **反代**：Nginx `/api/pdf/` → `http://127.0.0.1:8400/api/pdf/`
- **依赖**：
  - express - HTTP 服务
  - multer - 文件上传
  - pdf-lib - PDF 操作
  - canvas + pdfjs-dist - 服务端渲染
  - tesseract.js - OCR 识别
  - qpdf（系统）- 优化/加密/解密

### 前端改造
- 添加 3 个新标签（OCR、加密、解密）
- 转图片和优化添加"后端加速"复选框
- 所有功能添加"批量模式"复选框
- 实现密码验证弹窗（复用控制台密码）

## 📦 API 设计

### 1. OCR 文字识别
```
POST /api/pdf/ocr
Headers: X-Admin-Password: <password>
Body: multipart/form-data
  - file: PDF 文件
  - pages: '1-3' (可选)
  - lang: 'chi_sim' | 'eng'

Response: {
  ok: true,
  results: [
    { pageNo: 1, text: '识别的文字...' }
  ]
}
```

### 2. PDF 加密
```
POST /api/pdf/encrypt
Headers: X-Admin-Password: <password>
Body: multipart/form-data
  - file: PDF 文件
  - password: 用户密码

Response: {
  ok: true,
  data: 'base64...'
}
```

### 3. PDF 解密
```
POST /api/pdf/decrypt
Headers: X-Admin-Password: <password>
Body: multipart/form-data
  - file: PDF 文件
  - password: 原密码

Response: {
  ok: true,
  data: 'base64...'
}
```

### 4. 转图片（后端加速）
```
POST /api/pdf/render
Headers: X-Admin-Password: <password>
Body: multipart/form-data
  - file: PDF 文件
  - format: 'png' | 'webp'
  - scale: 1 | 1.5 | 2
  - from: 1, to: 3

Response: {
  ok: true,
  images: [{ pageNo: 1, data: 'base64...', mimeType: 'image/png' }]
}
```

### 5. 优化（后端加速）
```
POST /api/pdf/optimize
Headers: X-Admin-Password: <password>
Body: multipart/form-data
  - file: PDF 文件

Response: {
  ok: true,
  data: 'base64...',
  originalSize: 123456,
  optimizedSize: 98765
}
```

### 6. 批量处理
```
POST /api/pdf/batch-<operation>
Headers: X-Admin-Password: <password>
Body: multipart/form-data
  - files[]: 多个文件
  - ...其他参数

Response: {
  ok: true,
  results: [
    { name: 'file1.pdf', success: true, data: 'base64...' },
    { name: 'file2.pdf', success: false, error: '...' }
  ]
}
```

## 🎨 UI 设计

### 新增标签
```
标签栏：
📂 合并 | 🖼 转图片 | 📑 拆分 | 🔄 旋转 | 🗑 删页 | 
🖼→📄 图转PDF | 💧 水印 | ✂ 优化体积 | 
📝💎 OCR | 🔒💎 加密 | 🔓💎 解密
```

### 后端加速选项（转图片面板）
```
[ ] 💎 使用后端加速（渲染更快，需管理员密码）
```

### 批量模式（所有面板）
```
[ ] 💎 批量处理模式（一次处理多个文件）
```

## 📁 文件结构

```
pdf-server/
├── server.js              # 主服务
├── package.json           # 依赖
├── routes/
│   ├── ocr.js            # OCR 识别
│   ├── encrypt.js        # 加密/解密
│   ├── render.js         # 转图片加速
│   ├── optimize.js       # 优化加速
│   └── batch.js          # 批量处理
├── utils/
│   ├── auth.js           # 密码验证
│   └── cleanup.js        # 临时文件清理
└── temp/                  # 临时目录
```

## 🚀 实施步骤

### Phase 1: 后端服务搭建
1. ✅ 创建 server.js 主文件
2. ⏳ 实现 OCR 功能路由
3. ⏳ 实现加密/解密路由
4. ⏳ 实现转图片加速路由
5. ⏳ 实现优化加速路由
6. ⏳ 实现批量处理路由

### Phase 2: 前端改造
1. ⏳ 添加密码验证弹窗
2. ⏳ 添加 3 个新标签（OCR、加密、解密）
3. ⏳ 转图片/优化添加"后端加速"选项
4. ⏳ 所有功能添加"批量模式"选项
5. ⏳ 实现后端 API 调用逻辑

### Phase 3: 部署测试
1. ⏳ 服务器安装依赖
2. ⏳ 配置 Nginx 反向代理
3. ⏳ PM2 启动服务
4. ⏳ 前端上传测试
5. ⏳ 全功能验收

## 📊 当前进度

- [x] 前端 8 个基础功能（纯前端）
- [x] 后端服务框架（server.js 基础版）
- [ ] OCR 功能
- [ ] 加密/解密功能
- [ ] 后端加速选项
- [ ] 批量处理模式
- [ ] 前端密码验证
- [ ] 部署上线

---

**存档时间**: 2026-08-20 16:50  
**下一步**: 开始 Pipeline 实施

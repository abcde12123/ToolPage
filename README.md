# ✧ 夏夜工具集

> 一款毛玻璃风格的在线工具集合页面，随手做的小工具，希望能帮到你～

🌐 **线上地址**: [xiaye.xyz](https://xiaye.xyz)

---

## 🛠️ 包含工具

| 工具 | 说明 | 状态 |
|------|------|------|
| 🤖 AI 聊天 | 智能 AI 对话助手，随时提问 | ✅ 已上线 |
| `{}` JSON 格式化 | 格式化、校验、压缩 JSON 数据 | ✅ 已上线 |
| 🔤 Base64 编解码 | 文本与 Base64 互转 | ✅ 已上线 |
| 🕐 时间戳转换 | 时间戳与日期格式互转 | ✅ 已上线 |
| 🧪 正则测试器 | 在线测试正则表达式匹配结果 | ✅ 已上线 |
| 🎨 色值转换 | HEX / RGB / HSL 色值互转 | ✅ 已上线 |
| 📱 二维码生成 | 将文本或链接转换成二维码图片 | ✅ 已上线 |
| 🖼️ 图片压缩 | 智能压缩图片，保持清晰度的同时缩小体积 | ✅ 已上线 |
| 📝 文字识别 | OCR 识别图片中的文字 | ✅ 已上线 |

## ✨ 特点

- 🪟 **毛玻璃设计** — 采用 `backdrop-filter: blur()` 打造通透的玻璃质感
- 🎨 **浮动光灵系统** — 随机彩色光团在页面中缓慢飘动、呼吸、融合，每一帧都不同（基于 Canvas + CSS）
- 🌀 **弹性动效** — 卡片悬停弹簧效果 `cubic-bezier(0.34, 1.56, 0.64, 1)`
- 👁️ **IntersectionObserver 入场动画** — 卡片滚动到可视区域时依次淡入
- 📱 **响应式布局** — 768px / 480px 断点适配手机和平板
- 🌙 **温柔配色** — 暖白底色 + 浅色毛玻璃卡片，阅读舒适

## 🏗️ 技术栈

- 原生 HTML5 / CSS3 / JavaScript（零依赖）
- 毛玻璃特效: `backdrop-filter: blur()`
- 光灵系统: 纯 JS 动态生成 + CSS transition 动画
- 工具模块: 按需动态加载 (`<script>` 懒加载)
- 部署: Nginx + Ubuntu 22.04

## 📁 项目结构

```
├── index.html              # 主页面
├── css/
│   └── style.css           # 完整样式（毛玻璃、光灵、弹窗、各工具 UI）
├── js/
│   ├── main.js             # 主逻辑（卡片渲染、光灵系统、入场动画）
│   ├── modal.js            # 弹窗管理器
│   └── tools/              # 工具模块（按需加载）
│       ├── base64.js       # Base64 编解码
│       ├── color-converter.js  # 色值转换
│       ├── image-compress.js   # 图片压缩
│       ├── json-formatter.js   # JSON 格式化
│       ├── ocr.js          # 文字识别
│       ├── qrcode.js       # 二维码生成
│       ├── regex-tester.js # 正则测试器
│       └── timestamp.js    # 时间戳转换
├── images/
│   └── 像素2.jpg           # 页面用图
└── README.md
```

## 🚀 本地运行

由于是纯静态页面，直接用浏览器打开 `index.html` 即可，或通过任意 HTTP 服务器托管：

```bash
# Python
python -m http.server 8000

# Node.js (npx)
npx serve .
```

## 📜 License

MIT

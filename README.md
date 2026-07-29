<div align="center">

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 280" width="100%" height="auto" style="max-width:800px;">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFAF7"/>
      <stop offset="100%" stop-color="#FFF0ED"/>
      <animate attributeName="x1" values="0%;100%;0%" dur="12s" repeatCount="indefinite"/>
      <animate attributeName="x2" values="100%;0%;100%" dur="12s" repeatCount="indefinite"/>
    </linearGradient>
    <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7C3AED"/>
      <stop offset="33%" stop-color="#6D28D9"/>
      <stop offset="66%" stop-color="#A855F7"/>
      <stop offset="100%" stop-color="#7C3AED"/>
      <animate attributeName="x1" values="0%;100%;0%" dur="8s" repeatCount="indefinite"/>
      <animate attributeName="x2" values="100%;200%;100%" dur="8s" repeatCount="indefinite"/>
    </linearGradient>
    <linearGradient id="cardGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.55)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.35)"/>
    </linearGradient>
    <linearGradient id="subtitleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#78716C"/>
      <stop offset="50%" stop-color="#A8A29E"/>
      <stop offset="100%" stop-color="#78716C"/>
      <animate attributeName="x1" values="0%;100%;0%" dur="10s" repeatCount="indefinite"/>
      <animate attributeName="x2" values="100%;200%;100%" dur="10s" repeatCount="indefinite"/>
    </linearGradient>
    <filter id="glass" x="-10%" y="-10%" width="120%" height="130%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.5"/>
    </filter>
    <filter id="glow">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Orb gradients -->
    <radialGradient id="orb1" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="rgba(220,200,255,0.7)"/>
      <stop offset="60%" stop-color="rgba(200,230,255,0.3)"/>
      <stop offset="100%" stop-color="transparent"/>
      <animate attributeName="cx" values="40%;50%;30%;40%" dur="15s" repeatCount="indefinite"/>
      <animate attributeName="cy" values="40%;30%;50%;40%" dur="15s" repeatCount="indefinite"/>
    </radialGradient>
    <radialGradient id="orb2" cx="60%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(255,218,230,0.6)"/>
      <stop offset="60%" stop-color="rgba(255,228,200,0.25)"/>
      <stop offset="100%" stop-color="transparent"/>
      <animate attributeName="cx" values="60%;70%;50%;60%" dur="18s" repeatCount="indefinite"/>
      <animate attributeName="cy" values="50%;40%;60%;50%" dur="18s" repeatCount="indefinite"/>
    </radialGradient>
    <radialGradient id="orb3" cx="30%" cy="60%" r="45%">
      <stop offset="0%" stop-color="rgba(210,245,220,0.55)"/>
      <stop offset="60%" stop-color="rgba(200,230,255,0.2)"/>
      <stop offset="100%" stop-color="transparent"/>
      <animate attributeName="cx" values="30%;20%;40%;30%" dur="20s" repeatCount="indefinite"/>
      <animate attributeName="cy" values="60%;50%;70%;60%" dur="20s" repeatCount="indefinite"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="800" height="280" rx="24" fill="url(#bgGrad)"/>

  <!-- Floating Orbs -->
  <circle cx="150" cy="80" r="120" fill="url(#orb1)" opacity="0.8">
    <animate attributeName="r" values="120;140;110;120" dur="10s" repeatCount="indefinite"/>
  </circle>
  <circle cx="650" cy="180" r="100" fill="url(#orb2)" opacity="0.7">
    <animate attributeName="r" values="100;120;90;100" dur="12s" repeatCount="indefinite"/>
  </circle>
  <circle cx="400" cy="200" r="90" fill="url(#orb3)" opacity="0.6">
    <animate attributeName="r" values="90;110;80;90" dur="14s" repeatCount="indefinite"/>
  </circle>

  <!-- Glass card background -->
  <rect x="60" y="30" width="680" height="220" rx="20" fill="url(#cardGrad1)" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" filter="url(#glass)">
    <animate attributeName="opacity" values="0.85;0.95;0.85" dur="6s" repeatCount="indefinite"/>
  </rect>

  <!-- ✧ Icon -->
  <text x="400" y="82" font-size="36" text-anchor="middle" fill="#7C3AED" filter="url(#glow)">✧
    <animate attributeName="y" values="82;78;82" dur="3s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="1;0.7;1" dur="3s" repeatCount="indefinite"/>
  </text>

  <!-- Title -->
  <text x="400" y="142" font-family="system-ui,-apple-system,sans-serif" font-size="48" font-weight="800" text-anchor="middle" fill="url(#titleGrad)" letter-spacing="2">夏夜工具集</text>

  <!-- Subtitle -->
  <text x="400" y="182" font-family="system-ui,-apple-system,sans-serif" font-size="16" text-anchor="middle" fill="url(#subtitleGrad)" letter-spacing="4">✦ 随手做的小工具，希望能帮到你 ✦</text>

  <!-- Tool count badges -->
  <g transform="translate(190, 210)">
    <rect x="0" y="0" width="56" height="24" rx="12" fill="rgba(167,139,250,0.2)" stroke="rgba(167,139,250,0.3)" stroke-width="1"/>
    <text x="28" y="16" font-family="system-ui,sans-serif" font-size="12" font-weight="600" text-anchor="middle" fill="#7C3AED">9 工具</text>
  </g>
  <g transform="translate(262, 210)">
    <rect x="0" y="0" width="56" height="24" rx="12" fill="rgba(251,146,60,0.15)" stroke="rgba(251,146,60,0.2)" stroke-width="1"/>
    <text x="28" y="16" font-family="system-ui,sans-serif" font-size="12" font-weight="600" text-anchor="middle" fill="#D97706">纯原生</text>
  </g>
  <g transform="translate(334, 210)">
    <rect x="0" y="0" width="56" height="24" rx="12" fill="rgba(96,165,250,0.2)" stroke="rgba(96,165,250,0.3)" stroke-width="1"/>
    <text x="28" y="16" font-family="system-ui,sans-serif" font-size="12" font-weight="600" text-anchor="middle" fill="#2563EB">零依赖</text>
  </g>

  <!-- Floating sparkle particles -->
  <text x="680" y="90" font-size="14" fill="#C4B5FD" opacity="0.6">✦
    <animate attributeName="y" values="90;60;120;90" dur="7s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.6;1;0.3;0.6" dur="7s" repeatCount="indefinite"/>
  </text>
  <text x="120" y="200" font-size="10" fill="#FDE68A" opacity="0.5">✧
    <animate attributeName="y" values="200;170;220;200" dur="9s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.5;0.9;0.3;0.5" dur="9s" repeatCount="indefinite"/>
  </text>
  <text x="700" y="230" font-size="12" fill="#A7F3D0" opacity="0.5">✦
    <animate attributeName="y" values="230;200;250;230" dur="11s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.5;0.8;0.2;0.5" dur="11s" repeatCount="indefinite"/>
  </text>
</svg>
```

<br>

[![status](https://img.shields.io/badge/状态-已上线-7C3AED?style=flat-square&labelColor=1E293B)](https://xiaye.xyz)
[![tech](https://img.shields.io/badge/技术栈-原生三件套-2563EB?style=flat-square&labelColor=1E293B)]()
[![license](https://img.shields.io/badge/许可-MIT-10B981?style=flat-square&labelColor=1E293B)]()
[![deploy](https://img.shields.io/badge/部署-Nginx+-D97706?style=flat-square&labelColor=1E293B)]()

<br>

</div>

## 🌈 包含工具

<div align="center">

| 工具 | 功能 | 状态 |
|:-----|:-----|:----:|
| 🤖 **AI 聊天** | 智能 AI 对话助手，随时提问 | <img src="https://img.shields.io/badge/-已上线-22C55E?style=flat-square"/> |
| `{}` **JSON 格式化** | 格式化、校验、压缩 JSON 数据 | <img src="https://img.shields.io/badge/-已上线-22C55E?style=flat-square"/> |
| 🔤 **Base64 编解码** | 文本与 Base64 互转 | <img src="https://img.shields.io/badge/-已上线-22C55E?style=flat-square"/> |
| 🕐 **时间戳转换** | 时间戳与日期格式互转 | <img src="https://img.shields.io/badge/-已上线-22C55E?style=flat-square"/> |
| 🧪 **正则测试器** | 在线测试正则表达式匹配结果 | <img src="https://img.shields.io/badge/-已上线-22C55E?style=flat-square"/> |
| 🎨 **色值转换** | HEX / RGB / HSL 色值互转 | <img src="https://img.shields.io/badge/-已上线-22C55E?style=flat-square"/> |
| 📱 **二维码生成** | 文本或链接 → 二维码图片 | <img src="https://img.shields.io/badge/-已上线-22C55E?style=flat-square"/> |
| 🖼️ **图片压缩** | 智能压缩，清晰度与大/小的平衡 | <img src="https://img.shields.io/badge/-已上线-22C55E?style=flat-square"/> |
| 📝 **文字识别** | OCR 识别图片中的文字 | <img src="https://img.shields.io/badge/-已上线-22C55E?style=flat-square"/> |

</div>

## ✨ 设计亮点

<table>
<tr>
<td width="50%">

### 🪟 毛玻璃质感
```
background: rgba(255,255,255,0.55);
backdrop-filter: blur(20px);
border-radius: 20px;
```
通透的玻璃卡片 + 柔和暖白底色，呼吸感十足

</td>
<td width="50%">

### 🌀 弹性交互
```css
cubic-bezier(0.34, 1.56, 0.64, 1)
```
卡片悬停上浮、弹窗弹入、Toast 弹出——所有动效都带着 QQ 的弹簧感

</td>
</tr>
<tr>
<td width="50%">

### 🎨 浮动光灵系统
页面上漂浮着 **8 个动态光团**，每一个都拥有：
- 随机渐变配色（淡紫/浅粉/薄荷/天蓝...）
- 独立呼吸动画（透明度缓变）
- 碰撞规避算法
- 寿命结束后自然消散 → 再新生

> 每一帧都是独一无二的组合 🌌

</td>
<td width="50%">

### 👁️ 入场即表演
- 卡片通过 `IntersectionObserver` 逐张淡入
- 依次延时入场（`transitionDelay: 0.05 + i * 0.06s`）
- 入场后自动清除延迟，保持后续交互流畅
- 弹窗带缩放 + 淡入双重动画

</td>
</tr>
</table>

## 🏗️ 技术架构

```
📦 ToolPage
├── 📄 index.html              # 主页面骨架
├── 🎨 css/
│   └── style.css              # 完整样式系统（~600行）
│       ├── 毛玻璃卡片系统        .glass-card
│       ├── 光灵系统              #orbContainer + .orb
│       ├── 导航栏 / Hero / 页脚  .navbar / .hero / .footer
│       ├── Toast 提示系统        .toast-container
│       ├── 弹窗 Modal            .modal-overlay / .modal-panel
│       └── 8 个工具 UI           .jt- / .b64- / .ts- / .rx- / .cc- / .qr- / .ic- / .ocr-
├── ⚡ js/
│   ├── main.js                 # 主逻辑（~440行）
│   │   ├── 卡片渲染引擎
│   │   ├── 光灵系统 v4（碰撞/呼吸/morph/生命周期）
│   │   ├── IntersectionObserver 入场动画
│   │   └── Toast 管理器
│   ├── modal.js                # 弹窗管理器
│   └── tools/                  # 工具模块（按需动态加载）
│       ├── base64.js
│       ├── color-converter.js
│       ├── image-compress.js
│       ├── json-formatter.js
│       ├── ocr.js
│       ├── qrcode.js
│       ├── regex-tester.js
│       └── timestamp.js
├── 🖼️ images/
│   └── 像素2.jpg
└── 📝 README.md
```

## 🚀 快速开始

```bash
# 纯静态页面，无需构建！
# 方式一：直接浏览器打开
open index.html

# 方式二：Python 本地服务器
python -m http.server 8000

# 方式三：Node.js
npx serve .
```

## 📜 开源许可

本项目基于 **MIT License** 开源，随意玩耍～

---

<div align="center">

**✧ 夏夜工具集** · 用 ❤️ 和 ✨ 做成

<sub>v1.0 · 持续建设中 🚧</sub>

<br>

[![xiaye.xyz](https://img.shields.io/badge/🌐%20xiaye.xyz-在线访问-7C3AED?style=for-the-badge)](https://xiaye.xyz)

</div>

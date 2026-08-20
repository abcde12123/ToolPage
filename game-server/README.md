# 游戏服务器状态查询工具 - 前端

## 功能特性

- ✅ 三种游戏类型支持：Minecraft Java / Minecraft 基岩版 / Palworld
- ✅ 实时查询服务器状态、延迟、在线玩家数
- ✅ 收藏常用服务器（最多 20 个）
- ✅ 查询历史记录（最多 10 条）
- ✅ 历史趋势图表（7 天 / 30 天）
- ✅ 主题跟随（日间/夜间模式）
- ✅ 响应式布局

## 技术栈

- 纯静态 HTML + CSS + JavaScript
- Chart.js 4.4.1（图表渲染）
- 复用主站毛玻璃样式
- LocalStorage 数据持久化

## 文件结构

```
game-server/
├── index.html      # 主页面
├── style.css       # 样式文件
├── main.js         # 核心逻辑
└── README.md       # 文档
```

## API 配置

默认后端地址：`http://localhost:8500/api/gameserver`

修改 `main.js` 中的 `API_BASE` 变量以更改后端地址。

## 本地运行

1. 确保后端 API 已启动（`E:\gameserver-api`）
2. 直接打开 `index.html` 或通过本地服务器访问
3. 输入服务器地址和端口，点击"查询状态"

## 测试服务器

### Minecraft Java Edition
- **Hypixel**: mc.hypixel.net:25565
- **Wynncraft**: play.wynncraft.com:25565

### Minecraft Bedrock Edition
- **NetherGames**: play.nethergames.org:19132

## 功能说明

### 查询服务器
1. 选择游戏类型 Tab（自动填充默认端口）
2. 输入服务器地址和端口
3. 点击"查询状态"
4. 查看服务器在线状态、延迟、玩家数等信息

### 收藏管理
- 查询成功后点击右上角 ⭐ 按钮添加收藏
- 左侧边栏显示收藏列表
- 点击收藏项自动填充表单
- 点击 × 删除收藏

### 查询历史
- 自动记录最近 10 次查询
- 显示相对时间（刚刚、X 分钟前、X 小时前）
- 点击历史项快速重新查询

### 历史趋势图
- 展示服务器玩家数和延迟的时间趋势
- 支持切换 7 天 / 30 天视图
- 主题颜色自动跟随日间/夜间模式

## 样式特点

- 毛玻璃卡片效果（backdrop-filter: blur）
- 橙色渐变主按钮（#F97316 → #FB923C）
- 平滑过渡动画（cubic-bezier）
- 夜间模式完整支持（深蓝底色 + 浅文字）

## LocalStorage 数据结构

### 收藏列表 (`gs_favorites`)
```json
[
  {
    "game": "minecraft",
    "host": "mc.hypixel.net",
    "port": 25565,
    "name": "Hypixel Network",
    "addedAt": 1705123456789
  }
]
```

### 查询历史 (`gs_history`)
```json
[
  {
    "game": "minecraft",
    "host": "mc.hypixel.net",
    "port": 25565,
    "timestamp": 1705123456789
  }
]
```

## 响应式断点

- **桌面**: ≥ 769px - 左侧边栏 + 右主内容区
- **移动**: ≤ 768px - 单列布局，侧边栏移至底部

## 浏览器兼容性

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- 需要 `backdrop-filter` 支持（毛玻璃效果）

## 已知问题

- 后端 API 未启动时会显示 CORS 错误
- Chart.js 从 CDN 加载，离线环境不可用

## 版本历史

- **v1** (2026-08-19) - 初始版本，基础查询、收藏、历史、图表功能

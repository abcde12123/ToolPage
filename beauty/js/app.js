/**
 * 夏夜美颜相机 · 主程序
 * 采集 -> 检测 -> 美颜流水线 -> 可视化 -> 显示
 * 全部在浏览器本地完成，画面不上传。
 */
import { FaceDetector } from './detector.js?v=8';
import {
    FILTERS, applyBlush, applyEyes, applyFilter, applySlim, applySmooth, applyWhiten,
    computeSkinAlpha, drawHeatmap, drawMesh, faceGate, faceRoi,
} from './effects.js?v=8';
import { drawFacePlane, drawSticker, drawStickerBox, faceFrame, screenToFace } from './ar.js?v=8';
import { builtinStickers, loadCustomSticker } from './stickers.js?v=8';

// ---------------------------------------------------------------- 参数

/** 滑块范围（与桌面版一致：磨皮/美白/红润代码上限 0.8，界面仍显示 0~100%） */
const RANGES = {
    smooth: [0, 0.8], whiten: [0, 0.8], slim: [0, 1], eye: [0, 1], blush: [0, 0.8],
    filterStrength: [0, 1],
    skin_ramp: [0, 1], skin_shadow: [0, 1], skin_dark: [0, 80], skin_feather: [0, 8],
    smooth_radius: [2, 20], smooth_eps: [100, 2000], smooth_keep: [0, 1],
    whiten_lift: [0, 0.8], whiten_warm: [0, 10],
    slim_shift: [0, 0.15], slim_sigma: [0.04, 0.25], eye_gain: [0, 0.45],
    blush_gain: [0, 45], crop_ratio: [0, 0.15],
};

const DEFAULTS = {
    smooth: 0.5, whiten: 0.3, slim: 0, eye: 0, blush: 0,
    filterName: 'none', filterStrength: 0,
    skin_ramp: 0.35, skin_shadow: 0.50, skin_dark: 0, skin_feather: 2.0,
    smooth_radius: 6, smooth_eps: 700, smooth_keep: 0.32,
    whiten_lift: 0.35, whiten_warm: 3.0,
    slim_shift: 0.055, slim_sigma: 0.10, eye_gain: 0.22, blush_gain: 20,
    crop_ratio: 0.04,
    showMesh: false, showPlane: false, showBoxes: false, showHeat: false,
};

const params = Object.assign({}, DEFAULTS);

/** 主滑块 + 各自开关 */
const MAIN_SLIDERS = [
    { name: '美颜', label: '磨皮', key: 'smooth', flag: 'smoothOn', fmt: 'pct' },
    { name: '美颜', label: '美白', key: 'whiten', flag: 'whitenOn', fmt: 'pct' },
    { name: '美颜', label: '瘦脸', key: 'slim', flag: 'slimOn', fmt: 'pct' },
    { name: '美颜', label: '大眼', key: 'eye', flag: 'eyeOn', fmt: 'pct' },
    { name: '美颜', label: '红润', key: 'blush', flag: 'blushOn', fmt: 'pct' },
];

/** 「自定义微调」里的分组滑块 */
const ADVANCED = [
    ['皮肤掩膜', [['边缘淡出', 'skin_ramp', 'pct'], ['阴影保留', 'skin_shadow', 'pct'],
        ['纯黑门槛', 'skin_dark', 'int'], ['羽化半径', 'skin_feather', 'f1']]],
    ['磨皮', [['滤波半径', 'smooth_radius', 'int'], ['平滑强度', 'smooth_eps', 'int'],
        ['细节保留', 'smooth_keep', 'f2']]],
    ['美白', [['提亮', 'whiten_lift', 'f2'], ['去黄加红', 'whiten_warm', 'f1']]],
    ['瘦脸 / 大眼', [['瘦脸推力', 'slim_shift', 'f3'], ['瘦脸范围', 'slim_sigma', 'f2'],
        ['大眼倍率', 'eye_gain', 'f2']]],
    ['红润', [['红润量', 'blush_gain', 'int']]],
    ['画面', [['边缘裁剪', 'crop_ratio', 'pct']]],
];

// ---------------------------------------------------------------- 状态

const video = document.getElementById('btVideo');
const canvas = document.getElementById('btCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const overlay = document.getElementById('btOverlay');
const statusEl = document.getElementById('btStatus');
const panel = document.getElementById('btPanel');
const fpsEl = document.getElementById('btFps');
const facesEl = document.getElementById('btFaces');
const resEl = document.getElementById('btRes');

const work = document.createElement('canvas');          // 处理用画布
const wctx = work.getContext('2d', { willReadFrequently: true });

let detector = null;
let running = false;
let stickers = [];              // 已添加的贴纸 {name,label,img,u,v,size,rot,opacity}
let selected = null;
let dragging = false;
let dragOffset = [0, 0];
let lastFrame = null;           // 完整帧（坐标基准）
let displayInfo = { cropX: 0, cropY: 0, cropW: 0, cropH: 0 };
/** 运行设置（不进预设）：处理分辨率直接影响帧率，可按机器性能调 */
const settings = {
    processWidth: 480,
    // 记住上次选的摄像头（系统里可能存在「手机作为摄像头」等虚拟设备）
    deviceId: (() => { try { return localStorage.getItem('beauty_cam_device') || ''; } catch (e) { return ''; } })(),
};

let currentStream = null;

/** 渲染循环句柄：切换摄像头/重新启动前必须取消，否则会叠加出多个循环 */
let rafId = 0;
/** 启动令牌：只有最新一次 start() 有权收尾，避免并发启动产生双循环 */
let runToken = 0;

let prevFaces = 0;
let fpsAvg = 0;
let lastTime = 0;
let faceMissingSince = 0;

// ---------------------------------------------------------------- 小组件

function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
}

function fmt(value, kind) {
    if (kind === 'pct') return Math.round(value * 100) + '%';
    if (kind === 'int') return String(Math.round(value));
    if (kind === 'f1') return value.toFixed(1);
    if (kind === 'f2') return value.toFixed(2);
    if (kind === 'f3') return value.toFixed(3);
    return String(value);
}

function toast(text, ms = 2600) {
    let t = document.getElementById('btToast');
    if (!t) {
        t = el('div');
        t.id = 'btToast';
        Object.assign(t.style, {
            position: 'fixed', left: '50%', top: '26px', transform: 'translateX(-50%)',
            background: 'rgba(30,34,44,.92)', color: '#fff', padding: '9px 18px',
            borderRadius: '12px', fontSize: '.86rem', zIndex: 999,
            boxShadow: '0 8px 24px rgba(0,0,0,.22)', transition: 'opacity .25s', pointerEvents: 'none',
        });
        document.body.appendChild(t);
    }
    t.textContent = text;
    t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.opacity = '0'; }, ms);
}

// ---------------------------------------------------------------- 滑块

function makeSlider(parent, label, key, kind, narrow) {
    const row = el('div', 'bt-row' + (narrow ? '' : ''));
    const lab = el('label', null, label);
    const range = document.createElement('input');
    range.type = 'range';
    range.min = '0'; range.max = '1000';
    const [lo, hi] = RANGES[key];
    range.value = String(Math.round((params[key] - lo) / (hi - lo) * 1000));
    const num = document.createElement('input');
    num.type = 'text';
    num.className = 'bt-num';
    num.value = fmt(params[key], kind);

    const apply = (v) => {
        const real = Math.min(Math.max(lo + (hi - lo) * v / 1000, lo), hi);
        params[key] = real;
        num.value = fmt(real, kind);
    };
    // 注意：range 的取值是 0~1000，apply 也按 0~1000 解释，
    // 之前多除了一次 1000，导致拖到底也只有 0.1% 的效果（看起来"没反应"）
    range.addEventListener('input', () => apply(Number(range.value)));
    num.addEventListener('change', () => {
        const txt = num.value.trim();
        const pctLike = txt.includes('%');
        let val = parseFloat(txt.replace(/[^0-9.\-]/g, ''));
        if (!isFinite(val)) { num.value = fmt(params[key], kind); return; }
        // 显示侧是 value*100（如 0.5 -> "50%"），解析必须原样除回来，与上限 hi 无关。
        // 之前在磨皮/美白/红润（上限 0.8）上会算成 50/100*0.8 = 0.4，与显示数字对不上。
        if (pctLike) val = val / 100;
        val = Math.min(Math.max(val, lo), hi);
        params[key] = val;
        range.value = String(Math.round((val - lo) / (hi - lo) * 1000));
        num.value = fmt(val, kind);
    });

    row.appendChild(lab); row.appendChild(range); row.appendChild(num);
    parent.appendChild(row);
    return { sync: () => {
        const [l, h] = RANGES[key];
        range.value = String(Math.round((params[key] - l) / (h - l) * 1000));
        num.value = fmt(params[key], kind);
    } };
}

// ---------------------------------------------------------------- 面板构建

const sliders = [];
/** 显示开关（网格/平面/外框/热力图）的复选框引用，供 syncAll 同步 */
const showCtl = {};

function buildPanel() {
    panel.innerHTML = '';

    // ---- 预设 ----
    const presetGroup = el('div', 'bt-group');
    presetGroup.appendChild(el('h3', null, '预设'));
    const pRow = el('div', 'bt-row');
    const select = document.createElement('select');
    select.className = 'bt-btn';
    select.style.flex = '1';
    const fillSelect = () => {
        select.innerHTML = '';
        select.appendChild(new Option('（选择预设）', ''));
        for (const name of listPresets()) select.appendChild(new Option(name, name));
    };
    const btnApply = el('button', 'bt-btn', '应用');
    const btnSave = el('button', 'bt-btn', '保存');
    const btnDel = el('button', 'bt-btn', '删除');
    pRow.append(select, btnApply, btnSave, btnDel);
    presetGroup.appendChild(pRow);
    const pRow2 = el('div', 'bt-row');
    const btnReset = el('button', 'bt-btn', '恢复默认参数');
    pRow2.appendChild(btnReset);
    presetGroup.appendChild(pRow2);
    panel.appendChild(presetGroup);

    btnApply.onclick = () => {
        if (!select.value) { toast('请先选择一个预设'); return; }
        if (applyPreset(select.value)) { syncAll(); toast('已应用预设：' + select.value); }
        else toast('预设不存在');
    };
    btnSave.onclick = () => {
        const name = prompt('预设名称：', '我的风格');
        if (!name || !name.trim()) return;
        savePreset(name.trim());
        fillSelect(); select.value = name.trim();
        toast('已保存预设：' + name.trim());
    };
    btnDel.onclick = () => {
        if (!select.value) return;
        deletePreset(select.value);
        fillSelect();
        toast('已删除预设：' + select.value);
    };
    btnReset.onclick = () => {
        Object.assign(params, DEFAULTS);
        syncAll(); toast('已恢复默认参数');
    };
    fillSelect();

    // ---- 美颜 ----
    const beauty = el('div', 'bt-group');
    beauty.appendChild(el('h3', null, '美颜'));
    for (const s of MAIN_SLIDERS) {
        sliders.push({ key: s.key, ctl: makeSlider(beauty, s.label, s.key, s.fmt) });
    }
    panel.appendChild(beauty);

    // ---- 滤镜 ----
    const filterGroup = el('div', 'bt-group');
    filterGroup.appendChild(el('h3', null, '滤镜'));
    const grid = el('div', 'bt-filters');
    const buttons = {};
    for (const [key, f] of Object.entries(FILTERS)) {
        const b = el('button', 'bt-btn' + (params.filterName === key ? ' bt-btn--on' : ''), f.label);
        b.onclick = () => {
            params.filterName = key;
            if (key !== 'none' && params.filterStrength === 0) params.filterStrength = 0.7;
            for (const k in buttons) buttons[k].classList.toggle('bt-btn--on', k === key);
            syncAll();
        };
        buttons[key] = b;
        grid.appendChild(b);
    }
    filterGroup.appendChild(grid);
    sliders.push({ key: 'filterStrength', ctl: makeSlider(filterGroup, '浓度', 'filterStrength', 'pct') });
    panel.appendChild(filterGroup);
    panel._filterButtons = buttons;

    // ---- 显示 ----
    const disp = el('div', 'bt-group');
    disp.appendChild(el('h3', null, '显示'));
    const checks = el('div', 'bt-checks');
    for (const [key, label] of [['showMesh', '面部网格与关键点'], ['showPlane', '面部平面'],
        ['showBoxes', '贴纸外框'], ['showHeat', '皮肤权重热力图']]) {
        const wrap = el('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = params[key];
        cb.onchange = () => { params[key] = cb.checked; };
        showCtl[key] = cb;
        wrap.appendChild(cb); wrap.appendChild(document.createTextNode(label));
        checks.appendChild(wrap);
    }
    disp.appendChild(checks);

    // 处理分辨率：相机 640x480 下，JS 逐像素处理比较吃 CPU，
    // 默认 480p 在观感与流畅度之间比较均衡。
    const qRow = el('div', 'bt-row');
    qRow.style.marginTop = '8px';
    qRow.appendChild(el('label', null, '画质'));
    const qSel = document.createElement('select');
    qSel.className = 'bt-btn';
    qSel.style.flex = '1';
    for (const [v, label] of [[360, '流畅 360p'], [480, '标准 480p（推荐）'], [640, '高清 640p']]) {
        qSel.appendChild(new Option(label, String(v)));
    }
    qSel.value = String(settings.processWidth);
    qSel.onchange = () => { settings.processWidth = Number(qSel.value); };
    qRow.appendChild(qSel);
    disp.appendChild(qRow);

    // 摄像头选择：系统里可能出现多个视频设备（例如 Windows 的「手机作为摄像头」
    // 或虚拟摄像头），默认那个不一定是我们要的，所以给出手动选择。
    const cRow = el('div', 'bt-row');
    cRow.appendChild(el('label', null, '摄像头'));
    const cSel = document.createElement('select');
    cSel.className = 'bt-btn';
    cSel.style.flex = '1';
    cSel.style.minWidth = '0';
    cSel.appendChild(new Option('（默认设备）', ''));
    cSel.onchange = () => switchCamera(cSel.value);
    const cBtn = el('button', 'bt-btn', '刷新');
    cBtn.title = '重新扫描摄像头设备（插拔设备后可用）';
    cBtn.style.padding = '4px 8px';
    cBtn.onclick = async () => { await refreshCameraList(); toast('已刷新摄像头列表'); };
    cRow.append(cSel, cBtn);
    disp.appendChild(cRow);
    panel._cameraSelect = cSel;

    panel.appendChild(disp);

    // ---- 贴纸 ----
    const stk = el('div', 'bt-group');
    stk.appendChild(el('h3', null, '贴纸（AR）'));
    const stkGrid = el('div', 'bt-stickers');
    const stickerButtons = {};
    for (const [name, s] of Object.entries(builtinStickers())) {
        const b = el('button', 'bt-sticker');
        b.title = s.label;
        const thumb = document.createElement('canvas');
        thumb.width = 40; thumb.height = 40;
        thumb.getContext('2d').drawImage(s.img, 0, 0, 40, 40);
        b.appendChild(thumb);
        b.onclick = () => toggleSticker(name);
        stickerButtons[name] = b;
        stkGrid.appendChild(b);
    }
    stk.appendChild(stkGrid);
    stk._buttons = stickerButtons;

    const stkOps = el('div', 'bt-row');
    const btnCustom = el('button', 'bt-btn', '自定义…');
    const btnRemove = el('button', 'bt-btn', '删除选中');
    const btnClear = el('button', 'bt-btn', '清空');
    const file = document.createElement('input');
    file.type = 'file'; file.accept = 'image/*'; file.style.display = 'none';
    btnCustom.onclick = () => file.click();
    file.onchange = async () => {
        if (!file.files || !file.files[0]) return;
        try {
            const s = await loadCustomSticker(file.files[0]);
            const meta = { name: s.name, label: s.label, img: s.img, placement: s.placement };
            Object.assign(meta, { u: s.placement[0][0], v: s.placement[0][1], size: s.placement[1], rot: 0, opacity: 1 });
            stickers.push(meta);
            selected = meta;
            refreshStickerButtons();
            toast('已添加自定义贴纸');
        } catch (e) { toast('贴纸加载失败'); }
        file.value = '';
    };
    btnRemove.onclick = () => {
        if (!selected) return;
        stickers = stickers.filter(s => s !== selected);
        selected = null;
        refreshStickerButtons(); syncOpacity();
    };
    btnClear.onclick = () => {
        stickers = []; selected = null;
        refreshStickerButtons(); syncOpacity();
    };
    stkOps.append(btnCustom, btnRemove, btnClear, file);
    stk.appendChild(stkOps);

    const opRow = el('div', 'bt-row');
    const opLabel = el('label', null, '透明度');
    opLabel.style.width = '52px';
    const opRange = document.createElement('input');
    opRange.type = 'range'; opRange.min = '0'; opRange.max = '100'; opRange.value = '100';
    const opNum = el('input', 'bt-num', '100');
    opNum.readOnly = true;
    opRange.oninput = () => {
        if (selected) selected.opacity = Number(opRange.value) / 100;
        opNum.value = opRange.value;
    };
    opRow.append(opLabel, opRange, opNum);
    stk.appendChild(opRow);
    stk._opacityRange = opRange; stk._opacityNum = opNum;
    stk.appendChild(el('div', 'bt-hint', '点缩略图添加/移除；画面中拖动移动，滚轮缩放，Shift+滚轮旋转'));
    panel.appendChild(stk);
    panel._stickerGroup = stk;

    // ---- 自定义微调（默认收起）----
    const fold = document.createElement('details');
    fold.className = 'bt-group bt-fold';
    const sum = document.createElement('summary');
    sum.textContent = '自定义微调';
    fold.appendChild(sum);
    for (const [title, items] of ADVANCED) {
        fold.appendChild(el('div', 'bt-sect', title));
        for (const [label, key, kind] of items) {
            sliders.push({ key, ctl: makeSlider(fold, label, key, kind) });
        }
    }
    fold.appendChild(el('div', 'bt-hint', '边缘淡出：磨皮/美白在脸边缘的过渡范围；阴影保留：越大，法令纹等暗部也越多被美白；纯黑门槛：亮度低于此值直接剔除。'));
    panel.appendChild(fold);
}

function syncAll() {
    for (const s of sliders) s.ctl.sync();
    // 复选框也要同步：恢复默认参数/应用预设会改动 showMesh 等，
    // 不同步的话界面还勾着、渲染却不画，看起来像"功能坏了"
    for (const k in showCtl) showCtl[k].checked = !!params[k];
    const fb = panel._filterButtons;
    if (fb) for (const k in fb) fb[k].classList.toggle('bt-btn--on', k === params.filterName);
}

function refreshStickerButtons() {
    const g = panel._stickerGroup;
    if (!g || !g._buttons) return;
    for (const [name, b] of Object.entries(g._buttons)) {
        b.classList.toggle('on', stickers.some(s => s.name === name));
    }
}

function syncOpacity() {
    const g = panel._stickerGroup;
    if (!g) return;
    const v = selected ? Math.round((selected.opacity === undefined ? 1 : selected.opacity) * 100) : 100;
    g._opacityRange.value = String(v);
    g._opacityNum.value = String(v);
}

// ---------------------------------------------------------------- 贴纸操作

function toggleSticker(name) {
    const exist = stickers.find(s => s.name === name);
    if (exist) {
        stickers = stickers.filter(s => s !== exist);
        if (selected === exist) selected = null;
    } else {
        const def = builtinStickers()[name];
        const st = {
            name, label: def.label, img: def.img,
            u: def.placement[0][0], v: def.placement[0][1],
            size: def.placement[1], rot: 0, opacity: 1,
        };
        stickers.push(st);
        selected = st;
    }
    refreshStickerButtons();
    syncOpacity();
}

/**
 * 画布上的鼠标坐标 -> 「完整帧」坐标。
 * 需要补偿两件事：① 显示时的边缘裁剪与缩放；② 画面是水平镜像的（自拍习惯）。
 */
function canvasToFrame(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const nx = (clientX - rect.left) / rect.width;    // 0..1（窗口横坐标）
    const ny = (clientY - rect.top) / rect.height;
    const { cropX, cropY, cropW, cropH } = displayInfo;
    return [cropX + (1 - nx) * cropW, cropY + ny * cropH];   // 镜像：窗口左侧 = 画面右侧
}

canvas.addEventListener('mousedown', (e) => {
    if (!lastFrame || !stickerFrame) return;
    const [fx, fy] = canvasToFrame(e.clientX, e.clientY);
    const [u, v] = screenToFace(stickerFrame, fx, fy);
    let best = null, bestD = 0.6;
    for (const s of stickers) {
        const d = Math.hypot(s.u - u, s.v - v);
        if (d < bestD) { bestD = d; best = s; }
    }
    selected = best;
    syncOpacity();
    refreshStickerButtons();
    if (best) {
        dragging = true;
        dragOffset = [best.u - u, best.v - v];
    }
});
canvas.addEventListener('mousemove', (e) => {
    if (!dragging || !selected || !stickerFrame) return;
    const [fx, fy] = canvasToFrame(e.clientX, e.clientY);
    const [u, v] = screenToFace(stickerFrame, fx, fy);
    selected.u = u + dragOffset[0];
    selected.v = v + dragOffset[1];
});
window.addEventListener('mouseup', () => { dragging = false; });
// 鼠标移出窗口后松开（或切到别的窗口）不会触发 mouseup，补一次复位，
// 否则回来时光标划过画布会继续拖动贴纸
window.addEventListener('blur', () => { dragging = false; });
canvas.addEventListener('wheel', (e) => {
    if (!selected) return;
    e.preventDefault();
    const step = e.deltaY > 0 ? -1 : 1;
    if (e.shiftKey) selected.rot = (selected.rot || 0) + step * 0.1;
    else selected.size = Math.min(Math.max(selected.size * (step > 0 ? 1.08 : 1 / 1.08), 0.15), 6);
}, { passive: false });

// ---------------------------------------------------------------- 预设存储

const LS_KEY = 'xiaye_beauty_presets_v1';

function listPresets() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? Object.keys(JSON.parse(raw)) : [];
    } catch (e) { return []; }
}
function savePreset(name) {
    try {
        const all = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        all[name] = Object.assign({}, params);
        localStorage.setItem(LS_KEY, JSON.stringify(all));
    } catch (e) { toast('保存失败（浏览器存储不可用）'); }
}
function applyPreset(name) {
    try {
        const all = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        if (!all[name]) return false;
        for (const key of Object.keys(DEFAULTS)) {
            if (key in all[name]) params[key] = all[name][key];
        }
        clampParams();
        return true;
    } catch (e) { return false; }
}
function deletePreset(name) {
    try {
        const all = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        delete all[name];
        localStorage.setItem(LS_KEY, JSON.stringify(all));
    } catch (e) { /* ignore */ }
}
function clampParams() {
    for (const key of Object.keys(RANGES)) {
        const [lo, hi] = RANGES[key];
        let v = Number(params[key]);
        if (!isFinite(v)) v = DEFAULTS[key];
        params[key] = Math.min(Math.max(v, lo), hi);
    }
}

// ---------------------------------------------------------------- 渲染循环

let stickerFrame = null;   // 当前帧的面部坐标系（贴纸/拖动用）

function resizeWork(w, h) {
    if (work.width !== w || work.height !== h) { work.width = w; work.height = h; }
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
}

function render(timestamp) {
    if (!running) { rafId = 0; return; }
    rafId = requestAnimationFrame(render);
    if (video.readyState < 2) return;

    // 处理分辨率（可调；JS 逐像素处理较吃 CPU，默认 480p）
    const vw = video.videoWidth, vh = video.videoHeight;
    const pw = Math.min(settings.processWidth, vw || settings.processWidth);
    const ph = Math.round(pw * (vh / (vw || 640))) || 480;
    resizeWork(pw, ph);
    wctx.drawImage(video, 0, 0, pw, ph);

    // ① 检测：传 video（走 GPU 快路径），但把坐标换算到处理画布尺寸，
    //    这样既保持帧率，改了画质后关键点也不会错位
    const faces = detector ? detector.detect(video, timestamp, pw, ph) : [];

    // 人脸丢失提示（连续 ~0.6s 没人脸才提示，避免抖动刷屏）
    if (faces.length === 0 && prevFaces > 0) {
        if (!faceMissingSince) faceMissingSince = timestamp;
        else if (timestamp - faceMissingSince > 600) { toast('人脸丢失'); faceMissingSince = 0; prevFaces = 0; }
    } else if (faces.length > 0) {
        if (prevFaces === 0 && lastTime) toast('检测到人脸');
        faceMissingSince = 0;
        prevFaces = faces.length;
    }

    if (faces.length) {
        const imgData = wctx.getImageData(0, 0, pw, ph);

        // ② 皮肤权重图（半分辨率）+ 脸部闸门
        const roi = faceRoi(faces, pw, ph, 0.25);
        const sk = computeSkinAlpha(work, roi, faces, params);
        const gate = (params.slim > 0) ? faceGate(faces, pw, ph) : null;

        // ③ 效果流水线（顺序与桌面版一致）
        if (params.slim > 0) applySlim(imgData, faces, params, gate);
        if (params.eye > 0) applyEyes(imgData, faces, params);
        if (params.smooth > 0) applySmooth(imgData, sk, params);
        if (params.whiten > 0) applyWhiten(imgData, sk, params);
        if (params.blush > 0) applyBlush(imgData, faces, sk, params);
        if (params.filterName !== 'none' && params.filterStrength > 0) {
            applyFilter(imgData, params.filterName, params.filterStrength);
        }
        wctx.putImageData(imgData, 0, 0);

        // ④ 可视化
        if (params.showHeat) drawHeatmap(wctx, sk, pw, ph);
        const frame = faceFrame(faces[0].landmarks);
        stickerFrame = frame;

        if (frame && (params.showPlane || params.showBoxes || stickers.length)) {
            if (params.showPlane) drawFacePlane(wctx, frame);
            if (params.showBoxes) {
                for (const s of stickers) drawStickerBox(wctx, frame, s, s === selected);
            }
            for (const s of stickers) drawSticker(wctx, frame, s);
        }
        if (params.showMesh) drawMesh(wctx, faces, true);
        else if (params.showPlane || params.showBoxes) drawMesh(wctx, faces, false);

        facesEl.textContent = '人脸 ' + faces.length;
    } else {
        stickerFrame = null;
        // 无人脸时仍画关键点（如果有）
        facesEl.textContent = '人脸 0';
    }

    // ⑤ 边缘裁剪 + 显示（work 始终保留完整帧作为坐标基准）
    lastFrame = work;
    const cr = params.crop_ratio || 0;
    const cx = Math.round(pw * cr), cy = Math.round(ph * cr);
    const cw = Math.max(2, pw - cx * 2), ch = Math.max(2, ph - cy * 2);
    displayInfo = { cropX: cx, cropY: cy, cropW: cw, cropH: ch };
    // 水平镜像（自拍习惯）：用变换镜像，贴纸等叠加内容也一起镜像，与桌面版一致
    ctx.setTransform(-1, 0, 0, 1, canvas.width, 0);
    ctx.drawImage(work, cx, cy, cw, ch, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // ⑥ 状态栏
    if (lastTime) {
        const dt = timestamp - lastTime;
        if (dt > 0) {
            const fps = 1000 / dt;
            fpsAvg = fpsAvg ? fpsAvg * 0.85 + fps * 0.15 : fps;
        }
    }
    lastTime = timestamp;
    fpsEl.textContent = 'FPS ' + fpsAvg.toFixed(1);
    resEl.textContent = `${cw}×${ch}`;
}

// ---------------------------------------------------------------- 启动

/** 在遮罩层上显示启动失败的原因 + 重试按钮 */
function showStartError(hint, detail) {
    const title = document.getElementById('btOverlayTitle');
    const desc = document.getElementById('btOverlayDesc');
    const btn = document.getElementById('btStart');
    if (title) title.textContent = '无法打开摄像头';
    if (desc) desc.textContent = hint;
    if (btn) { btn.disabled = false; btn.textContent = '重试'; }
    statusEl.textContent = detail || '';
    overlay.classList.remove('hidden');
}

async function start() {
    // 并发保护：快速连点「重试」或连续切换摄像头时，旧的那次启动会被新令牌作废
    const myToken = ++runToken;
    const btn = document.getElementById('btStart');
    btn.disabled = true;
    btn.textContent = '正在请求…';
    statusEl.textContent = '正在请求摄像头…';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showStartError('当前浏览器不支持摄像头，或页面不是 https 访问。',
            'navigator.mediaDevices 不可用');
        return;
    }

    let stream;
    try {
        const videoConstraints = { width: { ideal: 640 }, height: { ideal: 480 } };
        if (settings.deviceId) videoConstraints.deviceId = { exact: settings.deviceId };
        stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
    } catch (err) {
        // 已被更新的一次启动取代：本次的失败不再弹提示，避免覆盖新状态
        if (myToken !== runToken) return;
        const name = (err && err.name) || '';
        // 上次记住的摄像头已经不存在了（拔掉了/换设备了）：清掉记录用默认设备重试一次
        if ((name === 'OverconstrainedError' || name === 'NotFoundError') && settings.deviceId) {
            settings.deviceId = '';
            try { localStorage.removeItem('beauty_cam_device'); } catch (e) { /* ignore */ }
            return start();
        }
        let hint;
        if (name === 'NotAllowedError' || name === 'SecurityError') {
            hint = '浏览器拒绝了摄像头权限。请点地址栏左侧的相机图标，把权限改为「允许」后重试。';
        } else if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
            hint = '摄像头被其他程序占用了——常见的是相机/会议软件，或本地那个桌面版美颜程序。'
                + '请先关闭它们（任务管理器里结束 BeautyCam.exe 等），再点重试。';
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
            hint = '没有检测到摄像头设备，请确认设备已连接。';
        } else if (name === 'OverconstrainedError') {
            hint = '摄像头不支持请求的分辨率，可换个浏览器或设备再试。';
        } else {
            hint = '打开摄像头失败：' + ((err && err.message) || name || err);
        }
        showStartError(hint, name ? `${name}: ${(err && err.message) || ''}` : '');
        return;
    }
    // 拿流是异步的：期间如果又发起了一次启动，本次要把刚拿到的流还回去
    if (myToken !== runToken) {
        stream.getTracks().forEach(t => t.stop());
        return;
    }
    // 记下实际使用的设备，并刷新选择器
    try {
        const track = stream.getVideoTracks()[0];
        const id = track && track.getSettings ? track.getSettings().deviceId : '';
        if (id) {
            settings.deviceId = id;
            try { localStorage.setItem('beauty_cam_device', id); } catch (e) { /* ignore */ }
        }
    } catch (e) { /* ignore */ }
    currentStream = stream;
    video.srcObject = stream;
    await video.play().catch(() => { });
    refreshCameraList();

    if (!detector || !detector.landmarker) {
        detector = new FaceDetector('.');
        try {
            const backend = await detector.load((s) => { statusEl.textContent = s; });
            toast('检测器已就绪（' + backend + '）');
        } catch (err) {
            console.error(err);
            // 关键：置回 null，否则「重试」会跳过加载直接起循环，
            // 而 landmarker 永远是 null —— 不刷新页面就再也恢复不了
            detector = null;
            if (currentStream) {
                currentStream.getTracks().forEach(t => t.stop());
                currentStream = null;
            }
            video.srcObject = null;
            if (myToken !== runToken) return;
            statusEl.textContent = '检测器加载失败：' + (err && err.message ? err.message : err);
            btn.disabled = false;
            btn.textContent = '重试';
            return;
        }
    }
    if (myToken !== runToken) return;
    overlay.classList.add('hidden');
    running = true;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(render);
}

/**
 * 刷新「摄像头」下拉框。
 * 注意：**未授予权限时** enumerateDevices 拿不到设备名称（浏览器隐私策略），
 * 此时仍会列出设备条目但用「摄像头 1/2」占位；授权后再刷新就能看到真实名称。
 * 因此页面一打开就调用一次，授权成功后、插拔设备时也会再调用。
 */
async function refreshCameraList() {
    const sel = panel._cameraSelect;
    if (!sel) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    let cams = [];
    try {
        cams = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
    } catch (e) { return; }

    const named = cams.some(c => c.label);
    sel.innerHTML = '';
    sel.appendChild(new Option('（默认设备）', ''));
    cams.forEach((c, i) => sel.appendChild(new Option(c.label || `摄像头 ${i + 1}`, c.deviceId)));

    // 未授权时给一行提示，避免用户以为「只有一个设备」
    if (cams.length > 0 && !named) {
        sel.appendChild(new Option(`（授权后可显示设备名称）`, '__hint__')).disabled = true;
    }
    if (settings.deviceId) sel.value = settings.deviceId;

    // 当前正在使用的设备（流里带的 deviceId）优先选上
    try {
        const track = currentStream && currentStream.getVideoTracks()[0];
        const id = track && track.getSettings ? track.getSettings().deviceId : '';
        if (id && [...sel.options].some(o => o.value === id)) sel.value = id;
    } catch (e) { /* ignore */ }
}

/** 切换摄像头：停掉当前流并用新设备重启 */
async function switchCamera(deviceId) {
    settings.deviceId = deviceId || '';
    try {
        if (settings.deviceId) localStorage.setItem('beauty_cam_device', settings.deviceId);
        else localStorage.removeItem('beauty_cam_device');
    } catch (e) { /* ignore */ }
    if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
        currentStream = null;
    }
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    lastTime = 0;
    // 复位提示/FPS 状态，避免切完摄像头后立刻冒一次「人脸丢失」或 FPS 残留
    prevFaces = 0; faceMissingSince = 0; fpsAvg = 0;
    await start();
}

document.getElementById('btStart').addEventListener('click', start);
buildPanel();
syncAll();

// 页面一打开就先列出设备（未授权时名称是占位的，但至少能先选）
refreshCameraList();
if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', () => refreshCameraList());
}

// 预加载贴纸缩略图（触发像素画生成）
builtinStickers();

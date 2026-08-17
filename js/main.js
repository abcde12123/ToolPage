// 夏夜工具集 - 交互逻辑

// --- 工具卡片数据 ---
var tools = [
    { icon: '🤖', name: 'AI 聊天', desc: '智能 AI 对话助手，随时提问', url: '/ai/' },
    { icon: '📥', name: '文件下载', desc: '访问工具文件下载区', url: '/downloads-public/' },
    { icon: '{}', name: 'JSON 格式化', desc: '格式化、校验、压缩 JSON 数据', file: 'json-formatter.js', initFn: 'initJSONFormatter' },
    { icon: '🔤', name: 'Base64 编解码', desc: '文本与 Base64 互转', file: 'base64.js', initFn: 'initBase64' },
    { icon: '📊', name: '文字统计', desc: '字数/词频/阅读时长一键统计', file: 'text-stats.js', initFn: 'initTextStats' },
    { icon: '📅', name: '日期计算器', desc: '日期差 / 加减推算 / 倒计时，附农历', file: 'date-calculator.js', initFn: 'initDateCalculator' },
    { icon: '🌐', name: 'IP 地址工具', desc: '本机/公网 IP 查询 + 子网计算 + 地址校验', file: 'ip-tool.js', initFn: 'initIpTool' },
    { icon: '📋', name: '文本批量处理', desc: '列表去重/排序/大小写/前后缀/替换/行号', file: 'text-batch.js', initFn: 'initTextBatch' },
    { icon: '👨‍👩‍👧', name: '亲戚称呼计算器', desc: '关系链 → 称呼，含反向他叫我什么', file: 'kin-calc.js', initFn: 'initKinCalc' },
    { icon: '🎨', name: '像素画制作器', desc: '网格画板：铅笔画/橡皮擦/选色/导出 PNG', file: 'pixel-art.js', initFn: 'initPixelArt' },
    { icon: '🕐', name: '时间戳转换', desc: '时间戳与日期格式互转', file: 'timestamp.js', initFn: 'initTimestamp' },
    { icon: '🧪', name: '正则测试器', desc: '在线测试正则表达式匹配结果', file: 'regex-tester.js', initFn: 'initRegexTester' },
    { icon: '🎨', name: '色值转换', desc: 'HEX / RGB / HSL 色值互转', file: 'color-converter.js', initFn: 'initColorConverter' },
    { icon: '📱', name: '二维码生成', desc: '将文本或链接转换成二维码图片', file: 'qrcode.js', initFn: 'initQRCode' },
    { icon: '🛠️', name: '图片工坊', desc: '上传/裁剪/旋转翻转/调色/水印/压缩/格式转换/像素风，一条龙导出', url: '/image-workshop/' },
    { icon: '📄', name: 'PDF 工具箱', desc: '合并多个 PDF / 转图片 / 优化体积，首次打开会加载引擎', file: 'pdf-tools.js', initFn: 'initPdfTools' },
    { icon: '📝', name: '文字识别', desc: 'OCR 识别图片中的文字，快速提取', file: 'ocr.js', initFn: 'initOCR' },
    { icon: '📝', name: 'Markdown 编辑器', desc: '实时预览与导出 HTML', file: 'markdown.js', initFn: 'initMarkdown' },
    { icon: '🔐', name: '密码生成器', desc: '安全随机密码，可配置复杂度', file: 'password.js', initFn: 'initPassword' },
    { icon: '📏', name: '文本差异对比', desc: '两段文本 diff 高亮比较', file: 'text-diff.js', initFn: 'initTextDiff' },
    { icon: '🧮', name: 'Cron 表达式解析', desc: '解析 cron 表达式，查看执行计划', file: 'cron-parser.js', initFn: 'initCronParser' },
    { icon: '🔗', name: 'URL 编解码', desc: 'URL encode / decode 互转', file: 'url-encode.js', initFn: 'initUrlEncode' },
    { icon: '🎲', name: '随机数生成器', desc: 'UUID v4、随机整数与小数', file: 'random-gen.js', initFn: 'initRandomGen' },
    { icon: '📐', name: '单位换算器', desc: '长度/重量/温度/面积/体积/速度', file: 'unit-convert.js', initFn: 'initUnitConvert' },
];

// --- 常用工具置顶：localStorage 记录使用次数，用得多的自动排前面 ---
var TOOLS_ORIGINAL = tools.slice();
var TOOL_USES_KEY = 'tool_uses';

function getToolKey(tool) { return tool.file || tool.url || tool.name; }

function getToolUses() {
    try {
        var s = localStorage.getItem(TOOL_USES_KEY);
        var o = s ? JSON.parse(s) : {};
        return (o && typeof o === 'object') ? o : {};
    } catch (e) { return {}; }
}

function bumpToolUse(tool) {
    try {
        var o = getToolUses();
        var k = getToolKey(tool);
        o[k] = (o[k] || 0) + 1;
        localStorage.setItem(TOOL_USES_KEY, JSON.stringify(o));
    } catch (e) {}
}

function clearToolUses() {
    try { localStorage.removeItem(TOOL_USES_KEY); } catch (e) {}
}

// 稳定降序排序（依赖 ES2019+ 的稳定 Array.sort），次数相同保持原顺序
function sortToolsByUsage(list, uses) {
    return list.slice().sort(function(a, b) {
        return (uses[getToolKey(b)] || 0) - (uses[getToolKey(a)] || 0);
    });
}

// 已加载的工具脚本
var TOOL_LOADED = {};

// --- 渲染卡片 ---
var grid = document.getElementById('toolsGrid');

function buildCard(tool) {
    var card = document.createElement('div');
    card.className = 'glass-card';
    card.innerHTML =
        '<span class="glass-card__icon">' + tool.icon + '</span>' +
        '<h3 class="glass-card__title">' + tool.name + '</h3>' +
        '<p class="glass-card__desc">' + tool.desc + '</p>';

    card.addEventListener('click', function() {
        bumpToolUse(tool);                      // 点击即记录使用次数（只写 localStorage，不实时重排）
        if (tool.url) {
            window.location.href = tool.url;
            return;
        }
        openTool(tool);
    });

    return card;
}

// 按真实渲染位置给卡片打行号（同一 offsetTop 为一行），并标记是否在首屏内；入场动画在进入视口时按行逐张计算
function stampRows() {
    if (!grid) return;
    var rowTop = null, rowIdx = -1, viewH = window.innerHeight;
    grid.querySelectorAll('.glass-card').forEach(function(card) {
        var top = card.offsetTop;
        if (rowTop === null || Math.abs(top - rowTop) > 4) {
            rowIdx++;
            rowTop = top;
        }
        card.dataset.row = rowIdx;
        card.dataset.initial = (card.getBoundingClientRect().top < viewH) ? '1' : '0';   // 首屏内的行
    });
}

// --- 打开工具 ---
function openTool(tool) {
    // 显示模态框并显示加载状态
    ModalManager.open(tool.name, '<div style="text-align:center;padding:40px 0;color:#78716C;">加载中...</div>');

    if (TOOL_LOADED[tool.file]) {
        // 已加载，直接初始化
        var initFn = window[tool.initFn];
        if (typeof initFn === 'function') {
            var bodyEl = document.getElementById('modalBody');
            bodyEl.innerHTML = '';
            initFn(bodyEl);
        } else {
            ModalManager.close();
            showToast('工具初始化失败: ' + tool.name);
        }
        return;
    }

    // 动态加载脚本
    var script = document.createElement('script');
    script.src = '/js/tools/' + tool.file + '?v=30';
    script.onload = function() {
        TOOL_LOADED[tool.file] = true;
        var initFn = window[tool.initFn];
        var bodyEl = document.getElementById('modalBody');
        if (typeof initFn === 'function') {
            bodyEl.innerHTML = '';
            initFn(bodyEl);
        } else {
            bodyEl.innerHTML = '<div style="text-align:center;padding:40px 0;color:#DC2626;">工具加载失败: ' + tool.name + '</div>';
        }
    };
    script.onerror = function() {
        var bodyEl = document.getElementById('modalBody');
        bodyEl.innerHTML = '<div style="text-align:center;padding:40px 0;color:#DC2626;">工具加载失败，请刷新后重试</div>';
        showToast('加载失败: ' + tool.name);
    };
    document.body.appendChild(script);
}

// --- 入场动画：无论首屏还是滚动，同一批进入视口的卡片按行逐张错峰（行内 +0.1s，行间串行） ---
function revealCards(cardsInBatch) {
    // 按行分组（渲染时已打好 dataset.row）
    var byRow = {};
    cardsInBatch.forEach(function(card) {
        var r = card.dataset.row;
        (byRow[r] = byRow[r] || []).push(card);
    });
    var rows = Object.keys(byRow).map(Number).sort(function(a, b) { return a - b; });
    var rowStart = 0;
    rows.forEach(function(r) {
        var cards = byRow[r];
        var isInitial = cards.every(function(c) { return c.dataset.initial === '1'; });
        var leadIn = isInitial ? 0 : 0.2;   // 首屏不加前置延迟；滚动行先顿 0.2s 再开始逐张进场
        cards.forEach(function(card, col) {
            var delay = (rowStart + leadIn + col * 0.1).toFixed(2) + 's';   // 行内 0.1s 逐个出现
            card.style.transitionDelay = delay;
            card.classList.add('visible');
            setTimeout(function() {
                card.style.transitionDelay = '';   // 动画播完清掉错峰，避免 hover 被延迟影响
            }, parseFloat(delay) * 1000 + 450);
            observer.unobserve(card);
        });
        rowStart += leadIn + (cards.length - 1) * 0.1 + 0.35;   // 下一行起始 = 本行首张前置 + 末张动画播完
    });
}

var observer;
if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(function(entries) {
        var batch = [];
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                batch.push(entry.target);
            }
        });
        if (batch.length) {
            revealCards(batch);
        }
    }, { threshold: 0.1 });
}

// 重渲染网格：按使用次数排序重建卡片（初始载入 / 点击重置时调用）
function reRenderGrid(animate) {
    if (!grid) return;
    grid.innerHTML = '';
    sortToolsByUsage(tools, getToolUses()).forEach(function(tool) {
        grid.appendChild(buildCard(tool));
    });
    stampRows();
    grid.querySelectorAll('.glass-card').forEach(function(card) {
        if (animate && observer) {
            observer.observe(card);           // 走 IO→revealCards（初始载入行为不变）
        } else {
            card.classList.add('visible');     // 重置/排序后直接可见，不重跑入场动画
            card.style.transitionDelay = '';
        }
    });
}
reRenderGrid(true);

// 重置排序：清空使用次数回到原始顺序（低调按钮在「关于」区）
var resetSortBtn = document.getElementById('resetSort');
if (resetSortBtn) {
    resetSortBtn.addEventListener('click', function() {
        clearToolUses();
        reRenderGrid(false);
        if (typeof showToast === 'function') {
            showToast('已恢复默认排序');
        }
    });
}

// --- ✦ 神秘光灵系统 v3 — 不规则 Blob + 碰撞规避 ---

// ---- 公用工具函数（提取以供测试） ----
function orbRand(min, max) { return Math.random() * (max - min) + min; }
function orbRandInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function randomBlobRadius() {
    var lastVals = null;
    for (var attempt = 0; attempt < 20; attempt++) {
        var vals = [];
        for (var i = 0; i < 8; i++) {
            vals.push(orbRandInt(10, 90));
        }
        var sum = 0;
        for (var i = 0; i < 8; i++) { sum += vals[i]; }
        var mean = sum / 8;
        var variance = 0;
        for (var i = 0; i < 8; i++) { variance += (vals[i] - mean) * (vals[i] - mean); }
        variance /= 8;
        if (Math.sqrt(variance) >= 15) {
            return vals[0] + '% ' + vals[1] + '% ' + vals[2] + '% ' + vals[3] + '% / ' +
                   vals[4] + '% ' + vals[5] + '% ' + vals[6] + '% ' + vals[7] + '%';
        }
        lastVals = vals;
    }
    return lastVals[0] + '% ' + lastVals[1] + '% ' + lastVals[2] + '% ' + lastVals[3] + '% / ' +
           lastVals[4] + '% ' + lastVals[5] + '% ' + lastVals[6] + '% ' + lastVals[7] + '%';
}

function isCollidingOrb(left, top, size, placedOrbs) {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var cx = left / 100 * vw + size / 2;
    var cy = top / 100 * vh + size / 2;
    var r = size / 2;
    for (var i = 0; i < placedOrbs.length; i++) {
        var o = placedOrbs[i];
        var ocx = o.left / 100 * vw + o.size / 2;
        var ocy = o.top / 100 * vh + o.size / 2;
        var or = o.size / 2;
        var dx = cx - ocx;
        var dy = cy - ocy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < (r + or) * 0.85) {
            return true;
        }
    }
    return false;
}

function findNonCollidingPosition(size, placedOrbs) {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    // Guard: if viewport dimensions are invalid, fall back to random position
    if (!(vw > 0) || !(vh > 0)) {
        return { left: orbRand(0, 80), top: orbRand(0, 80) };
    }
    var bestPos = null;
    var bestDist = -1;
    for (var attempt = 0; attempt < 50; attempt++) {
        var left = orbRand(0, 80);
        var top = orbRand(0, 80);
        if (!isCollidingOrb(left, top, size, placedOrbs)) {
            return { left: left, top: top };
        }
        // Calculate distance to nearest orb for fallback
        var cx = left / 100 * vw + size / 2;
        var cy = top / 100 * vh + size / 2;
        var minDist = Infinity;
        for (var i = 0; i < placedOrbs.length; i++) {
            var o = placedOrbs[i];
            var ocx = o.left / 100 * vw + o.size / 2;
            var ocy = o.top / 100 * vh + o.size / 2;
            var dx = cx - ocx;
            var dy = cy - ocy;
            var d = Math.sqrt(dx * dx + dy * dy);
            if (d < minDist) minDist = d;
        }
        if (minDist > bestDist) {
            bestDist = minDist;
            bestPos = { left: left, top: top };
        }
    }
    return bestPos || { left: orbRand(0, 80), top: orbRand(0, 80) };
}

function removeOrbFromArray(id, arr) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i].id === id) {
            arr.splice(i, 1);
            return true;
        }
    }
    return false;
}

(function() {
    var container = document.getElementById('orbContainer');
    if (!container) return;
    var palette = [
        { c1: [220, 200, 255], c2: [255, 218, 230] },  // 淡紫 → 浅粉
        { c1: [200, 230, 255], c2: [220, 210, 255] },  // 浅蓝 → 淡紫
        { c1: [210, 245, 220], c2: [200, 230, 255] },  // 浅薄荷 → 浅蓝
        { c1: [255, 228, 200], c2: [255, 218, 230] },  // 浅杏 → 浅粉
        { c1: [230, 210, 255], c2: [210, 240, 250] },  // 淡丁香 → 浅天蓝
        { c1: [255, 218, 230], c2: [255, 240, 210] },  // 浅粉 → 浅奶油
        { c1: [210, 240, 250], c2: [220, 200, 255] },  // 浅天蓝 → 淡紫
        { c1: [255, 235, 210], c2: [210, 245, 220] },  // 浅蜜桃 → 浅薄荷
    ];

    // ---- 光灵系统 v4 — 死亡触发式自然循环 + 柔和呼吸 ----
    var MAX_ORBS = 8;
    var activeOrbCount = 0;
    var placedOrbs = [];
    var nextOrbId = 0;

    // ---- 柔和呼吸（JS 定时器 + CSS transition，不冲突） ----
    function startBreathing(el) {
        var timer;
        var low = false;
        function tick() {
            if (!el.parentNode) return;
            low = !low;
            el.style.transition = 'opacity ' + orbRand(2, 4) + 's ease';
            el.style.opacity = low ? '0.95' : '1';
            timer = setTimeout(tick, orbRand(3000, 6000));
        }
        timer = setTimeout(tick, orbRand(2000, 5000));
        return function() { clearTimeout(timer); };
    }

    // ---- 死亡后延迟 1-2 秒补一个 ----
    function scheduleNextSpawn() {
        setTimeout(function() {
            if (activeOrbCount < MAX_ORBS) {
                createOrb();
            }
        }, orbRand(1500, 3000));
    }

    function createOrb() {
        if (activeOrbCount >= MAX_ORBS) return;

        // ---- 光团容器 ----
        var orb = document.createElement('div');
        orb.className = 'orb';

        var pair = palette[Math.floor(Math.random() * palette.length)];
        var c1 = pair.c1, c2 = pair.c2;
        var size = orbRand(200, 300);

        // ---- 碰撞检测位置 ----
        var pos = findNonCollidingPosition(size, placedOrbs);
        var left = pos.left;
        var top = pos.top;
        var orbId = nextOrbId++;
        placedOrbs.push({ id: orbId, left: left, top: top, size: size });

        orb.style.width = size + 'px';
        orb.style.height = size + 'px';
        orb.style.left = left + '%';
        orb.style.top = top + '%';

        // ---- 多层内层：每层独立动画，叠加出融合消解感 ----
        var layers = [];
        var layerCount = orbRandInt(2, 3);

        for (var li = 0; li < layerCount; li++) {
            var inner = document.createElement('div');
            inner.className = 'orb-inner';

            var cx = orbRand(20, 80), cy = orbRand(20, 80);
            var mix = orbRand(0.2, 0.8);
            var r = Math.round(c1[0] * (1 - mix) + c2[0] * mix);
            var g = Math.round(c1[1] * (1 - mix) + c2[1] * mix);
            var b = Math.round(c1[2] * (1 - mix) + c2[2] * mix);
            var alpha = orbRand(0.5, 0.8);

            inner.style.background = 'radial-gradient(circle at ' + cx + '% ' + cy + '%, ' +
                'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ') 0%, ' +
                'rgba(' + r + ',' + g + ',' + b + ',' + (alpha * 0.8) + ') 35%, ' +
                'rgba(' + r + ',' + g + ',' + b + ',' + (alpha * 0.3) + ') 55%, ' +
                'transparent 75%)';

            var scale = orbRand(0.5, 1.0);
            var blurAmt = orbRand(25, 60);
            var rot = orbRand(0, 360);
            var blobRadius = randomBlobRadius();

            inner.style.transform = 'scale(' + scale + ') rotate(' + rot + 'deg)';
            inner.style.filter = 'blur(' + blurAmt + 'px)';
            inner.style.borderRadius = blobRadius;
            inner.style.opacity = '0';
            var fadeDur = orbRand(2.0, 3.0);                    // 记录淡入时长，morph 覆盖 transition 时保留 opacity
            inner.style.transition = 'opacity ' + fadeDur + 's ease';

            orb.appendChild(inner);
            layers.push({
                el: inner,
                baseScale: scale,
                baseBlur: blurAmt,
                baseRot: rot,
                blobRadius: blobRadius,
                fadeDur: fadeDur,
                stopBreath: null,
            });
        }

        // ---- 方向与速度：直线运动 ----
        var angle = orbRand(0, Math.PI * 2);
        var speed = orbRand(4, 6);
        var lifespanMs = orbRand(3500, 7000);
        var dist = speed * lifespanMs / 1000;
        var dx = Math.cos(angle) * dist;
        var dy = Math.sin(angle) * dist;

        orb.style.transform = 'translate(0, 0)';
        container.appendChild(orb);
        activeOrbCount++;

        // ---- ★ 渐入 + 启动运动 ----
        setTimeout(function() {
            for (var i = 0; i < layers.length; i++) {
                var L = layers[i];
                L.el.style.opacity = '1';
            }
            orb.style.transition = 'transform ' + lifespanMs + 'ms linear';
            orb.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';

            // 渐入完成后再启动呼吸（此时 opacity=1 稳定了）
            setTimeout(function() {
                for (var i = 0; i < layers.length; i++) {
                    layers[i].stopBreath = startBreathing(layers[i].el);
                }
            }, 1800);
        }, 50);

        // ---- ★ 一次呼吸 morph（寿命内只变一次形状） ----
        var morphTimer = setTimeout(function() {
            if (!orb.parentNode) return;
            for (var i = 0; i < layers.length; i++) {
                var L = layers[i];
                var newBlobRadius = randomBlobRadius();
                // 保留 opacity 过渡：morph 若在淡入途中触发，不把淡入掐断（否则光球会突然变亮）
                L.el.style.transition = 'transform 2s ease, border-radius 3s ease, opacity ' + L.fadeDur + 's ease';
                L.el.style.transform = 'scale(' + L.baseScale * orbRand(0.6, 1.5) + ') rotate(' + orbRand(0, 360) + 'deg)';
                L.el.style.borderRadius = newBlobRadius;
            }
        }, orbRand(500, lifespanMs - 500));

        // ---- ★ 渐出 & 移除 — 死亡后触发繁衍 ----
        setTimeout(function() {
            clearTimeout(morphTimer);
            for (var i = 0; i < layers.length; i++) {
                var L = layers[i];
                if (L.stopBreath) L.stopBreath();          // 停止呼吸定时器
                L.el.style.transition = 'opacity ' + orbRand(1.5, 2.5) + 's ease';
                L.el.style.opacity = '0';
            }
            setTimeout(function() {
                if (orb.parentNode) {
                    container.removeChild(orb);
                    removeOrbFromArray(orbId, placedOrbs);
                    activeOrbCount--;
                    scheduleNextSpawn();  // ✨ 死一个补一个
                }
            }, 2500);
        }, lifespanMs);
    }

    // ---- 初始直接生成 3 个，陆续再补 5 个 ----
    // 初始 3 个错开出生（0→0.7→1.4s 起，各加随机抖动），避免同批同时出现形成"一波一波"
    for (var i = 0; i < 3; i++) {
        (function(idx) {
            setTimeout(function() { createOrb(); }, idx * 700 + orbRand(0, 400));
        })(i);
    }
    var initialSpawned = 3;
    function spawnInitial() {
        if (initialSpawned >= MAX_ORBS) return;
        createOrb();
        initialSpawned++;
        if (initialSpawned < MAX_ORBS) {
            setTimeout(spawnInitial, orbRand(500, 1500));
        }
    }
    if (initialSpawned < MAX_ORBS) { setTimeout(spawnInitial, orbRand(300, 800)); }
})();

// --- Toast 提示 ---
var toastContainer;
if (document.body) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
}

function showToast(text) {
    if (!toastContainer) return;
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = text;
    toastContainer.appendChild(toast);
    setTimeout(function() {
        toast.classList.add('removing');
        toast.addEventListener('animationend', function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        });
    }, 2500);
}

// --- 页脚年份 ---
var yearEl = document.getElementById('year');
if (yearEl) {
    yearEl.textContent = '' + new Date().getFullYear();
}

// --- ✦ 星空夜幕模式：19:00 自动切夜 / 06:00 自动切日；手动切换当天锁定优先，次日重开重新按时间定 ---
var THEME_KEY = 'theme_night';
var THEME_MANUAL_KEY = 'theme_manual_date';

function isNight() { return document.body && document.body.classList.contains('night'); }

// 今天是否手动锁定过主题：是则返回偏好 '1'/'0'，否则 null（跨天自动解锁回到自动）
function getManualPref() {
    try {
        var md = localStorage.getItem(THEME_MANUAL_KEY);
        if (!md) return null;
        var now = new Date();
        var today = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
        if (md !== today) {
            localStorage.removeItem(THEME_MANUAL_KEY);   // 跨天解锁，回到自动
            return null;
        }
        var v = localStorage.getItem(THEME_KEY);
        return (v === '1' || v === '0') ? v : null;
    } catch (e) { return null; }
}

// 按时间自动判定：19:00 - 次日 06:00 为夜间
function isNightByClock() {
    var h = new Date().getHours();
    return (h >= 19 || h < 6);
}

// on: 是否夜间；manual: 是否用户手动切换（手动会锁定今天，当天不再被自动覆盖）
function applyNight(on, manual) {
    if (!document.body) return;
    document.body.classList.toggle('night', on);
    var btn = document.getElementById('btnTheme');
    if (btn) {
        btn.textContent = on ? '☀️' : '🌙';
        btn.title = on ? '切换日间模式' : '切换夜间模式';
    }
    try {
        localStorage.setItem(THEME_KEY, on ? '1' : '0');
        if (manual) {
            var now = new Date();
            localStorage.setItem(THEME_MANUAL_KEY, now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate());
        }
    } catch (e) {}
}

// 黄昏渐变：切换瞬间挂 theme-transition class（CSS 让背景/文字 0.35s 平滑过渡），1.5s 后移除，不影响日常 hover 动画
// （1.5s 需 ≥ 光球夜→昼淡入总时长 0.5s 延迟 + 0.8s 时长 = 1.3s，否则 class 提前移除会让光球瞬跳）
function applyNightWithTransition(on) {
    if (!document.body) { applyNight(on, true); return; }
    document.body.classList.add('theme-transition');
    applyNight(on, true);
    setTimeout(function() {
        if (document.body) document.body.classList.remove('theme-transition');
    }, 1500);
}

var btnTheme = document.getElementById('btnTheme');
if (btnTheme) {
    btnTheme.addEventListener('click', function() {
        applyNightWithTransition(!isNight());   // 手动切换 → 锁定今天
    });
}

// 初始化：今天已手动锁定 → 恢复手动偏好；否则按当前时间自动定初始（不锁定，次日重新判定）
var manualPref = getManualPref();
if (manualPref !== null) {
    applyNight(manualPref === '1', false);
} else {
    applyNight(isNightByClock(), false);
}

// --- 导航栏：平滑滚动 + 滚动高亮 ---
(function() {
    var navbar = document.getElementById('navbar');
    if (!navbar) return;

    var links = navbar.querySelectorAll('.navbar__link[data-section]');
    var sections = {};
    var sectionIds = [];

    links.forEach(function(link) {
        var id = link.getAttribute('data-section');
        var el = document.getElementById(id);
        if (el) {
            sections[id] = { link: link, el: el };
            sectionIds.push(id);
        }
    });

    if (sectionIds.length === 0) return;

    links.forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            var id = link.getAttribute('data-section');
            var target = document.getElementById(id);
            if (target) {
                var offset = navbar.offsetHeight;
                var top = target.getBoundingClientRect().top + window.pageYOffset - offset + 1;
                window.scrollTo({ top: top, behavior: 'smooth' });
            }
        });
    });

    var ticking = false;
    function updateActive() {
        var scrollY = window.pageYOffset;
        var offset = navbar.offsetHeight + 2;
        var current = sectionIds[0];

        for (var i = sectionIds.length - 1; i >= 0; i--) {
            var el = sections[sectionIds[i]].el;
            if (el.offsetTop - offset <= scrollY + 1) {
                current = sectionIds[i];
                break;
            }
        }

        links.forEach(function(link) {
            var isActive = link.getAttribute('data-section') === current;
            link.classList.toggle('active', isActive);
        });
    }

    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(function() {
                updateActive();
                ticking = false;
            });
            ticking = true;
        }
    });

    updateActive();
})();

// 导出供 Jest 单元测试
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        orbRand: orbRand,
        orbRandInt: orbRandInt,
        randomBlobRadius: randomBlobRadius,
        isCollidingOrb: isCollidingOrb,
        findNonCollidingPosition: findNonCollidingPosition,
        removeOrbFromArray: removeOrbFromArray,
        // 主题
        isNight: isNight,
        applyNight: applyNight,
        getManualPref: getManualPref,
        isNightByClock: isNightByClock,
        // 工具置顶
        getToolKey: getToolKey,
        getToolUses: getToolUses,
        bumpToolUse: bumpToolUse,
        clearToolUses: clearToolUses,
        sortToolsByUsage: sortToolsByUsage,
    };
}

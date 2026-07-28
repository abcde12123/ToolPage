// 夏夜工具集 - 交互逻辑

// --- 工具卡片数据 ---
var tools = [
    { icon: '{}', name: 'JSON 格式化', desc: '格式化、校验、压缩 JSON 数据', file: 'json-formatter.js', initFn: 'initJSONFormatter' },
    { icon: '🔤', name: 'Base64 编解码', desc: '文本与 Base64 互转', file: 'base64.js', initFn: 'initBase64' },
    { icon: '🕐', name: '时间戳转换', desc: '时间戳与日期格式互转', file: 'timestamp.js', initFn: 'initTimestamp' },
    { icon: '🧪', name: '正则测试器', desc: '在线测试正则表达式匹配结果', file: 'regex-tester.js', initFn: 'initRegexTester' },
    { icon: '🎨', name: '色值转换', desc: 'HEX / RGB / HSL 色值互转', file: 'color-converter.js', initFn: 'initColorConverter' },
    { icon: '📱', name: '二维码生成', desc: '将文本或链接转换成二维码图片', file: 'qrcode.js', initFn: 'initQRCode' },
    { icon: '🖼️', name: '图片压缩', desc: '智能压缩图片，保持清晰度的同时缩小体积', file: 'image-compress.js', initFn: 'initImageCompress' },
    { icon: '📝', name: '文字识别', desc: 'OCR 识别图片中的文字，快速提取', file: 'ocr.js', initFn: 'initOCR' },
];

// 已加载的工具脚本
var TOOL_LOADED = {};

// --- 渲染卡片 ---
var grid = document.getElementById('toolsGrid');
tools.forEach(function(tool, index) {
    var card = document.createElement('div');
    card.className = 'glass-card';
    var delay = 0.05 + index * 0.06;
    card.style.transitionDelay = delay + 's';
    card.innerHTML =
        '<span class="glass-card__icon">' + tool.icon + '</span>' +
        '<h3 class="glass-card__title">' + tool.name + '</h3>' +
        '<p class="glass-card__desc">' + tool.desc + '</p>';

    card.addEventListener('click', function() {
        openTool(tool);
    });

    grid.appendChild(card);
});

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
    script.src = '/js/tools/' + tool.file + '?v=13';
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

// --- 入场动画 + 清除 transitionDelay ---
function onCardVisible(entry) {
    var card = entry.target;
    card.classList.add('visible');
    setTimeout(function() {
        card.style.transitionDelay = '';
        card.style.transitionDuration = '0.35s';
    }, 400);
    observer.unobserve(card);
}

var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
        if (entry.isIntersecting) {
            onCardVisible(entry);
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.glass-card').forEach(function(card) {
    observer.observe(card);
});

if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.glass-card').forEach(function(card) {
        card.classList.add('visible');
        card.style.transitionDelay = '';
    });
}

// --- ✦ 神秘光灵系统 v3 — 不规则 Blob + 碰撞规避 ---
(function() {
    var container = document.getElementById('orbContainer');
    var palette = [
        { c1: [167, 139, 250], c2: [232, 121, 249] },  // 紫罗兰 → 品紫
        { c1: [244, 114, 182], c2: [251, 146,  60] },  // 粉 → 暖橙
        { c1: [ 96, 165, 250], c2: [129, 140, 248] },  // 天蓝 → 靛蓝
        { c1: [ 52, 211, 153], c2: [167, 139, 250] },  // 翠绿 → 淡紫
        { c1: [251, 146,  60], c2: [244, 114, 182] },  // 暖橙 → 粉
        { c1: [129, 140, 248], c2: [ 96, 165, 250] },  // 靛蓝 → 天蓝
    ];

    function rand(min, max) { return Math.random() * (max - min) + min; }
    function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

    // ---- 不规则 Blob 半径生成 ----
    function randomBlobRadius() {
        var vals = [];
        for (var i = 0; i < 8; i++) {
            vals.push(randInt(20, 80));
        }
        // 不规则度检查：标准差过低则重新生成
        var sum = 0;
        for (var i = 0; i < 8; i++) { sum += vals[i]; }
        var mean = sum / 8;
        var variance = 0;
        for (var i = 0; i < 8; i++) { variance += (vals[i] - mean) * (vals[i] - mean); }
        variance /= 8;
        if (Math.sqrt(variance) < 15) {
            return randomBlobRadius();
        }
        return vals[0] + '% ' + vals[1] + '% ' + vals[2] + '% ' + vals[3] + '% / ' +
               vals[4] + '% ' + vals[5] + '% ' + vals[6] + '% ' + vals[7] + '%';
    }

    // ---- 位置追踪 ----
    var placedOrbs = [];
    var activeOrbCount = 0;
    var gridIndex = 0;

    // ---- 碰撞检测 ----
    function isColliding(left, top, size) {
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
            if (dist < (r + or) * 0.7) {
                return true;
            }
        }
        return false;
    }

    function createOrb() {
        if (activeOrbCount >= 12) return;

        // ---- 光团容器 ----
        var orb = document.createElement('div');
        orb.className = 'orb';

        var pair = palette[Math.floor(Math.random() * palette.length)];
        var c1 = pair.c1, c2 = pair.c2;
        var size = rand(200, 420);

        // ---- 位置计算 ----
        var left, top;
        if (gridIndex < 8) {
            // 分层网格初始放置：4x2 网格
            var col = gridIndex % 4;
            var row = Math.floor(gridIndex / 4);
            var cellLeft = col * 25;
            var cellTop = row * 50;
            left = cellLeft + rand(0, 25);
            top = cellTop + rand(0, 50);
            gridIndex++;
        } else {
            // 持续生成：碰撞规避，最多重试 5 次
            var rangeMin = size > 320 ? 5 : 0;
            var rangeMax = size > 320 ? 80 : 85;
            var attempts = 0;
            do {
                left = rand(rangeMin, rangeMax);
                top = rand(rangeMin, rangeMax);
                attempts++;
            } while (attempts < 5 && isColliding(left, top, size));
        }

        orb.style.width = size + 'px';
        orb.style.height = size + 'px';
        orb.style.left = left + '%';
        orb.style.top = top + '%';

        // ---- 多层内层：每层独立动画，叠加出融合消解感 ----
        var layers = [];
        var layerCount = randInt(2, 3);

        for (var li = 0; li < layerCount; li++) {
            var inner = document.createElement('div');
            inner.className = 'orb-inner';

            var cx = rand(20, 80), cy = rand(20, 80);
            var mix = rand(0.2, 0.8);
            var r = Math.round(c1[0] * (1 - mix) + c2[0] * mix);
            var g = Math.round(c1[1] * (1 - mix) + c2[1] * mix);
            var b = Math.round(c1[2] * (1 - mix) + c2[2] * mix);
            var alpha = rand(0.25, 0.55);

            inner.style.background = 'radial-gradient(circle at ' + cx + '% ' + cy + '%, ' +
                'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ') 0%, ' +
                'rgba(' + r + ',' + g + ',' + b + ',' + (alpha * 0.5) + ') 30%, ' +
                'rgba(' + r + ',' + g + ',' + b + ',' + (alpha * 0.15) + ') 55%, ' +
                'transparent 75%)';

            var scale = rand(0.5, 1.0);
            var blurAmt = rand(25, 60);
            var rot = rand(0, 360);
            var blobRadius = randomBlobRadius();

            inner.style.transform = 'scale(' + scale + ') rotate(' + rot + 'deg)';
            inner.style.filter = 'blur(' + blurAmt + 'px)';
            inner.style.borderRadius = blobRadius;
            inner.style.opacity = '0';
            inner.style.transition = 'opacity ' + rand(2.5, 5) + 's ease';

            orb.appendChild(inner);
            layers.push({
                el: inner,
                baseScale: scale,
                baseBlur: blurAmt,
                baseRot: rot,
                cx: cx, cy: cy,
                r: r, g: g, b: b,
                alpha: alpha,
                blobRadius: blobRadius,
            });
        }

        // ---- 初始位移 ----
        var driftX = rand(-50, 50);
        var driftY = rand(-50, 50);
        orb.style.transform = 'translate(' + driftX + 'px, ' + driftY + 'px)';

        container.appendChild(orb);

        // ---- 追踪位置 ----
        var posRecord = { left: left, top: top, size: size };
        placedOrbs.push(posRecord);
        activeOrbCount++;

        // ---- ★ 渐入 ----
        setTimeout(function() {
            for (var i = 0; i < layers.length; i++) {
                layers[i].el.style.opacity = '1';
            }
        }, 50);

        // ---- ★ 持续呼吸动画：每层独立变化 ----
        function scheduleBreath() {
            if (!orb.parentNode) return;

            for (var i = 0; i < layers.length; i++) {
                var L = layers[i];
                var newScale = L.baseScale * rand(0.6, 1.5);
                var newBlur = rand(15, 70);
                var newRot = L.baseRot + rand(-40, 40);
                var newBlobRadius = randomBlobRadius();
                var durScale = rand(4, 9);
                var durBlur = rand(3, 7);
                var durBlob = rand(6, 12);

                L.el.style.transition = 'transform ' + durScale + 's cubic-bezier(0.25, 0.1, 0.25, 1), ' +
                    'filter ' + durBlur + 's ease, ' +
                    'border-radius ' + durBlob + 's ease';
                L.el.style.transform = 'scale(' + newScale + ') rotate(' + newRot + 'deg)';
                L.el.style.filter = 'blur(' + newBlur + 'px)';
                L.el.style.borderRadius = newBlobRadius;
            }

            // 整体缓慢漂移
            driftX += rand(-30, 30);
            driftY += rand(-30, 30);
            driftX = Math.max(-120, Math.min(120, driftX));
            driftY = Math.max(-120, Math.min(120, driftY));
            orb.style.transition = 'transform ' + rand(8, 14) + 's cubic-bezier(0.25, 0.1, 0.25, 1)';
            orb.style.transform = 'translate(' + driftX + 'px, ' + driftY + 'px)';

            breathTimer = setTimeout(scheduleBreath, rand(3000, 7000));
        }

        var breathTimer = setTimeout(scheduleBreath, rand(2000, 4000));

        // ---- ★ 渐出 & 消解 ----
        var lifespan = rand(18000, 35000);
        setTimeout(function() {
            clearTimeout(breathTimer);
            // 消解效果：模糊增大 + 透明度渐降
            for (var i = 0; i < layers.length; i++) {
                var L = layers[i];
                L.el.style.transition = 'opacity ' + rand(3, 5) + 's ease, filter 4s ease, transform 4s ease, border-radius 4s ease';
                L.el.style.opacity = '0';
                L.el.style.filter = 'blur(' + rand(60, 100) + 'px)';
                L.el.style.transform = 'scale(' + rand(1.2, 1.8) + ') rotate(' + rand(0, 360) + 'deg)';
                L.el.style.borderRadius = '50%';
            }
            setTimeout(function() {
                if (orb.parentNode) {
                    container.removeChild(orb);
                    activeOrbCount--;
                    var pi = placedOrbs.indexOf(posRecord);
                    if (pi !== -1) placedOrbs.splice(pi, 1);
                }
            }, 6000);
        }, lifespan);
    }

    // ---- 初始生成：错峰出现（分层网格） ----
    gridIndex = 0;
    for (var i = 0; i < 8; i++) {
        setTimeout(createOrb, i * 600 + rand(0, 300));
    }

    // ---- 持续生成新光灵 ----
    setInterval(function() {
        createOrb();
    }, rand(1200, 3000));
})();

// --- Toast 提示 ---
var toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
document.body.appendChild(toastContainer);

function showToast(text) {
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
document.getElementById('year').textContent = '' + new Date().getFullYear();

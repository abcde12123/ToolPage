// 夏夜工具集 - 图片工坊 (ES5)
// 独立整页工作台：上传 → 裁剪/旋转翻转/调色/水印 → 压缩/格式转换/像素风 → 导出一条龙
// 纯前端 canvas 处理，零依赖，数据不出浏览器
// 复用自 image-format.js / image-compress.js / pdf-tools.js 的核心函数
//（AVIF 探测、toBlob 包装、buildIco、拖拽绑定、竞态版本守卫、rAF 节流）

(function () {

    // ============ 依赖工具函数（本页独立，不依赖主站 main.js / modal.js）============

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        var units = ['B', 'KB', 'MB', 'GB'];
        var i = Math.floor(Math.log(bytes) / Math.log(1024));
        if (i >= units.length) i = units.length - 1;
        return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
    }

    var toastContainer = null;
    function showToast(text) {
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        var toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = text;
        toastContainer.appendChild(toast);
        setTimeout(function () {
            toast.classList.add('removing');
            toast.addEventListener('animationend', function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            });
        }, 2500);
    }

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ============ 主题跟随（复制自 main.js L539-608，去掉导航栏相关，键名保持一致可跨页联动）============

    var THEME_KEY = 'theme_night';
    var THEME_MANUAL_KEY = 'theme_manual_date';

    function isNight() { return document.body && document.body.classList.contains('night'); }

    function getManualPref() {
        try {
            var md = localStorage.getItem(THEME_MANUAL_KEY);
            if (!md) return null;
            var now = new Date();
            var today = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
            if (md !== today) {
                localStorage.removeItem(THEME_MANUAL_KEY);
                return null;
            }
            var v = localStorage.getItem(THEME_KEY);
            return (v === '1' || v === '0') ? v : null;
        } catch (e) { return null; }
    }

    function isNightByClock() {
        var h = new Date().getHours();
        return (h >= 19 || h < 6);
    }

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

    function applyNightWithTransition(on) {
        if (!document.body) { applyNight(on, true); return; }
        document.body.classList.add('theme-transition');
        applyNight(on, true);
        setTimeout(function () {
            if (document.body) document.body.classList.remove('theme-transition');
        }, 1500);
    }

    function bindTheme() {
        var btnTheme = document.getElementById('btnTheme');
        if (btnTheme) {
            btnTheme.addEventListener('click', function () {
                applyNightWithTransition(!isNight());
            });
        }
        var manualPref = getManualPref();
        if (manualPref !== null) applyNight(manualPref === '1', false);
        else applyNight(isNightByClock(), false);
    }

    // ============ 背景光团（复刻 downloads-public spawnOrbs）============

    var orbPalette = [
        { c1: [220, 200, 255], c2: [255, 218, 230] },
        { c1: [200, 230, 255], c2: [220, 210, 255] },
        { c1: [210, 245, 220], c2: [200, 230, 255] },
        { c1: [255, 228, 200], c2: [255, 218, 230] },
        { c1: [230, 210, 255], c2: [210, 240, 250] },
        { c1: [255, 218, 230], c2: [255, 240, 210] },
        { c1: [210, 240, 250], c2: [220, 200, 255] },
        { c1: [255, 235, 210], c2: [210, 245, 220] }
    ];
    function orbRand(min, max) { return Math.random() * (max - min) + min; }
    function orbRandInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function spawnOrbs() {
        var container = document.getElementById('orbContainer');
        if (!container) return;
        for (var n = 0; n < 5; n++) {
            var pair = orbPalette[Math.floor(Math.random() * orbPalette.length)];
            var size = orbRand(220, 320);
            var orb = document.createElement('div');
            orb.className = 'orb';
            orb.style.width = size + 'px';
            orb.style.height = size + 'px';
            orb.style.left = orbRand(-12, 84) + '%';
            orb.style.top = orbRand(-12, 84) + '%';
            orb.style.animationDuration = orbRand(12, 18) + 's';
            var layers = orbRandInt(2, 3);
            for (var i = 0; i < layers; i++) {
                var inner = document.createElement('div');
                inner.className = 'orb-inner';
                var r = Math.round(orbRand(195, 255)), g = Math.round(orbRand(195, 255)), b = Math.round(orbRand(205, 255));
                var alpha = orbRand(0.45, 0.75);
                inner.style.background =
                    'radial-gradient(circle at 30% 30%, rgba(' + r + ',' + g + ',' + b + ',' + alpha + ') 0%, ' +
                    'rgba(' + r + ',' + g + ',' + b + ',' + (alpha * 0.3) + ') 55%, transparent 100%)';
                inner.style.transform = 'scale(' + orbRand(0.5, 1.0) + ') rotate(' + orbRand(0, 360) + 'deg)';
                inner.style.filter = 'blur(' + orbRand(25, 60) + 'px)';
                inner.style.borderRadius = '60% 40% 55% 45% / 50% 60% 40% 50%';
                inner.style.animationDelay = '-' + orbRand(0, 8) + 's';
                inner.style.animationDuration = orbRand(8, 12) + 's';
                orb.appendChild(inner);
            }
            container.appendChild(orb);
        }
    }

    // ============ DOM 引用 ============

    var dropzone = document.getElementById('iwDropzone');
    var fileInput = document.getElementById('iwFile');
    var canvasWrap = document.getElementById('iwCanvasWrap');
    var canvasEl = document.getElementById('iwCanvas');
    var cropOverlay = document.getElementById('iwCropOverlay');
    var emptyTip = document.getElementById('iwEmptyTip');
    var fileBadge = document.getElementById('iwFileBadge');
    var statusEl = document.getElementById('iwStatus');
    var undoBtn = document.getElementById('iwUndo');
    var redoBtn = document.getElementById('iwRedo');
    var resetBtn = document.getElementById('iwReset');
    var exportBtn = document.getElementById('iwExport');
    var exportFormatSel = document.getElementById('iwExportFormat');
    var exportQuality = document.getElementById('iwQuality');
    var exportMaxWidth = document.getElementById('iwMaxWidth');
    var exportNote = document.getElementById('iwExportNote');
    var sizeCompare = document.getElementById('iwSizeCompare');
    var sizeBefore = document.getElementById('iwSizeBefore');
    var sizeAfter = document.getElementById('iwSizeAfter');
    var sizeDelta = document.getElementById('iwSizeDelta');
    var panelEl = document.getElementById('iwPanel');
    var toolBtns = document.querySelectorAll('.iw-tool');

    // ============ 状态模型 ============

    var MAX_EDGE = 4096;                      // 编辑前钳制上限（防 canvas 超限/性能崩）
    var HISTORY_BUDGET = 64 * 1024 * 1024;    // 撤销栈 base64 字符预算（≈48MB 字节）
    var state = {
        originalFile: null,
        originalDataUrl: null,
        originalName: '',
        workingCanvas: null,                  // 唯一真相，所有编辑生成新 canvas 替换
        history: [],                          // PNG dataURL 快照
        historyIndex: -1,
        export: { format: 'image/png', quality: 0.9, maxWidth: 1920, avifSupported: false }
    };
    var currentTool = 'upload';
    var liveRefs = {};                        // 当前面板实时引用（压缩/格式转换预览）

    // 裁剪状态
    var cropSel = null;                       // 归一化选区 {x1,y1,x2,y2}（相对画布宽高 0~1）
    var cropping = false;
    var cropStart = null;

    // ============ 通用 canvas 工具函数 ============

    function loadImageFromFile(file, cb) {
        if (file.size > 20 * 1024 * 1024) { showToast('图片超过 20MB 限制'); return; }
        if (file.type.indexOf('image/') !== 0 && !/\.svg$/i.test(file.name)) { showToast('请选择图片文件'); return; }
        var reader = new FileReader();
        reader.onload = function (e) {
            var dataUrl = e.target.result;
            var img = new Image();
            img.onload = function () {
                var w = img.naturalWidth || img.width;
                var h = img.naturalHeight || img.height;
                if (!w || !h) { w = 800; h = 600; }   // SVG 无固有尺寸兜底
                cb({ file: file, dataUrl: dataUrl, img: img, w: w, h: h });
            };
            img.onerror = function () { showToast('图片解析失败，请换一张试试'); };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    }

    // 等比缩放到最大宽度（源可为 canvas 或 Image）
    function renderScaled(src, maxW) {
        var w = src.width, h = src.height;
        if (maxW && w > maxW) {
            h = Math.max(1, Math.round(h * maxW / w));
            w = maxW;
        }
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(src, 0, 0, w, h);
        return c;
    }

    function clampToMaxEdge(canvas) {
        if (canvas.width > MAX_EDGE || canvas.height > MAX_EDGE) {
            var scale = Math.min(1, MAX_EDGE / Math.max(canvas.width, canvas.height));
            return renderScaled(canvas, Math.max(1, Math.round(canvas.width * scale)));
        }
        return canvas;
    }

    // JPEG 无透明底：先铺白底避免黑边
    function withWhiteBackground(canvas) {
        var c = document.createElement('canvas');
        c.width = canvas.width; c.height = canvas.height;
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(canvas, 0, 0);
        return c;
    }

    function canvasToBlob(canvas, type, quality) {
        return new Promise(function (resolve) {
            canvas.toBlob(function (b) { resolve(b); }, type, quality);
        });
    }

    // PNG blob 封装成 ICO（现代系统支持 PNG 压缩 ICO）
    function buildIco(pngBlob, w, h, cb) {
        var reader = new FileReader();
        reader.onload = function () {
            var bytes = new Uint8Array(reader.result);
            var out = new Uint8Array(22 + bytes.length);
            var dv = new DataView(out.buffer);
            dv.setUint16(0, 0, true);
            dv.setUint16(2, 1, true);
            dv.setUint16(4, 1, true);
            dv.setUint8(6, w > 255 ? 0 : w);
            dv.setUint8(7, h > 255 ? 0 : h);
            dv.setUint8(8, 0);
            dv.setUint8(9, 0);
            dv.setUint16(10, 1, true);
            dv.setUint16(12, 32, true);
            dv.setUint32(14, bytes.length, true);
            dv.setUint32(18, 22, true);
            out.set(bytes, 22);
            cb(new Blob([out], { type: 'image/x-icon' }));
        };
        reader.readAsArrayBuffer(pngBlob);
    }

    // 按输出设置产 blob，返回 {blob,w,h}（ICO 已钳 256，w/h 为实际输出尺寸）
    function outputBlob(canvas, fmt, quality) {
        return new Promise(function (resolve) {
            if (fmt === 'image/x-icon') {
                var scale = Math.min(1, 256 / Math.max(canvas.width, canvas.height));
                var cw = Math.max(1, Math.round(canvas.width * scale));
                var ch = Math.max(1, Math.round(canvas.height * scale));
                var c = document.createElement('canvas');
                c.width = cw; c.height = ch;
                c.getContext('2d').drawImage(canvas, 0, 0, cw, ch);
                canvasToBlob(c, 'image/png', undefined).then(function (png) {
                    if (!png) { resolve(null); return; }
                    buildIco(png, cw, ch, function (ico) { resolve({ blob: ico, w: cw, h: ch }); });
                });
                return;
            }
            if (fmt === 'image/avif' && !state.export.avifSupported) { resolve(null); return; }
            var out = canvas;
            var q = (fmt === 'image/png') ? undefined : quality;
            if (fmt === 'image/jpeg') out = withWhiteBackground(canvas);
            canvasToBlob(out, fmt, q).then(function (b) {
                resolve({ blob: b, w: out.width, h: out.height });
            });
        });
    }

    function extOf(mime) {
        if (mime === 'image/jpeg') return 'jpg';
        if (mime === 'image/webp') return 'webp';
        if (mime === 'image/avif') return 'avif';
        if (mime === 'image/x-icon') return 'ico';
        return 'png';
    }

    function downloadBlob(blob, filename) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    }

    // 非破坏像素操作骨架：复制画布 → 就地改像素 → 返回新 canvas（复用 applyGlitch 思路）
    function pixelManipulate(canvas, fn) {
        var c = document.createElement('canvas');
        c.width = canvas.width; c.height = canvas.height;
        var ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(canvas, 0, 0);
        var img = ctx.getImageData(0, 0, c.width, c.height);
        fn(img.data, c.width, c.height);
        ctx.putImageData(img, 0, 0);
        return c;
    }

    function bindDropzone(dz, input, onFile) {
        dz.addEventListener('click', function () { input.click(); });
        dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('drag-over'); });
        dz.addEventListener('dragleave', function (e) { e.preventDefault(); dz.classList.remove('drag-over'); });
        dz.addEventListener('drop', function (e) {
            e.preventDefault();
            dz.classList.remove('drag-over');
            onFile(e.dataTransfer.files);
        });
        input.addEventListener('change', function () {
            onFile(input.files);
            input.value = '';
        });
    }

    // ============ 历史 / 撤销重做 ============

    function historyBytes() {
        var n = 0;
        for (var i = 0; i < state.history.length; i++) n += state.history[i].length;
        return n;
    }

    // 提交一步编辑：截断被撤销的分支 → 存「编辑后」快照 → 字节预算封顶 → 换 canvas。
    // 快照必须存 newCanvas（编辑后状态）：撤销恢复「编辑前」、重做恢复「编辑后」，
    // 若存编辑前快照，撤销后再重做会恢复到重复的旧状态（曾踩坑）。
    function commitWorkingCanvas(newCanvas) {
        state.history.length = state.historyIndex + 1;
        state.history.push(newCanvas.toDataURL('image/png'));
        while (state.history.length > 1 && historyBytes() > HISTORY_BUDGET) {
            state.history.shift();
            state.historyIndex--;
        }
        state.historyIndex = state.history.length - 1;
        state.workingCanvas = newCanvas;
        afterCanvasChange();
    }

    function restoreFromSnapshot(dataUrl, cb) {
        var img = new Image();
        img.onload = function () {
            var c = document.createElement('canvas');
            c.width = img.width; c.height = img.height;
            c.getContext('2d').drawImage(img, 0, 0);
            cb(c);
        };
        img.src = dataUrl;
    }

    function undo() {
        if (state.historyIndex <= 0) { showToast('没有可撤销的操作'); return; }
        state.historyIndex--;
        restoreFromSnapshot(state.history[state.historyIndex], function (c) {
            state.workingCanvas = c;
            afterCanvasChange();
            showToast('已撤销');
        });
    }

    function redo() {
        if (state.historyIndex >= state.history.length - 1) { showToast('没有可重做的操作'); return; }
        state.historyIndex++;
        restoreFromSnapshot(state.history[state.historyIndex], function (c) {
            state.workingCanvas = c;
            afterCanvasChange();
            showToast('已重做');
        });
    }

    function syncHistoryButtons() {
        undoBtn.disabled = (state.historyIndex <= 0);
        redoBtn.disabled = (state.historyIndex >= state.history.length - 1);
    }

    // canvas 变动后的统一收尾：重绘预览 / 状态 / 导出汇总 / 大小估算 / 历史按钮
    function afterCanvasChange() {
        drawToPreview();
        updateStatusText();
        renderExportSummary();
        scheduleExportEstimate();
        syncHistoryButtons();
    }

    // ============ 预览渲染 ============

    function drawToPreview() {
        if (!state.workingCanvas) return;
        canvasEl.width = state.workingCanvas.width;
        canvasEl.height = state.workingCanvas.height;
        canvasEl.getContext('2d').drawImage(state.workingCanvas, 0, 0);
        if (currentTool === 'crop' && !cropOverlay.hidden) {
            layoutCropOverlay();
            renderCropOverlay();
        }
    }

    function updateStatusText() {
        if (!state.workingCanvas) { statusEl.textContent = '未上传图片'; return; }
        statusEl.textContent = state.originalName + ' · ' + state.workingCanvas.width + '×' + state.workingCanvas.height;
    }

    // 导出区状态：无损锁 / note / 导出按钮可用性
    function renderExportSummary() {
        var fmt = state.export.format;
        var isLossless = (fmt === 'image/png' || fmt === 'image/x-icon');
        exportQuality.disabled = isLossless;
        exportQuality.classList.toggle('ic-slider-locked', isLossless);
        exportQuality.title = isLossless ? '' : '质量越高，文件越大';
        exportBtn.disabled = !state.workingCanvas;
        if (fmt === 'image/x-icon') {
            exportNote.textContent = 'ICO 图标格式（PNG 封装，≤256px）';
            exportNote.style.visibility = 'visible';
        } else if (fmt === 'image/png') {
            exportNote.textContent = '当前为无损格式，无需质量设置';
            exportNote.style.visibility = 'visible';
        } else if (fmt === 'image/avif' && !state.export.avifSupported) {
            exportNote.textContent = '当前浏览器不支持 AVIF，请用 Chrome / Edge';
            exportNote.style.visibility = 'visible';
        } else {
            exportNote.style.visibility = 'hidden';
        }
        // 压缩面板开着时同步其质量锁
        if (currentTool === 'compress' && liveRefs.compressQuality) {
            liveRefs.compressQuality.disabled = isLossless;
            liveRefs.compressQuality.classList.toggle('ic-slider-locked', isLossless);
        }
    }

    // ============ 导出 / 大小估算（竞态守卫 + rAF 节流）============

    var estimateVersion = 0;
    var estimateScheduled = false;
    function scheduleExportEstimate() {
        if (estimateScheduled) return;
        estimateScheduled = true;
        var run = function () {
            if (!estimateScheduled) return;
            estimateScheduled = false;
            runExportEstimate();
        };
        requestAnimationFrame(run);
        setTimeout(run, 60);
    }

    function runExportEstimate() {
        if (!state.workingCanvas || !state.originalFile) return;
        var myVer = ++estimateVersion;
        var fmt = state.export.format;
        var mw = parseInt(exportMaxWidth.value, 10);
        if (isNaN(mw) || mw < 100) { mw = 1920; exportMaxWidth.value = '1920'; }
        state.export.maxWidth = mw;
        var src = renderScaled(state.workingCanvas, mw);
        outputBlob(src, fmt, state.export.quality).then(function (res) {
            if (myVer !== estimateVersion || !res) return;
            var orig = state.originalFile.size;
            var delta = (res.blob.size / orig - 1) * 100;
            var sign = delta >= 0 ? '+' : '';
            sizeBefore.textContent = formatFileSize(orig);
            sizeAfter.textContent = formatFileSize(res.blob.size);
            sizeDelta.textContent = '(' + sign + delta.toFixed(1) + '%)';
            sizeDelta.className = delta <= 0 ? 'iw-size-delta iw-size-delta-good' : 'iw-size-delta iw-size-delta-bad';
            sizeCompare.hidden = false;
            updateLivePanel(res, orig);
        });
    }

    // 压缩/格式转换面板的实时预览
    function updateLivePanel(res, orig) {
        if (liveRefs.compResult && currentTool === 'compress') {
            if (liveRefs.compUrl) URL.revokeObjectURL(liveRefs.compUrl);
            liveRefs.compUrl = URL.createObjectURL(res.blob);
            liveRefs.compThumb.innerHTML = '<img src="' + liveRefs.compUrl + '" alt="压缩预览">';
            var ratio = (1 - res.blob.size / orig) * 100;
            liveRefs.compInfo.textContent = '输出 ' + formatFileSize(res.blob.size) +
                ' | ' + res.w + '×' + res.h + (ratio > 0 ? ' | 比原图小 ' + ratio.toFixed(1) + '%' : '');
            liveRefs.compResult.hidden = false;
        }
        if (liveRefs.fmtResult && currentTool === 'format') {
            if (liveRefs.fmtUrl) URL.revokeObjectURL(liveRefs.fmtUrl);
            liveRefs.fmtUrl = URL.createObjectURL(res.blob);
            liveRefs.fmtThumb.innerHTML = '<img src="' + liveRefs.fmtUrl + '" alt="转换预览">';
            var delta2 = (res.blob.size / orig - 1) * 100;
            liveRefs.fmtInfo.textContent = extOf(state.export.format).toUpperCase() + ' | ' +
                formatFileSize(res.blob.size) + ' | ' + res.w + '×' + res.h + ' | ' +
                (delta2 >= 0 ? '+' : '') + delta2.toFixed(1) + '%';
            liveRefs.fmtResult.hidden = false;
        }
    }

    var exportVersion = 0;
    function doExport() {
        if (!state.workingCanvas) return;
        var myVer = ++exportVersion;
        var fmt = state.export.format;
        var mw = parseInt(exportMaxWidth.value, 10);
        if (isNaN(mw) || mw < 100) { mw = 1920; exportMaxWidth.value = '1920'; }
        state.export.maxWidth = mw;
        var src = renderScaled(state.workingCanvas, mw);
        outputBlob(src, fmt, state.export.quality).then(function (res) {
            if (myVer !== exportVersion || !res) {
                if (!res) showToast('导出失败，浏览器不支持该格式');
                return;
            }
            var name = state.originalName || 'image';
            var ext = extOf(fmt);
            downloadBlob(res.blob, name + '_' + res.w + 'x' + res.h + '.' + ext);
            showToast('已导出 ' + res.w + '×' + res.h + ' ' + ext.toUpperCase());
        });
    }

    // ============ 上传 ============

    function onFilePicked(files) {
        if (!files || !files.length) return;
        loadImageFromFile(files[0], function (info) {
            var canvas = document.createElement('canvas');
            canvas.width = info.w; canvas.height = info.h;
            canvas.getContext('2d').drawImage(info.img, 0, 0);
            canvas = clampToMaxEdge(canvas);

            state.originalFile = info.file;
            state.originalDataUrl = info.dataUrl;
            state.originalName = info.file.name.replace(/\.[^.]+$/, '');
            state.history = [canvas.toDataURL('image/png')];
            state.historyIndex = 0;
            state.workingCanvas = canvas;
            cropSel = null;

            dropzone.style.display = 'none';
            canvasWrap.hidden = false;
            emptyTip.hidden = false;
            emptyTip.textContent = '选择左侧工具开始编辑';
            fileBadge.textContent = info.file.name + ' · ' + formatFileSize(info.file.size);
            fileBadge.hidden = false;
            fileBadge.title = info.file.name + ' · ' + info.w + '×' + info.h + ' · ' + (info.file.type || 'image/*');

            showTool('upload');
            afterCanvasChange();
        });
    }

    // ============ 工具面板构建 ============

    function buildUploadPanel() {
        if (state.workingCanvas) {
            var f = state.originalFile;
            return '<div class="iw-panel-group">' +
                '<p class="iw-panel-hint">当前图片（全部本地处理，不上传服务器）</p>' +
                '<div class="iw-up-info">' +
                    '<p class="iw-up-name" title="' + escapeHtml(f.name) + '">' + escapeHtml(f.name) + '</p>' +
                    '<p class="iw-info">' + state.workingCanvas.width + '×' + state.workingCanvas.height +
                        ' · ' + formatFileSize(f.size) + ' · ' + (f.type || 'image/*') + '</p>' +
                '</div>' +
                '<button type="button" class="iw-btn" id="iwUpRechoose">🔄 换一张</button>' +
            '</div>';
        }
        return '<div class="iw-panel-group">' +
            '<p class="iw-panel-hint">支持 JPG / PNG / WebP / GIF / BMP / SVG，最大 20MB。</p>' +
            '<button type="button" class="iw-btn iw-btn-primary" id="iwUpPick">📤 选择图片</button>' +
        '</div>';
    }

    function buildCropPanel() {
        return '<div class="iw-panel-group">' +
            '<p class="iw-panel-hint">在画布上拖动选择裁剪区域，可选固定比例。</p>' +
            '<label class="iw-field">比例' +
                '<select id="iwCropRatio">' +
                    '<option value="free">自由</option>' +
                    '<option value="1:1">1:1</option>' +
                    '<option value="4:3">4:3</option>' +
                    '<option value="16:9">16:9</option>' +
                '</select>' +
            '</label>' +
            '<div class="iw-crop-nums">' +
                '<label>X <input type="number" class="iw-num" id="iwCropX" min="0" value="0"></label>' +
                '<label>Y <input type="number" class="iw-num" id="iwCropY" min="0" value="0"></label>' +
                '<label>宽 <input type="number" class="iw-num" id="iwCropW" min="0" value="0"></label>' +
                '<label>高 <input type="number" class="iw-num" id="iwCropH" min="0" value="0"></label>' +
            '</div>' +
            '<button type="button" class="iw-btn iw-btn-primary" id="iwCropApply" disabled>✂️ 应用裁剪</button>' +
            '<button type="button" class="iw-btn" id="iwCropClear">清除选区</button>' +
        '</div>';
    }

    function buildRotatePanel() {
        return '<div class="iw-panel-group">' +
            '<p class="iw-panel-hint">每次操作立即生效，可用撤销回退。</p>' +
            '<div class="iw-rot-btns">' +
                '<button type="button" class="iw-btn" data-rot="left">↺ 左旋 90°</button>' +
                '<button type="button" class="iw-btn" data-rot="right">↻ 右旋 90°</button>' +
                '<button type="button" class="iw-btn" data-rot="180">⤯ 旋转 180°</button>' +
                '<button type="button" class="iw-btn" data-rot="flipH">⇋ 水平翻转</button>' +
                '<button type="button" class="iw-btn" data-rot="flipV">⇋ 垂直翻转</button>' +
            '</div>' +
        '</div>';
    }

    function buildColorPanel() {
        return '<div class="iw-panel-group">' +
            '<p class="iw-panel-hint">拖动实时预览（大图自动降采样），松手后应用到全分辨率并记录一步。</p>' +
            '<label class="iw-field">亮度 <span class="iw-val" id="iwColorBVal">0</span>' +
                '<input type="range" class="ic-slider" id="iwColorB" min="-100" max="100" step="1" value="0"></label>' +
            '<label class="iw-field">对比度 <span class="iw-val" id="iwColorCVal">0</span>' +
                '<input type="range" class="ic-slider" id="iwColorC" min="-100" max="100" step="1" value="0"></label>' +
            '<label class="iw-field">饱和度 <span class="iw-val" id="iwColorSVal">0</span>' +
                '<input type="range" class="ic-slider" id="iwColorS" min="-100" max="100" step="1" value="0"></label>' +
            '<button type="button" class="iw-btn" id="iwColorReset">↺ 重置为 0</button>' +
        '</div>';
    }

    function buildWatermarkPanel() {
        return '<div class="iw-panel-group">' +
            '<p class="iw-panel-hint">实时预览叠加效果，满意后点「应用水印」生效。</p>' +
            '<div class="iw-tabs">' +
                '<button type="button" class="iw-tab active" data-wtab="text">🔤 文字</button>' +
                '<button type="button" class="iw-tab" data-wtab="img">🖼️ 图片</button>' +
            '</div>' +
            '<div class="iw-wtab" id="iwWTabText">' +
                '<label class="iw-field">文字' +
                    '<input type="text" id="iwWText" maxlength="60" placeholder="输入水印文字"></label>' +
                '<label class="iw-field">字号 <span class="iw-val" id="iwWSizeVal">32</span>' +
                    '<input type="range" class="ic-slider" id="iwWSize" min="8" max="120" step="1" value="32"></label>' +
                '<label class="iw-field">颜色' +
                    '<input type="color" id="iwWColor" value="#ffffff"></label>' +
                '<label class="iw-field">不透明度 <span class="iw-val" id="iwWOpVal">0.5</span>' +
                    '<input type="range" class="ic-slider" id="iwWOp" min="5" max="100" step="5" value="50"></label>' +
                '<label class="iw-field">位置' +
                    '<select id="iwWPos">' +
                        '<option value="tl">左上</option>' +
                        '<option value="tr">右上</option>' +
                        '<option value="bl">左下</option>' +
                        '<option value="br">右下</option>' +
                        '<option value="c">居中</option>' +
                    '</select></label>' +
            '</div>' +
            '<div class="iw-wtab" id="iwWTabImg" hidden>' +
                '<label class="iw-field">水印图片（PNG 透明底最佳）' +
                    '<input type="file" id="iwWImgFile" accept="image/*"></label>' +
                '<p class="iw-info" id="iwWImgInfo">未选择水印图片</p>' +
            '</div>' +
            '<button type="button" class="iw-btn iw-btn-primary" id="iwWApply">💧 应用水印</button>' +
        '</div>';
    }

    function buildCompressPanel() {
        return '<div class="iw-panel-group">' +
            '<p class="iw-panel-hint">压缩参数与右侧导出栏联动，实时预览输出大小与质量。</p>' +
            '<label class="iw-field">输出格式' +
                '<select id="iwCompFormat">' +
                    '<option value="image/webp">WebP（推荐）</option>' +
                    '<option value="image/jpeg">JPEG</option>' +
                '</select>' +
            '</label>' +
            '<label class="iw-field">质量 <span class="iw-val" id="iwCompQVal">0.9</span>' +
                '<input type="range" class="ic-slider" id="iwCompQuality" min="0.1" max="1" step="0.05" value="0.9"></label>' +
            '<label class="iw-field">最大宽度' +
                '<input type="number" class="iw-num" id="iwCompMaxWidth" value="1920" min="100" max="8000"></label>' +
            '<div class="iw-comp-result" id="iwCompResult" hidden>' +
                '<div class="iw-comp-thumb" id="iwCompThumb"></div>' +
                '<p class="iw-info" id="iwCompInfo"></p>' +
            '</div>' +
        '</div>';
    }

    function buildFormatPanel() {
        var avifDisabled = state.export.avifSupported ? '' : ' disabled';
        var avifExtra = state.export.avifSupported ? '' : ' title="当前浏览器不支持 AVIF"';
        return '<div class="iw-panel-group">' +
            '<p class="iw-panel-hint">选择输出格式，与右侧导出栏联动，实时预览。</p>' +
            '<div class="iw-format-btns">' +
                '<button type="button" class="iw-format-btn" data-fmt="image/png">PNG</button>' +
                '<button type="button" class="iw-format-btn" data-fmt="image/jpeg">JPEG</button>' +
                '<button type="button" class="iw-format-btn" data-fmt="image/webp">WebP</button>' +
                '<button type="button" class="iw-format-btn" data-fmt="image/avif"' + avifDisabled + avifExtra + '>AVIF</button>' +
                '<button type="button" class="iw-format-btn" data-fmt="image/x-icon">ICO</button>' +
            '</div>' +
            '<div class="iw-comp-result" id="iwFmtResult" hidden>' +
                '<div class="iw-comp-thumb" id="iwFmtThumb"></div>' +
                '<p class="iw-info" id="iwFmtInfo"></p>' +
            '</div>' +
        '</div>';
    }

    function buildPixelPanel() {
        return '<div class="iw-panel-group">' +
            '<p class="iw-panel-hint">把图片变成像素风：先降采样成小网格取平均色，再放大为清晰像素块。</p>' +
            '<label class="iw-field">网格尺寸' +
                '<select id="iwPixelGrid">' +
                    '<option value="16">16×16</option>' +
                    '<option value="32" selected>32×32</option>' +
                    '<option value="64">64×64</option>' +
                '</select>' +
            '</label>' +
            '<button type="button" class="iw-btn" id="iwPixelPreview">👁 预览效果</button>' +
            '<button type="button" class="iw-btn iw-btn-primary" id="iwPixelApply">👾 应用像素风</button>' +
        '</div>';
    }

    var PANEL_BUILDERS = {
        upload: buildUploadPanel,
        crop: buildCropPanel,
        rotate: buildRotatePanel,
        color: buildColorPanel,
        watermark: buildWatermarkPanel,
        compress: buildCompressPanel,
        format: buildFormatPanel,
        pixel: buildPixelPanel
    };

    function showTool(name) {
        currentTool = name;
        for (var i = 0; i < toolBtns.length; i++) {
            toolBtns[i].classList.toggle('active', toolBtns[i].getAttribute('data-tool') === name);
        }
        liveRefs = {};
        cropOverlay.hidden = (name !== 'crop');
        if (name !== 'crop') cropSel = null;
        panelEl.innerHTML = PANEL_BUILDERS[name] ? PANEL_BUILDERS[name]() : '';
        bindPanel(name);
        if (name === 'crop') {
            initCropOverlay();
            layoutCropOverlay();
            renderCropOverlay();
        }
        if ((name === 'compress' || name === 'format') && state.workingCanvas) scheduleExportEstimate();
    }

    // ============ 工具面板事件绑定 ============

    function bindPanel(name) {
        if (name === 'upload') bindUploadPanel();
        else if (name === 'crop') bindCropPanel();
        else if (name === 'rotate') bindRotatePanel();
        else if (name === 'color') bindColorPanel();
        else if (name === 'watermark') bindWatermarkPanel();
        else if (name === 'compress') bindCompressPanel();
        else if (name === 'format') bindFormatPanel();
        else if (name === 'pixel') bindPixelPanel();
    }

    function bindUploadPanel() {
        var pick = document.getElementById('iwUpPick');
        var rechoose = document.getElementById('iwUpRechoose');
        if (pick) pick.addEventListener('click', function () { fileInput.click(); });
        if (rechoose) rechoose.addEventListener('click', function () { fileInput.click(); });
    }

    // ---------- 裁剪 ----------
    function initCropOverlay() {
        cropOverlay.innerHTML =
            '<div class="iw-crop-dim" data-d="t"></div>' +
            '<div class="iw-crop-dim" data-d="l"></div>' +
            '<div class="iw-crop-dim" data-d="r"></div>' +
            '<div class="iw-crop-dim" data-d="b"></div>' +
            '<div class="iw-crop-sel"></div>';
    }

    function layoutCropOverlay() {
        if (!state.workingCanvas) return;
        var wrapRect = canvasWrap.getBoundingClientRect();
        var rect = canvasEl.getBoundingClientRect();
        cropOverlay.style.left = (rect.left - wrapRect.left) + 'px';
        cropOverlay.style.top = (rect.top - wrapRect.top) + 'px';
        cropOverlay.style.width = rect.width + 'px';
        cropOverlay.style.height = rect.height + 'px';
    }

    function renderCropOverlay() {
        if (!cropSel || !state.workingCanvas) return;
        layoutCropOverlay();
        var w = cropOverlay.offsetWidth, h = cropOverlay.offsetHeight;
        var x1 = Math.min(cropSel.x1, cropSel.x2) * w;
        var y1 = Math.min(cropSel.y1, cropSel.y2) * h;
        var x2 = Math.max(cropSel.x1, cropSel.x2) * w;
        var y2 = Math.max(cropSel.y1, cropSel.y2) * h;
        var dims = {
            t: { left: 0, top: 0, width: w, height: y1 },
            l: { left: 0, top: y1, width: x1, height: y2 - y1 },
            r: { left: x2, top: y1, width: w - x2, height: y2 - y1 },
            b: { left: 0, top: y2, width: w, height: h - y2 }
        };
        var sel = cropOverlay.querySelector('.iw-crop-sel');
        if (sel) {
            sel.style.left = x1 + 'px'; sel.style.top = y1 + 'px';
            sel.style.width = (x2 - x1) + 'px'; sel.style.height = (y2 - y1) + 'px';
        }
        var keys = ['t', 'l', 'r', 'b'];
        for (var k = 0; k < keys.length; k++) {
            var el = cropOverlay.querySelector('[data-d="' + keys[k] + '"]');
            var d = dims[keys[k]];
            if (el) {
                el.style.left = d.left + 'px'; el.style.top = d.top + 'px';
                el.style.width = d.width + 'px'; el.style.height = d.height + 'px';
            }
        }
    }

    function pointerToNorm(e) {
        var rect = canvasEl.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top) / rect.height
        };
    }

    function currentCropRatio() {
        var el = document.getElementById('iwCropRatio');
        if (!el) return 0;
        var v = el.value;
        if (v === '1:1') return 1;
        if (v === '4:3') return 4 / 3;
        if (v === '16:9') return 16 / 9;
        return 0;
    }

    function clampSel() {
        cropSel.x1 = Math.max(0, Math.min(1, cropSel.x1));
        cropSel.y1 = Math.max(0, Math.min(1, cropSel.y1));
        cropSel.x2 = Math.max(0, Math.min(1, cropSel.x2));
        cropSel.y2 = Math.max(0, Math.min(1, cropSel.y2));
    }

    // 归一化选区 → 像素裁剪矩形
    function cropPixels() {
        if (!cropSel || !state.workingCanvas) return null;
        var w = state.workingCanvas.width, h = state.workingCanvas.height;
        var x = Math.round(Math.min(cropSel.x1, cropSel.x2) * w);
        var y = Math.round(Math.min(cropSel.y1, cropSel.y2) * h);
        var x2 = Math.round(Math.max(cropSel.x1, cropSel.x2) * w);
        var y2 = Math.round(Math.max(cropSel.y1, cropSel.y2) * h);
        var cw = x2 - x, ch = y2 - y;
        if (cw < 1 || ch < 1) return null;
        return { x: x, y: y, w: cw, h: ch };
    }

    function syncCropNums() {
        var elX = document.getElementById('iwCropX');
        if (!elX) return;
        var p = cropPixels();
        elX.value = p ? p.x : 0;
        document.getElementById('iwCropY').value = p ? p.y : 0;
        document.getElementById('iwCropW').value = p ? p.w : 0;
        document.getElementById('iwCropH').value = p ? p.h : 0;
    }

    function bindCropPanel() {
        var ratioSel = document.getElementById('iwCropRatio');
        var applyBtn = document.getElementById('iwCropApply');
        var clearBtn = document.getElementById('iwCropClear');
        var nums = ['iwCropX', 'iwCropY', 'iwCropW', 'iwCropH'];

        ratioSel.addEventListener('change', function () {
            if (!cropSel || !cropStart) return;
            // 重选比例后按当前起点重新钳制
            var ratio = currentCropRatio();
            if (ratio) {
                var c = clampToRatio(cropStart.x, cropStart.y, cropSel.x2, cropSel.y2, ratio);
                cropSel.x2 = c.x2; cropSel.y2 = c.y2;
                clampSel();
            }
            renderCropOverlay();
            syncCropNums();
            applyBtn.disabled = !cropPixels();
        });

        applyBtn.addEventListener('click', applyCrop);
        clearBtn.addEventListener('click', clearCrop);

        for (var i = 0; i < nums.length; i++) {
            (function (id) {
                document.getElementById(id).addEventListener('input', onCropNumInput);
            })(nums[i]);
        }
    }

    function onCropNumInput() {
        if (!state.workingCanvas) return;
        var x = parseInt(document.getElementById('iwCropX').value, 10);
        var y = parseInt(document.getElementById('iwCropY').value, 10);
        var w = parseInt(document.getElementById('iwCropW').value, 10);
        var h = parseInt(document.getElementById('iwCropH').value, 10);
        if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h) || w < 1 || h < 1) return;
        var W = state.workingCanvas.width, H = state.workingCanvas.height;
        x = Math.max(0, Math.min(x, W - 1));
        y = Math.max(0, Math.min(y, H - 1));
        w = Math.max(1, Math.min(w, W - x));
        h = Math.max(1, Math.min(h, H - y));
        cropSel = { x1: x / W, y1: y / H, x2: (x + w) / W, y2: (y + h) / H };
        renderCropOverlay();
        var applyBtn = document.getElementById('iwCropApply');
        if (applyBtn) applyBtn.disabled = false;
    }

    // 比例约束必须在像素空间算：1:1 指选区的「像素」是正方形。
    // 若在归一化空间钳制，非正方形图片（如 1024×768）会得到 820×614 的假"正方形"（曾踩坑）。
    function clampToRatio(p0x, p0y, cx, cy, ratio) {
        var iw = state.workingCanvas.width, ih = state.workingCanvas.height;
        var dx = cx - p0x, dy = cy - p0y;
        var pw = Math.abs(dx) * iw, ph = Math.abs(dy) * ih;
        if (pw > 0 && ph > 0) {
            if (pw / ph > ratio) pw = ph * ratio;
            else ph = pw / ratio;
        }
        return {
            x: p0x, y: p0y,
            x2: p0x + (dx >= 0 ? 1 : -1) * (pw / iw),
            y2: p0y + (dy >= 0 ? 1 : -1) * (ph / ih)
        };
    }

    function applyCrop() {
        if (!state.workingCanvas) return;
        var p = cropPixels();
        if (!p) { showToast('请先选择裁剪区域'); return; }
        var c = document.createElement('canvas');
        c.width = p.w; c.height = p.h;
        var ctx = c.getContext('2d');
        ctx.drawImage(state.workingCanvas, p.x, p.y, p.w, p.h, 0, 0, p.w, p.h);
        commitWorkingCanvas(c);
        showToast('已裁剪 ' + p.w + '×' + p.h);
        clearCrop();
    }

    function clearCrop() {
        cropSel = null;
        cropOverlay.innerHTML = '';
        var applyBtn = document.getElementById('iwCropApply');
        if (applyBtn) applyBtn.disabled = true;
        var elX = document.getElementById('iwCropX');
        if (elX) {
            document.getElementById('iwCropX').value = '0';
            document.getElementById('iwCropY').value = '0';
            document.getElementById('iwCropW').value = '0';
            document.getElementById('iwCropH').value = '0';
        }
    }

    // ---------- 旋转 / 翻转 ----------
    function transformCanvas(canvas, op) {
        var w = canvas.width, h = canvas.height;
        var c = document.createElement('canvas');
        var ctx = c.getContext('2d');
        if (op === 'left' || op === 'right') { c.width = h; c.height = w; }
        else { c.width = w; c.height = h; }
        // 左旋: translate(0, c.height)（=原宽）; 右旋: translate(c.width, 0)（=原高）。
        // 此前两处写反导致内容偏移出画布，圆只剩左缘一条（曾踩坑）。
        if (op === 'left') { ctx.translate(0, c.height); ctx.rotate(-Math.PI / 2); }
        else if (op === 'right') { ctx.translate(c.width, 0); ctx.rotate(Math.PI / 2); }
        else if (op === '180') { ctx.translate(c.width, c.height); ctx.rotate(Math.PI); }
        else if (op === 'flipH') { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
        else if (op === 'flipV') { ctx.translate(0, c.height); ctx.scale(1, -1); }
        ctx.drawImage(canvas, 0, 0);
        return c;
    }

    function bindRotatePanel() {
        var btns = panelEl.querySelectorAll('[data-rot]');
        for (var i = 0; i < btns.length; i++) {
            btns[i].addEventListener('click', function () {
                if (!state.workingCanvas) return;
                var op = this.getAttribute('data-rot');
                commitWorkingCanvas(transformCanvas(state.workingCanvas, op));
            });
        }
    }

    // ---------- 调色 ----------
    function clamp8(v) { return v < 0 ? 0 : (v > 255 ? 255 : v); }

    function applyColorAdjust(canvas, b, c, s) {
        var cf = (c === 0) ? 1 : (259 * (c + 255)) / (255 * (259 - c));
        var sf = 1 + s / 100;
        return pixelManipulate(canvas, function (d, w, h) {
            var n = w * h * 4;
            for (var i = 0; i < n; i += 4) {
                var r = d[i], g = d[i + 1], bl = d[i + 2];
                var r2 = (r - 128) * cf + 128;
                var g2 = (g - 128) * cf + 128;
                var b2 = (bl - 128) * cf + 128;
                var lum = 0.299 * r2 + 0.587 * g2 + 0.114 * b2;
                r2 = lum + (r2 - lum) * sf;
                g2 = lum + (g2 - lum) * sf;
                b2 = lum + (b2 - lum) * sf;
                r2 += b; g2 += b; b2 += b;
                d[i] = clamp8(r2); d[i + 1] = clamp8(g2); d[i + 2] = clamp8(b2);
            }
        });
    }

    function colorValues() {
        return {
            b: parseInt(document.getElementById('iwColorB').value, 10),
            c: parseInt(document.getElementById('iwColorC').value, 10),
            s: parseInt(document.getElementById('iwColorS').value, 10)
        };
    }

    var colorScheduled = false;
    function scheduleColorPreview() {
        if (colorScheduled) return;
        colorScheduled = true;
        var run = function () {
            if (!colorScheduled) return;
            colorScheduled = false;
            if (!state.workingCanvas) return;
            var v = colorValues();
            // 降采样副本上实时预览（大图性能关键）
            var small = renderScaled(state.workingCanvas, 1024);
            var adj = applyColorAdjust(small, v.b, v.c, v.s);
            canvasEl.width = adj.width; canvasEl.height = adj.height;
            canvasEl.getContext('2d').drawImage(adj, 0, 0);
        };
        requestAnimationFrame(run);
        setTimeout(run, 40);
    }

    function commitColor() {
        colorScheduled = false;   // 丢弃未触发的预览任务，避免在已提交画布上二次叠加显示（曾踩坑）
        if (!state.workingCanvas) return;
        var v = colorValues();
        if (v.b === 0 && v.c === 0 && v.s === 0) { afterCanvasChange(); return; }
        commitWorkingCanvas(applyColorAdjust(state.workingCanvas, v.b, v.c, v.s));
        showToast('已应用调色');
    }

    function bindColorPanel() {
        var sliders = [['iwColorB', 'iwColorBVal'], ['iwColorC', 'iwColorCVal'], ['iwColorS', 'iwColorSVal']];
        for (var i = 0; i < sliders.length; i++) {
            (function (sid, vid) {
                var s = document.getElementById(sid);
                var v = document.getElementById(vid);
                s.addEventListener('input', function () {
                    v.textContent = s.value;
                    scheduleColorPreview();
                });
                s.addEventListener('change', commitColor);
            })(sliders[i][0], sliders[i][1]);
        }
        document.getElementById('iwColorReset').addEventListener('click', function () {
            var sets = [['iwColorB', 'iwColorBVal'], ['iwColorC', 'iwColorCVal'], ['iwColorS', 'iwColorSVal']];
            for (var j = 0; j < sets.length; j++) {
                document.getElementById(sets[j][0]).value = '0';
                document.getElementById(sets[j][1]).textContent = '0';
            }
            scheduleColorPreview();
        });
    }

    // ---------- 水印 ----------
    var watermarkTab = 'text';
    var watermarkImg = null;   // HTMLImageElement

    function drawTextWatermark(ctx, w, h, text, size, color, op, pos) {
        var padding = Math.max(12, Math.round(w * 0.03));
        ctx.font = size + 'px "PingFang SC", "Microsoft YaHei", sans-serif';
        var maxW = w * 0.9;
        var m = ctx.measureText(text);
        if (m.width > maxW) {
            ctx.font = Math.max(8, Math.round(size * maxW / m.width)) + 'px "PingFang SC", "Microsoft YaHei", sans-serif';
        }
        var tw = ctx.measureText(text).width;
        var th = size;
        var tx, ty;
        if (pos === 'tl') { tx = padding; ty = padding + th; }
        else if (pos === 'tr') { tx = w - padding - tw; ty = padding + th; }
        else if (pos === 'bl') { tx = padding; ty = h - padding; }
        else if (pos === 'br') { tx = w - padding - tw; ty = h - padding; }
        else { tx = (w - tw) / 2; ty = (h + th) / 2; }
        ctx.globalAlpha = op;
        ctx.fillStyle = color;
        ctx.fillText(text, tx, ty);
        ctx.globalAlpha = 1;
    }

    function drawImgWatermark(ctx, w, h, img, op, pos) {
        var ih = Math.max(8, Math.round(h * 0.1));
        var iw = Math.max(8, Math.round(img.width * ih / img.height));
        var padding = Math.max(12, Math.round(w * 0.03));
        var ix, iy;
        if (pos === 'tl') { ix = padding; iy = padding; }
        else if (pos === 'tr') { ix = w - padding - iw; iy = padding; }
        else if (pos === 'bl') { ix = padding; iy = h - padding - ih; }
        else if (pos === 'br') { ix = w - padding - iw; iy = h - padding - ih; }
        else { ix = (w - iw) / 2; iy = (h - ih) / 2; }
        ctx.globalAlpha = op;
        ctx.drawImage(img, ix, iy, iw, ih);
        ctx.globalAlpha = 1;
    }

    function compositeWatermark() {
        var c = document.createElement('canvas');
        c.width = state.workingCanvas.width; c.height = state.workingCanvas.height;
        var ctx = c.getContext('2d');
        ctx.drawImage(state.workingCanvas, 0, 0);
        var text = document.getElementById('iwWText') ? document.getElementById('iwWText').value.trim() : '';
        var pos = document.getElementById('iwWPos').value;
        if (watermarkTab === 'text' && text) {
            var size = parseInt(document.getElementById('iwWSize').value, 10);
            var color = document.getElementById('iwWColor').value;
            var op = parseInt(document.getElementById('iwWOp').value, 10) / 100;
            drawTextWatermark(ctx, c.width, c.height, text, size, color, op, pos);
        } else if (watermarkTab === 'img' && watermarkImg) {
            var op2 = parseInt(document.getElementById('iwWOp').value, 10) / 100;
            drawImgWatermark(ctx, c.width, c.height, watermarkImg, op2, pos);
        }
        return c;
    }

    var wmScheduled = false;
    function scheduleWmPreview() {
        if (wmScheduled) return;
        wmScheduled = true;
        var run = function () {
            if (!wmScheduled) return;
            wmScheduled = false;
            if (!state.workingCanvas) return;
            var c = compositeWatermark();
            canvasEl.width = c.width; canvasEl.height = c.height;
            canvasEl.getContext('2d').drawImage(c, 0, 0);
        };
        requestAnimationFrame(run);
        setTimeout(run, 50);
    }

    function commitWatermark() {
        wmScheduled = false;   // 丢弃未触发的预览任务，避免在已提交画布上二次叠加水印（与调色同类问题）
        if (!state.workingCanvas) return;
        var has = false;
        if (watermarkTab === 'text') {
            var el = document.getElementById('iwWText');
            has = el && el.value.trim();
        } else {
            has = !!watermarkImg;
        }
        if (!has) { showToast('请先输入文字或选择水印图片'); return; }
        commitWorkingCanvas(compositeWatermark());
        showToast('已应用水印');
    }

    function bindWatermarkPanel() {
        var tabs = panelEl.querySelectorAll('.iw-tab');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].addEventListener('click', function () {
                watermarkTab = this.getAttribute('data-wtab');
                for (var j = 0; j < tabs.length; j++) tabs[j].classList.remove('active');
                this.classList.add('active');
                document.getElementById('iwWTabText').hidden = (watermarkTab !== 'text');
                document.getElementById('iwWTabImg').hidden = (watermarkTab !== 'img');
                scheduleWmPreview();
            });
        }
        var textInput = document.getElementById('iwWText');
        textInput.addEventListener('input', scheduleWmPreview);
        document.getElementById('iwWSize').addEventListener('input', function () {
            document.getElementById('iwWSizeVal').textContent = this.value;
            scheduleWmPreview();
        });
        document.getElementById('iwWColor').addEventListener('input', scheduleWmPreview);
        document.getElementById('iwWOp').addEventListener('input', function () {
            document.getElementById('iwWOpVal').textContent = (parseInt(this.value, 10) / 100).toFixed(2);
            scheduleWmPreview();
        });
        document.getElementById('iwWPos').addEventListener('change', scheduleWmPreview);

        var imgInput = document.getElementById('iwWImgFile');
        imgInput.addEventListener('change', function () {
            var f = imgInput.files[0];
            if (!f) return;
            var img = new Image();
            img.onload = function () {
                watermarkImg = img;
                document.getElementById('iwWImgInfo').textContent = f.name + ' · ' + img.width + '×' + img.height;
                scheduleWmPreview();
            };
            img.src = URL.createObjectURL(f);
        });

        document.getElementById('iwWApply').addEventListener('click', commitWatermark);
    }

    // ---------- 压缩 ----------
    function bindCompressPanel() {
        var fmtSel = document.getElementById('iwCompFormat');
        var qSlider = document.getElementById('iwCompQuality');
        var qVal = document.getElementById('iwCompQVal');
        var mwInput = document.getElementById('iwCompMaxWidth');

        // 打开时反映当前导出格式（WebP/JPEG 才出现在选项里）
        var cur = state.export.format;
        fmtSel.value = (cur === 'image/webp' || cur === 'image/jpeg') ? cur : 'image/webp';
        state.export.format = fmtSel.value;
        exportFormatSel.value = fmtSel.value;

        qSlider.value = String(state.export.quality);
        qVal.textContent = qSlider.value;
        mwInput.value = String(state.export.maxWidth);

        liveRefs.compressQuality = qSlider;

        fmtSel.addEventListener('change', function () {
            state.export.format = fmtSel.value;
            exportFormatSel.value = fmtSel.value;
            renderExportSummary();
            scheduleExportEstimate();
        });
        qSlider.addEventListener('input', function () {
            qVal.textContent = qSlider.value;
            state.export.quality = parseFloat(qSlider.value);
            exportQuality.value = qSlider.value;
            scheduleExportEstimate();
        });
        mwInput.addEventListener('change', function () {
            var v = parseInt(mwInput.value, 10);
            if (isNaN(v) || v < 100) { v = 1920; mwInput.value = '1920'; }
            state.export.maxWidth = v;
            exportMaxWidth.value = String(v);
            scheduleExportEstimate();
        });

        liveRefs.compResult = document.getElementById('iwCompResult');
        liveRefs.compThumb = document.getElementById('iwCompThumb');
        liveRefs.compInfo = document.getElementById('iwCompInfo');
        renderExportSummary();
    }

    // ---------- 格式转换 ----------
    function bindFormatPanel() {
        var btns = panelEl.querySelectorAll('.iw-format-btn');
        function syncActive() {
            for (var i = 0; i < btns.length; i++) {
                btns[i].classList.toggle('active', btns[i].getAttribute('data-fmt') === state.export.format);
            }
        }
        for (var i = 0; i < btns.length; i++) {
            btns[i].addEventListener('click', function () {
                if (this.disabled) return;
                state.export.format = this.getAttribute('data-fmt');
                exportFormatSel.value = state.export.format;
                syncActive();
                renderExportSummary();
                scheduleExportEstimate();
            });
        }
        syncActive();

        liveRefs.fmtResult = document.getElementById('iwFmtResult');
        liveRefs.fmtThumb = document.getElementById('iwFmtThumb');
        liveRefs.fmtInfo = document.getElementById('iwFmtInfo');
    }

    // ---------- 像素风 ----------
    function pixelate(canvas, grid) {
        var small = document.createElement('canvas');
        small.width = grid; small.height = grid;
        var sctx = small.getContext('2d');
        sctx.imageSmoothingEnabled = true;
        sctx.drawImage(canvas, 0, 0, grid, grid);
        var c = document.createElement('canvas');
        c.width = grid * 16; c.height = grid * 16;
        var ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;   // 最近邻放大 → 像素块清晰
        ctx.drawImage(small, 0, 0, c.width, c.height);
        return c;
    }

    function bindPixelPanel() {
        var gridSel = document.getElementById('iwPixelGrid');
        var previewBtn = document.getElementById('iwPixelPreview');
        var applyBtn = document.getElementById('iwPixelApply');

        function currentGrid() { return parseInt(gridSel.value, 10); }

        previewBtn.addEventListener('click', function () {
            if (!state.workingCanvas) return;
            var p = pixelate(state.workingCanvas, currentGrid());
            canvasEl.width = p.width; canvasEl.height = p.height;
            canvasEl.getContext('2d').drawImage(p, 0, 0);
            showToast('像素风预览 ' + p.width + '×' + p.height + '（未生效，点应用提交）');
        });
        applyBtn.addEventListener('click', function () {
            if (!state.workingCanvas) return;
            commitWorkingCanvas(pixelate(state.workingCanvas, currentGrid()));
            showToast('已应用像素风 ' + currentGrid() + '×' + currentGrid() + ' 网格');
        });
    }

    // ============ 裁剪指针交互（画布上）============

    canvasEl.addEventListener('pointerdown', function (e) {
        if (currentTool !== 'crop' || !state.workingCanvas) return;
        e.preventDefault();
        cropping = true;
        cropStart = pointerToNorm(e);
        cropSel = { x1: cropStart.x, y1: cropStart.y, x2: cropStart.x, y2: cropStart.y };
        try { canvasEl.setPointerCapture(e.pointerId); } catch (err) {}
        var applyBtn = document.getElementById('iwCropApply');
        if (applyBtn) applyBtn.disabled = true;
    });
    canvasEl.addEventListener('pointermove', function (e) {
        if (!cropping || !cropSel) return;
        var p = pointerToNorm(e);
        var ratio = currentCropRatio();
        if (ratio) {
            var c = clampToRatio(cropStart.x, cropStart.y, p.x, p.y, ratio);
            cropSel.x2 = c.x2; cropSel.y2 = c.y2;
        } else {
            cropSel.x2 = p.x; cropSel.y2 = p.y;
        }
        clampSel();
        renderCropOverlay();
        syncCropNums();
    });
    function endCrop() {
        if (!cropping) return;
        cropping = false;
        var applyBtn = document.getElementById('iwCropApply');
        if (applyBtn) applyBtn.disabled = !cropPixels();
    }
    canvasEl.addEventListener('pointerup', endCrop);
    canvasEl.addEventListener('pointercancel', endCrop);

    // ============ 导出区事件绑定 ============

    exportFormatSel.addEventListener('change', function () {
        state.export.format = exportFormatSel.value;
        renderExportSummary();
        if (state.workingCanvas) scheduleExportEstimate();
    });
    exportQuality.addEventListener('input', function () {
        state.export.quality = parseFloat(exportQuality.value);
        if (state.workingCanvas) scheduleExportEstimate();
    });
    exportMaxWidth.addEventListener('change', function () {
        var v = parseInt(exportMaxWidth.value, 10);
        if (isNaN(v) || v < 100) { v = 1920; exportMaxWidth.value = '1920'; }
        state.export.maxWidth = v;
        if (state.workingCanvas) scheduleExportEstimate();
    });
    exportBtn.addEventListener('click', doExport);

    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);
    resetBtn.addEventListener('click', resetAll);
    document.getElementById('iwBack').addEventListener('click', function () {
        location.href = 'https://xiaye.xyz/';
    });

    // ============ 重置 ============

    function resetAll() {
        state.originalFile = null;
        state.originalDataUrl = null;
        state.originalName = '';
        state.workingCanvas = null;
        state.history = [];
        state.historyIndex = -1;
        state.export.format = 'image/png';
        state.export.quality = 0.9;
        state.export.maxWidth = 1920;
        exportFormatSel.value = 'image/png';
        exportQuality.value = '0.9';
        exportMaxWidth.value = '1920';
        cropSel = null;
        cropping = false;
        watermarkImg = null;
        fileBadge.hidden = true;
        canvasWrap.hidden = true;
        cropOverlay.hidden = true;
        emptyTip.hidden = true;
        dropzone.style.display = '';
        statusEl.textContent = '未上传图片';
        sizeCompare.hidden = true;
        exportBtn.disabled = true;
        liveRefs = {};
        syncHistoryButtons();
        renderExportSummary();
        showTool('upload');
    }

    // ============ 拖拽上传 ============

    bindDropzone(dropzone, fileInput, function (files) { onFilePicked(files); });

    // ============ 工具切换 ============

    for (var i = 0; i < toolBtns.length; i++) {
        (function (btn) {
            btn.addEventListener('click', function () {
                var name = btn.getAttribute('data-tool');
                if (name !== 'upload' && !state.workingCanvas) {
                    showToast('请先上传图片');
                    return;
                }
                showTool(name);
            });
        })(toolBtns[i]);
    }

    // 窗口尺寸变化 → 裁剪选区层重新贴合
    window.addEventListener('resize', function () {
        if (currentTool === 'crop' && !cropOverlay.hidden) {
            layoutCropOverlay();
            renderCropOverlay();
        }
    });

    // ============ 初始化 ============

    // AVIF 输出能力探测（复用 image-format 思路）
    var probe = document.createElement('canvas');
    probe.width = probe.height = 1;
    var pctx = probe.getContext('2d');
    if (pctx) {
        pctx.fillStyle = '#fff';
        pctx.fillRect(0, 0, 1, 1);
        probe.toBlob(function (b) {
            state.export.avifSupported = !!(b && b.type === 'image/avif');
            var opt = document.getElementById('iwFmtAvif');
            if (opt) opt.disabled = !state.export.avifSupported;
            if (!state.export.avifSupported && state.export.format === 'image/avif') {
                state.export.format = 'image/png';
                exportFormatSel.value = 'image/png';
                renderExportSummary();
            }
        }, 'image/avif', 0.9);
    }

    bindTheme();
    spawnOrbs();
    showTool('upload');
    renderExportSummary();
    syncHistoryButtons();
})();

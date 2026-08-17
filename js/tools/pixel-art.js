// 夏夜工具集 - 像素画制作器 (ES5) 简陋版
// 最小闭环：网格画布 + 铅笔/橡皮 + 色板(预设+自定义) + 导出 PNG
// 进阶项（填色桶/取色器/撤销栈增强/导入转像素风/导出放大倍数可调）留待大版本
// cells 为二维数组存色值(null=透明)；显示用 DOM grid，导出走离屏 canvas 每格放大像素

window.initPixelArt = function(container) {

    var SIZE = 16;          // 网格尺寸（16 / 32）
    var GRID_W = 480;       // 画布显示宽度 px（两种尺寸格子自动缩放）
    var EXPORT_SCALE = 16;  // 导出放大倍数（每格像素放大成方块）
    var cellPx = GRID_W / SIZE;

    var cells = [];         // SIZE×SIZE 二维数组，色值字符串或 null
    var color = '#111827';  // 当前画笔色
    var tool = 'pen';       // 'pen' | 'eraser'
    var history = [];       // 撤销栈（每次笔触结束快照一次）
    var drawing = false;
    var lastPainted = null; // 本次笔触最后画的格，避免同格重复计数
    var importedImage = null; // 缓存导入的原始图片，用于实时调整色彩简化

    container.innerHTML =
        '<div class="px-wrap">' +
            '<div class="px-bar">' +
                '<span class="px-label">工具</span>' +
                '<button class="px-btn active" id="pxToolPen">&#x270F;&#xFE0F; 铅笔</button>' +
                '<button class="px-btn" id="pxToolEraser">&#x29A1; 橡皮</button>' +
                '<span class="px-label px-label-gap">尺寸</span>' +
                '<input type="number" class="px-size-input" id="pxSizeInput" min="8" max="64" value="16" title="8-64" />' +
                '<button class="px-btn active" id="pxSize16">16</button>' +
                '<button class="px-btn" id="pxSize32">32</button>' +
                '<button class="px-btn" id="pxSize48">48</button>' +
                '<button class="px-btn px-btn-plain" id="pxUndo">&#x21A9;&#xFE0F; 撤销</button>' +
                '<button class="px-btn px-btn-plain" id="pxClear">&#x1F5D1;&#xFE0F; 清空</button>' +
            '</div>' +
            '<div class="px-row">' +
                '<span class="px-label">颜色</span>' +
                '<span class="px-swatch" id="pxCurrent"></span>' +
                '<span class="px-palette" id="pxPalette"></span>' +
                '<input type="color" class="px-colorpick" id="pxColorPick" title="自定义取色" value="#111827" />' +
            '</div>' +
            '<div class="px-grid-wrap">' +
                '<div class="px-grid" id="pxGrid" style="width:' + GRID_W + 'px;grid-template-columns:repeat(' + SIZE + ',1fr);"></div>' +
            '</div>' +
            '<div class="px-actions">' +
                '<button class="px-btn px-btn-secondary" id="pxImport">&#x1F4C2; 导入图片</button>' +
                '<label class="px-checkbox"><input type="checkbox" id="pxSimplify" checked /><span>色彩简化</span></label>' +
                '<input type="number" class="px-color-input" id="pxColorCount" min="2" max="256" value="16" title="颜色数 2-256" />' +
                '<button class="px-btn px-btn-mini" id="pxColor4">4</button>' +
                '<button class="px-btn px-btn-mini" id="pxColor8">8</button>' +
                '<button class="px-btn px-btn-mini active" id="pxColor16">16</button>' +
                '<button class="px-btn px-btn-mini" id="pxColor32">32</button>' +
                '<button class="px-btn px-btn-primary" id="pxExport">&#x2B07; 导出 PNG（×' + EXPORT_SCALE + '）</button>' +
                '<span class="px-status" id="pxStatus">' + SIZE + '×' + SIZE + ' · 空白画布</span>' +
            '</div>' +
            '<div class="px-note">左键拖动画/擦，右键可擦除；切尺寸会清空画布；导入图片会自适应画布尺寸；导出为透明背景 PNG，每格放大 ' + EXPORT_SCALE + ' 倍。</div>' +
            '<input type="file" id="pxFileInput" accept="image/*" style="display:none;" />' +
        '</div>';

    var gridEl = document.getElementById('pxGrid');
    var currentEl = document.getElementById('pxCurrent');
    var paletteEl = document.getElementById('pxPalette');
    var statusEl = document.getElementById('pxStatus');

    // --- 预设色板（像素画常用 16 色）---
    var PALETTE = [
        '#000000', '#FFFFFF', '#E11D48', '#EF4444',
        '#F97316', '#FACC15', '#22C55E', '#10B981',
        '#14B8A6', '#06B6D4', '#3B82F6', '#8B5CF6',
        '#EC4899', '#92400E', '#6B7280', '#A3A3A3'
    ];

    // --- 数据 ---
    function initCells() {
        cells = [];
        for (var i = 0; i < SIZE; i++) {
            var row = [];
            for (var j = 0; j < SIZE; j++) row.push(null);
            cells.push(row);
        }
    }
    function snapshot() {
        var copy = [];
        for (var i = 0; i < SIZE; i++) copy.push(cells[i].slice());
        return copy;
    }
    function restore(shot) {
        cells = shot;
        renderAll();
    }
    function filledCount() {
        var n = 0;
        for (var i = 0; i < SIZE; i++) for (var j = 0; j < SIZE; j++) if (cells[i][j]) n++;
        return n;
    }
    function updateStatus() {
        var n = filledCount();
        statusEl.textContent = SIZE + '×' + SIZE + ' · ' + (n ? '已画 ' + n + ' 格' : '空白画布');
    }

    // --- 渲染网格 ---
    function renderGrid() {
        var html = '';
        var emptyBg = document.body.classList.contains('night') ? 'rgba(30,41,59,0.35)' : 'rgba(255,255,255,0.25)';
        for (var i = 0; i < SIZE; i++) {
            for (var j = 0; j < SIZE; j++) {
                var c = cells[i][j];
                html += '<div class="px-cell" data-i="' + i + '" data-j="' + j + '" style="background:' + (c || emptyBg) + ';"></div>';
            }
        }
        gridEl.innerHTML = html;
    }
    function renderAll() { renderGrid(); updateStatus(); }
    function paintCell(i, j) {
        if (i < 0 || j < 0 || i >= SIZE || j >= SIZE) return;
        var val = tool === 'eraser' ? null : color;
        if (cells[i][j] === val) return;
        cells[i][j] = val;
        var cell = gridEl.querySelector('.px-cell[data-i="' + i + '"][data-j="' + j + '"]');
        if (cell) {
            var emptyBg = document.body.classList.contains('night') ? 'rgba(30,41,59,0.35)' : 'rgba(255,255,255,0.25)';
            cell.style.background = val || emptyBg;
        }
        lastPainted = i + ',' + j;
    }
    function cellFromEvent(e) {
        var rect = gridEl.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;
        return { i: Math.floor(y / rect.height * SIZE), j: Math.floor(x / rect.width * SIZE) };
    }

    // --- 指针事件（笔触模型：down 开始 → move 拖动 → up 结束入撤销栈）---
    gridEl.addEventListener('pointerdown', function(e) {
        if (e.button === 2) tool = 'eraser'; // 右键临时橡皮（不改变按钮态）
        drawing = true;
        lastPainted = null;
        history.push(snapshot()); // 笔触开始前入栈：撤销=回到笔触前状态
        if (history.length > 20) history.shift();
        var pos = cellFromEvent(e);
        if (pos) paintCell(pos.i, pos.j);
        try { gridEl.setPointerCapture(e.pointerId); } catch (err) {}
        e.preventDefault();
    });
    gridEl.addEventListener('pointermove', function(e) {
        if (!drawing) return;
        var pos = cellFromEvent(e);
        if (pos) paintCell(pos.i, pos.j);
    });
    function endStroke() {
        if (!drawing) return;
        drawing = false;
        updateStatus();
    }
    gridEl.addEventListener('pointerup', endStroke);
    gridEl.addEventListener('pointercancel', endStroke);
    // 右键擦除不弹菜单
    gridEl.addEventListener('contextmenu', function(e) { e.preventDefault(); });

    // --- 工具栏 ---
    var penBtn = document.getElementById('pxToolPen');
    var eraserBtn = document.getElementById('pxToolEraser');
    function setTool(t) {
        tool = t;
        penBtn.classList.toggle('active', t === 'pen');
        eraserBtn.classList.toggle('active', t === 'eraser');
    }
    penBtn.addEventListener('click', function() { setTool('pen'); });
    eraserBtn.addEventListener('click', function() { setTool('eraser'); });

    var sizeInput = document.getElementById('pxSizeInput');
    var size16 = document.getElementById('pxSize16');
    var size32 = document.getElementById('pxSize32');
    var size48 = document.getElementById('pxSize48');

    function setSize(n) {
        n = Math.max(8, Math.min(64, parseInt(n) || 16)); // 限制 8-64
        SIZE = n;
        cellPx = GRID_W / n;
        gridEl.style.gridTemplateColumns = 'repeat(' + n + ',1fr)';
        history = [];
        importedImage = null; // 清空导入的图片缓存
        initCells();
        renderGrid();
        updateStatus();

        // 更新输入框和按钮状态
        sizeInput.value = n;
        size16.classList.toggle('active', n === 16);
        size32.classList.toggle('active', n === 32);
        size48.classList.toggle('active', n === 48);
    }

    // 输入框变化时应用尺寸
    sizeInput.addEventListener('change', function() {
        var n = parseInt(this.value);
        if (n >= 8 && n <= 64) setSize(n);
        else { this.value = SIZE; showToast('尺寸范围 8-64'); }
    });
    sizeInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') this.blur(); // 回车应用
    });
    size16.addEventListener('click', function() { setSize(16); });
    size32.addEventListener('click', function() { setSize(32); });
    size48.addEventListener('click', function() { setSize(48); });

    document.getElementById('pxUndo').addEventListener('click', function() {
        if (!history.length) { showToast('没有可撤销的笔触'); return; }
        restore(history.pop());
        updateStatus();
        showToast('已撤销');
    });
    document.getElementById('pxClear').addEventListener('click', function() {
        if (!filledCount()) { showToast('画布本来就是空的'); return; }
        history.push(snapshot());
        importedImage = null; // 清空导入的图片缓存
        initCells();
        renderGrid();
        updateStatus();
        showToast('已清空');
    });

    // --- 色板 ---
    var palHtml = '';
    for (var p = 0; p < PALETTE.length; p++) {
        palHtml += '<button class="px-pal" data-color="' + PALETTE[p] + '" style="background:' + PALETTE[p] + ';" title="' + PALETTE[p] + '"></button>';
    }
    paletteEl.innerHTML = palHtml;
    var palBtns = paletteEl.querySelectorAll('.px-pal');
    function setColor(c) {
        color = c;
        currentEl.style.background = c;
        currentEl.title = c;
    }
    for (var k = 0; k < palBtns.length; k++) {
        palBtns[k].addEventListener('click', function() {
            setColor(this.getAttribute('data-color'));
            setTool('pen');
        });
    }
    document.getElementById('pxColorPick').addEventListener('input', function() {
        setColor(this.value);
        setTool('pen');
    });
    setColor(color);

    // --- 导入图片转像素画 ---
    var fileInput = document.getElementById('pxFileInput');
    var simplifyCheck = document.getElementById('pxSimplify');
    var colorCountInput = document.getElementById('pxColorCount');

    // 色彩量化（K-means 聚类简化颜色）
    function quantizeColors(pixels, k) {
        // 随机选择 k 个初始中心点
        var centroids = [];
        for (var i = 0; i < k; i++) {
            var idx = Math.floor(Math.random() * pixels.length);
            centroids.push(pixels[idx].slice());
        }

        // 迭代优化（最多 10 轮）
        for (var iter = 0; iter < 10; iter++) {
            var clusters = [];
            for (var c = 0; c < k; c++) clusters.push([]);

            // 分配像素到最近的中心
            for (var p = 0; p < pixels.length; p++) {
                var px = pixels[p];
                var minDist = Infinity, minIdx = 0;
                for (var c = 0; c < k; c++) {
                    var dist = Math.pow(px[0] - centroids[c][0], 2) +
                               Math.pow(px[1] - centroids[c][1], 2) +
                               Math.pow(px[2] - centroids[c][2], 2);
                    if (dist < minDist) { minDist = dist; minIdx = c; }
                }
                clusters[minIdx].push(px);
            }

            // 更新中心点
            for (var c = 0; c < k; c++) {
                if (clusters[c].length === 0) continue;
                var sumR = 0, sumG = 0, sumB = 0;
                for (var i = 0; i < clusters[c].length; i++) {
                    sumR += clusters[c][i][0];
                    sumG += clusters[c][i][1];
                    sumB += clusters[c][i][2];
                }
                var n = clusters[c].length;
                centroids[c] = [Math.round(sumR / n), Math.round(sumG / n), Math.round(sumB / n)];
            }
        }

        // 将每个像素映射到最近的中心颜色
        var result = [];
        for (var p = 0; p < pixels.length; p++) {
            var px = pixels[p];
            var minDist = Infinity, nearest = centroids[0];
            for (var c = 0; c < k; c++) {
                var dist = Math.pow(px[0] - centroids[c][0], 2) +
                           Math.pow(px[1] - centroids[c][1], 2) +
                           Math.pow(px[2] - centroids[c][2], 2);
                if (dist < minDist) { minDist = dist; nearest = centroids[c]; }
            }
            result.push(nearest);
        }
        return result;
    }

    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(function(x) {
            var hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    // 处理导入的图片数据到画布
    function processImportedImage() {
        if (!importedImage) return;

        var img = importedImage;
        // 绘制到临时 canvas 并缩放到 SIZE×SIZE
        var tempCanvas = document.createElement('canvas');
        tempCanvas.width = SIZE;
        tempCanvas.height = SIZE;
        var tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0, SIZE, SIZE);

        // 读取像素数据
        var imageData = tempCtx.getImageData(0, 0, SIZE, SIZE);
        var data = imageData.data;
        var pixels = [];

        for (var i = 0; i < SIZE; i++) {
            for (var j = 0; j < SIZE; j++) {
                var idx = (i * SIZE + j) * 4;
                var r = data[idx];
                var g = data[idx + 1];
                var b = data[idx + 2];
                var a = data[idx + 3];
                pixels.push([r, g, b, a]);
            }
        }

        // 如果启用色彩简化，进行量化
        if (simplifyCheck.checked) {
            var colorCount = parseInt(colorCountInput.value);
            // 只对不透明像素进行量化
            var opaquePixels = pixels.filter(function(p) { return p[3] > 128; }).map(function(p) { return [p[0], p[1], p[2]]; });
            if (opaquePixels.length > 0) {
                var quantized = quantizeColors(opaquePixels, colorCount);
                var qIdx = 0;
                for (var i = 0; i < pixels.length; i++) {
                    if (pixels[i][3] > 128) {
                        var q = quantized[qIdx++];
                        pixels[i] = [q[0], q[1], q[2], 255];
                    }
                }
            }
        }

        // 填充到画布
        for (var i = 0; i < SIZE; i++) {
            for (var j = 0; j < SIZE; j++) {
                var px = pixels[i * SIZE + j];
                if (px[3] > 128) { // 半透明以上才填充
                    cells[i][j] = rgbToHex(px[0], px[1], px[2]);
                } else {
                    cells[i][j] = null; // 透明部分留空
                }
            }
        }

        renderAll();
    }

    document.getElementById('pxImport').addEventListener('click', function() {
        fileInput.click();
    });

    fileInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;

        var img = new Image();
        var reader = new FileReader();
        reader.onload = function(evt) {
            img.onload = function() {
                // 缓存原始图片
                importedImage = img;

                // 入撤销栈
                history.push(snapshot());
                if (history.length > 20) history.shift();

                // 处理并显示
                processImportedImage();
                showToast('已导入图片' + (simplifyCheck.checked ? '（' + colorCountInput.value + '色简化）' : ''));
            };
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
        fileInput.value = ''; // 清空以便重复导入同一文件
    });

    // 色彩数快捷按钮
    var colorCountInput = document.getElementById('pxColorCount');
    var color4Btn = document.getElementById('pxColor4');
    var color8Btn = document.getElementById('pxColor8');
    var color16Btn = document.getElementById('pxColor16');
    var color32Btn = document.getElementById('pxColor32');

    function setColorCount(n) {
        n = Math.max(2, Math.min(256, parseInt(n) || 16));
        colorCountInput.value = n;

        // 更新按钮状态
        color4Btn.classList.toggle('active', n === 4);
        color8Btn.classList.toggle('active', n === 8);
        color16Btn.classList.toggle('active', n === 16);
        color32Btn.classList.toggle('active', n === 32);

        // 如果有导入的图片且启用简化，立即刷新
        if (importedImage && simplifyCheck.checked) {
            processImportedImage();
            showToast('已切换为 ' + n + ' 色简化');
        }
    }

    color4Btn.addEventListener('click', function() { setColorCount(4); });
    color8Btn.addEventListener('click', function() { setColorCount(8); });
    color16Btn.addEventListener('click', function() { setColorCount(16); });
    color32Btn.addEventListener('click', function() { setColorCount(32); });

    colorCountInput.addEventListener('change', function() {
        var n = parseInt(this.value);
        if (n >= 2 && n <= 256) {
            setColorCount(n);
        } else {
            this.value = colorCountInput.value;
            showToast('颜色数范围 2-256');
        }
    });

    colorCountInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') this.blur();
    });

    // 色彩简化选项变化时重新处理
    simplifyCheck.addEventListener('change', function() {
        if (importedImage) {
            processImportedImage();
            showToast(this.checked ? '已启用色彩简化（' + colorCountInput.value + '色）' : '已关闭色彩简化');
        }
    });

    // --- 导出 PNG ---
    document.getElementById('pxExport').addEventListener('click', function() {
        var n = filledCount();
        if (!n) { showToast('画布是空的，画点什么再导出吧'); return; }
        var c = document.createElement('canvas');
        c.width = SIZE * EXPORT_SCALE;
        c.height = SIZE * EXPORT_SCALE;
        var ctx = c.getContext('2d');
        for (var i = 0; i < SIZE; i++) {
            for (var j = 0; j < SIZE; j++) {
                if (cells[i][j]) {
                    ctx.fillStyle = cells[i][j];
                    ctx.fillRect(j * EXPORT_SCALE, i * EXPORT_SCALE, EXPORT_SCALE, EXPORT_SCALE);
                }
            }
        }
        c.toBlob(function(blob) {
            if (!blob) { showToast('导出失败，浏览器不支持'); return; }
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'pixel-art-' + SIZE + 'x' + SIZE + '.png';
            document.body.appendChild(a);
            a.click();
            setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 100);
            showToast('已导出 ' + SIZE + '×' + SIZE + ' 像素 PNG');
        }, 'image/png');
    });

    // --- 初始化空白画布 ---
    initCells();
    renderGrid();
    updateStatus();
};

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

    container.innerHTML =
        '<div class="px-wrap">' +
            '<div class="px-bar">' +
                '<span class="px-label">工具</span>' +
                '<button class="px-btn active" id="pxToolPen">&#x270F;&#xFE0F; 铅笔</button>' +
                '<button class="px-btn" id="pxToolEraser">&#x29A1; 橡皮</button>' +
                '<span class="px-label px-label-gap">尺寸</span>' +
                '<button class="px-btn active" id="pxSize16">16</button>' +
                '<button class="px-btn" id="pxSize32">32</button>' +
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
                '<button class="px-btn px-btn-primary" id="pxExport">&#x2B07; 导出 PNG（×' + EXPORT_SCALE + '）</button>' +
                '<span class="px-status" id="pxStatus">' + SIZE + '×' + SIZE + ' · 空白画布</span>' +
            '</div>' +
            '<div class="px-note">左键拖动画/擦，右键可擦除；切尺寸会清空画布；导出为透明背景 PNG，每格放大 ' + EXPORT_SCALE + ' 倍。</div>' +
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

    var size16 = document.getElementById('pxSize16');
    var size32 = document.getElementById('pxSize32');
    function setSize(n) {
        SIZE = n;
        cellPx = GRID_W / n;
        gridEl.style.gridTemplateColumns = 'repeat(' + n + ',1fr)';
        history = [];
        initCells();
        renderGrid();
        updateStatus();
        size16.classList.toggle('active', n === 16);
        size32.classList.toggle('active', n === 32);
    }
    size16.addEventListener('click', function() { setSize(16); });
    size32.addEventListener('click', function() { setSize(32); });

    document.getElementById('pxUndo').addEventListener('click', function() {
        if (!history.length) { showToast('没有可撤销的笔触'); return; }
        restore(history.pop());
        updateStatus();
        showToast('已撤销');
    });
    document.getElementById('pxClear').addEventListener('click', function() {
        if (!filledCount()) { showToast('画布本来就是空的'); return; }
        history.push(snapshot());
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

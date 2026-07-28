// 夏夜工具集 - 二维码生成工具 (ES5)

window.initQRCode = function(container) {

    var qrTimer = null;
    var qrLoaded = false;
    var currentText = '';

    // --- 构建 UI ---
    container.innerHTML =
        '<div class="qr-container">' +
            '<textarea class="qr-textarea" id="qrInput" placeholder="输入文本或 URL..." spellcheck="false"></textarea>' +
            '<div class="qr-canvas-wrap" id="qrCanvasWrap">' +
                '<div id="qrCodeEl"></div>' +
            '</div>' +
            '<div class="qr-options">' +
                '<div>' +
                    '<label for="qrSize">尺寸</label>' +
                    '<select id="qrSize">' +
                        '<option value="128">小 (128x128)</option>' +
                        '<option value="256" selected>中 (256x256)</option>' +
                        '<option value="384">大 (384x384)</option>' +
                    '</select>' +
                '</div>' +
                '<div>' +
                    '<label for="qrErrorCorrection">纠错</label>' +
                    '<select id="qrErrorCorrection">' +
                        '<option value="L">低 (L)</option>' +
                        '<option value="M" selected>中 (M)</option>' +
                        '<option value="Q">较高 (Q)</option>' +
                        '<option value="H">高 (H)</option>' +
                    '</select>' +
                '</div>' +
            '</div>' +
            '<div class="qr-btn-group">' +
                '<button class="qr-btn" id="qrDownload">&#x2B07; 下载 PNG</button>' +
                '<button class="qr-btn" id="qrClear">&#x1F5D1; 清空</button>' +
            '</div>' +
        '</div>';

    var input = document.getElementById('qrInput');
    var qrEl = document.getElementById('qrCodeEl');
    var sizeSelect = document.getElementById('qrSize');
    var ecSelect = document.getElementById('qrErrorCorrection');
    var downloadBtn = document.getElementById('qrDownload');
    var clearBtn = document.getElementById('qrClear');

    // --- 加载 qrcodejs ---
    function loadQRCodeLib(callback) {
        if (typeof QRCode !== 'undefined') {
            qrLoaded = true;
            callback();
            return;
        }
        var script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
        script.onload = function() {
            qrLoaded = true;
            callback();
        };
        script.onerror = function() {
            qrEl.innerHTML = '<span style="color:#DC2626;">加载二维码库失败，请检查网络连接</span>';
        };
        document.body.appendChild(script);
    }

    // --- 生成二维码 ---
    function generateQR(text) {
        if (!qrLoaded) return;
        if (!text.trim()) {
            qrEl.innerHTML = '<span class="qr-placeholder">&#x1F447; 输入文本后自动生成二维码</span>';
            return;
        }

        var size = parseInt(sizeSelect.value, 10);
        var ec = ecSelect.value;

        // 清除旧的二维码
        qrEl.innerHTML = '';

        try {
            new QRCode(qrEl, {
                text: text,
                width: size,
                height: size,
                colorDark: '#1E293B',
                colorLight: '#ffffff',
                correctLevel: getECLevel(ec)
            });
        } catch (e) {
            qrEl.innerHTML = '<span style="color:#DC2626;">生成失败: ' + e.message + '</span>';
        }
    }

    function getECLevel(level) {
        if (typeof QRCode === 'undefined') return undefined;
        var QRErrorCorrectLevel = QRCode.CorrectLevel;
        switch (level) {
            case 'L': return QRErrorCorrectLevel.L;
            case 'M': return QRErrorCorrectLevel.M;
            case 'Q': return QRErrorCorrectLevel.Q;
            case 'H': return QRErrorCorrectLevel.H;
            default: return QRErrorCorrectLevel.M;
        }
    }

    function regenerate() {
        if (!qrLoaded) return;
        generateQR(currentText);
    }

    // --- 防抖输入 ---
    function onInput() {
        if (qrTimer) clearTimeout(qrTimer);
        qrTimer = setTimeout(function() {
            currentText = input.value;
            generateQR(currentText);
        }, 500);
    }

    // --- 下载 PNG ---
    function download() {
        var canvas = qrEl.querySelector('canvas');
        if (!canvas) {
            showToast('没有可下载的二维码');
            return;
        }
        var link = document.createElement('a');
        link.download = 'qrcode.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    // --- 清空 ---
    function clearAll() {
        input.value = '';
        currentText = '';
        qrEl.innerHTML = '<span class="qr-placeholder">&#x1F447; 输入文本后自动生成二维码</span>';
    }

    // --- 事件绑定 ---
    input.addEventListener('input', onInput);
    sizeSelect.addEventListener('change', function() {
        if (currentText) regenerate();
    });
    ecSelect.addEventListener('change', function() {
        if (currentText) regenerate();
    });
    downloadBtn.addEventListener('click', download);
    clearBtn.addEventListener('click', clearAll);

    // --- 初始化 ---
    qrEl.innerHTML = '<span class="qr-placeholder">&#x1F447; 输入文本后自动生成二维码</span>';

    loadQRCodeLib(function() {
        // 如果已经有内容了，生成
        if (input.value.trim()) {
            generateQR(input.value.trim());
        }
    });
};

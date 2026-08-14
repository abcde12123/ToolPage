// 夏夜工具集 - 图片格式互转工具 (ES5)
// 纯前端：canvas 原生转换，零依赖，数据不出浏览器
// 输出：PNG / JPEG / WebP / AVIF（探测支持）/ ICO（PNG 封装，≤256px）

window.initImageFormat = function (container) {

    var originalFile = null;
    var originalDataUrl = null;
    var resultBlob = null;      // 最近一次转换的 blob（供下载）
    var resultExt = 'png';      // 最近一次输出扩展名
    var avifSupported = false;  // 是否支持 AVIF 输出

    // --- 探测 AVIF 支持 ---
    var probe = document.createElement('canvas');
    probe.width = probe.height = 1;
    var pctx = probe.getContext('2d');
    if (pctx) {
        pctx.fillStyle = '#fff';
        pctx.fillRect(0, 0, 1, 1);
        probe.toBlob(function (b) {
            avifSupported = !!(b && b.type === 'image/avif');
            if (!avifSupported) {
                var opt = document.getElementById('ifFormatAvif');
                if (opt) opt.disabled = true;
            }
        }, 'image/avif', 0.9);
    }

    // --- 构建 UI ---
    container.innerHTML =
        '<div class="ic-container">' +
            '<div class="ic-dropzone" id="ifDropzone">' +
                '<div class="ic-icon">&#x1F504;</div>' +
                '<p>拖拽图片到此处，或点击选择文件</p>' +
                '<p style="font-size:0.78rem;color:#A8A29E;margin-top:4px;">支持 JPG / PNG / WebP / GIF / BMP / SVG，最大 20MB</p>' +
            '</div>' +
            '<input type="file" id="ifFileInput" accept="image/*" style="display:none;" />' +

            '<div class="ic-preview-row" id="ifPreviewRow" style="display:none;">' +
                '<div class="ic-preview-col">' +
                    '<label>原始图片</label>' +
                    '<div class="ic-preview-wrap" id="ifOriginalPreview"></div>' +
                    '<div class="ic-info" id="ifOriginalInfo"></div>' +
                '</div>' +
                '<div class="ic-preview-col">' +
                    '<label>转换后</label>' +
                    '<div class="ic-preview-wrap" id="ifResultPreview"></div>' +
                    '<div class="ic-info" id="ifResultInfo"></div>' +
                '</div>' +
            '</div>' +

            '<div class="ic-options" id="ifOptions" style="display:none;">' +
                '<label for="ifFormat">转为:</label>' +
                '<select id="ifFormat">' +
                    '<option value="image/png">PNG（无损）</option>' +
                    '<option value="image/jpeg">JPEG</option>' +
                    '<option value="image/webp">WebP</option>' +
                    '<option value="image/avif" id="ifFormatAvif">AVIF</option>' +
                    '<option value="image/x-icon">ICO（图标，最大 256px）</option>' +
                '</select>' +
                '<label>质量: <span class="ic-slider-val" id="ifQualityVal">0.90</span></label>' +
                '<input class="ic-slider" id="ifQuality" type="range" min="0.1" max="1" step="0.05" value="0.9" />' +
                '<button class="ic-btn ic-btn-primary" id="ifDownload">&#x2B07; 下载</button>' +
                '<button class="ic-btn" id="ifReset">&#x1F504; 重置</button>' +
            '</div>' +
        '</div>';

    var dropzone = document.getElementById('ifDropzone');
    var fileInput = document.getElementById('ifFileInput');
    var previewRow = document.getElementById('ifPreviewRow');
    var originalPreview = document.getElementById('ifOriginalPreview');
    var resultPreview = document.getElementById('ifResultPreview');
    var originalInfo = document.getElementById('ifOriginalInfo');
    var resultInfo = document.getElementById('ifResultInfo');
    var options = document.getElementById('ifOptions');
    var formatSelect = document.getElementById('ifFormat');
    var qualitySlider = document.getElementById('ifQuality');
    var qualityVal = document.getElementById('ifQualityVal');
    var downloadBtn = document.getElementById('ifDownload');
    var resetBtn = document.getElementById('ifReset');

    // --- 拖拽上传 ---
    dropzone.addEventListener('click', function () { fileInput.click(); });
    dropzone.addEventListener('dragover', function (e) {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });
    dropzone.addEventListener('dragleave', function (e) {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
    });
    dropzone.addEventListener('drop', function (e) {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        var files = e.dataTransfer.files;
        if (files.length > 0) handleFile(files[0]);
    });
    fileInput.addEventListener('change', function () {
        if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
    });

    // --- 处理文件 ---
    function handleFile(file) {
        if (file.size > 20 * 1024 * 1024) {
            showToast('图片超过 20MB 限制');
            return;
        }
        if (file.type.indexOf('image/') !== 0 && !/\.svg$/i.test(file.name)) {
            showToast('请选择图片文件');
            return;
        }
        originalFile = file;
        var reader = new FileReader();
        reader.onload = function (e) {
            originalDataUrl = e.target.result;
            showOriginal();
            convert();
            previewRow.style.display = 'flex';
            options.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    }

    // --- 显示原始图片 ---
    function showOriginal() {
        originalPreview.innerHTML = '<img src="' + originalDataUrl + '" alt="原始图片" />';
        originalInfo.textContent = formatFileSize(originalFile.size) + ' | ' + originalFile.name;
    }

    // --- 转换 ---
    function convert() {
        if (!originalDataUrl) return;
        var img = new Image();
        img.onload = function () {
            // SVG 无固有尺寸时兜底
            var w = img.naturalWidth || img.width;
            var h = img.naturalHeight || img.height;
            if (!w || !h) { w = 800; h = 600; }

            var format = formatSelect.value;
            var isLossless = (format === 'image/png' || format === 'image/x-icon');

            // ICO 限 256px（favicon 常用尺寸，超过部分系统可能不认）
            var outW = w, outH = h;
            if (format === 'image/x-icon') {
                var scale = Math.min(1, 256 / Math.max(w, h));
                outW = Math.max(1, Math.round(w * scale));
                outH = Math.max(1, Math.round(h * scale));
            }

            var canvas = document.createElement('canvas');
            canvas.width = outW;
            canvas.height = outH;
            var ctx = canvas.getContext('2d');
            // JPEG/ICO 无透明底，先铺白底避免黑边
            if (format === 'image/jpeg') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, outW, outH);
            }
            ctx.drawImage(img, 0, 0, outW, outH);

            var quality = isLossless ? undefined : parseFloat(qualitySlider.value);

            if (format === 'image/x-icon') {
                // 先出 PNG 再封装 ICO
                canvas.toBlob(function (pngBlob) {
                    if (!pngBlob) { failToast(); return; }
                    buildIco(pngBlob, outW, outH, function (icoBlob) {
                        showResult(icoBlob, 'ico', format);
                    });
                }, 'image/png');
            } else if (format === 'image/avif' && !avifSupported) {
                showToast('当前浏览器不支持 AVIF，请换用 Chrome / Edge');
            } else {
                canvas.toBlob(function (blob) {
                    if (!blob) { failToast(); return; }
                    showResult(blob, extOf(format), format);
                }, format, quality);
            }
        };
        img.src = originalDataUrl;
    }

    function showResult(blob, ext, mime) {
        resultBlob = blob;
        resultExt = ext;
        if (resultPreview._objUrl) URL.revokeObjectURL(resultPreview._objUrl);
        var url = URL.createObjectURL(blob);
        resultPreview._objUrl = url;
        resultPreview.innerHTML = '<img src="' + url + '" alt="转换后图片" />';

        var delta = (blob.size / originalFile.size - 1) * 100;
        var sign = delta >= 0 ? '+' : '';
        var tip = mime === 'image/x-icon' ? '（≤256px）' : '';
        resultInfo.textContent = formatFileSize(blob.size) + ' | ' + sign + delta.toFixed(1) + '%' + tip;
    }

    function failToast() {
        showToast('转换失败，请换一张图片试试');
    }

    // --- 下载 ---
    function downloadResult() {
        if (!resultBlob) {
            showToast('请先上传图片');
            return;
        }
        var link = document.createElement('a');
        link.download = originalFile ? originalFile.name.replace(/\.[^.]+$/, '') + '.' + resultExt : 'image.' + resultExt;
        link.href = resultPreview._objUrl || URL.createObjectURL(resultBlob);
        link.click();
    }

    // --- 重置 ---
    function resetAll() {
        originalFile = null;
        originalDataUrl = null;
        resultBlob = null;
        resultExt = 'png';
        originalPreview.innerHTML = '';
        resultPreview.innerHTML = '';
        originalInfo.textContent = '';
        resultInfo.textContent = '';
        previewRow.style.display = 'none';
        options.style.display = 'none';
        fileInput.value = '';
        qualitySlider.value = '0.9';
        qualityVal.textContent = '0.90';
        formatSelect.value = 'image/png';
    }

    // --- 事件绑定 ---
    qualitySlider.addEventListener('input', function () {
        qualityVal.textContent = parseFloat(qualitySlider.value).toFixed(2);
        var lossless = (formatSelect.value === 'image/png' || formatSelect.value === 'image/x-icon');
        qualitySlider.disabled = lossless;
        if (originalDataUrl && !lossless) convert();
    });

    formatSelect.addEventListener('change', function () {
        var lossless = (formatSelect.value === 'image/png' || formatSelect.value === 'image/x-icon');
        qualitySlider.disabled = lossless;
        if (originalDataUrl) convert();
    });

    downloadBtn.addEventListener('click', downloadResult);
    resetBtn.addEventListener('click', resetAll);

    // --- 工具函数 ---

    // MIME -> 扩展名
    function extOf(mime) {
        if (mime === 'image/jpeg') return 'jpg';
        if (mime === 'image/webp') return 'webp';
        if (mime === 'image/avif') return 'avif';
        if (mime === 'image/x-icon') return 'ico';
        return 'png';
    }

    // PNG blob 封装成 ICO（现代系统支持 PNG 压缩 ICO）
    function buildIco(pngBlob, w, h, cb) {
        var reader = new FileReader();
        reader.onload = function () {
            var bytes = new Uint8Array(reader.result);
            var out = new Uint8Array(22 + bytes.length);
            var dv = new DataView(out.buffer);
            dv.setUint16(0, 0, true);            // reserved
            dv.setUint16(2, 1, true);            // type = icon
            dv.setUint16(4, 1, true);            // count = 1
            dv.setUint8(6, w > 255 ? 0 : w);     // width（0 = 256）
            dv.setUint8(7, h > 255 ? 0 : h);     // height
            dv.setUint8(8, 0);                   // palette colors
            dv.setUint8(9, 0);                   // reserved
            dv.setUint16(10, 1, true);           // planes
            dv.setUint16(12, 32, true);          // bit count
            dv.setUint32(14, bytes.length, true);// image size
            dv.setUint32(18, 22, true);          // offset to image data
            out.set(bytes, 22);
            cb(new Blob([out], { type: 'image/x-icon' }));
        };
        reader.readAsArrayBuffer(pngBlob);
    }
};

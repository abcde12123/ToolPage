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
                '<div class="ic-opt-row">' +
                    '<label for="ifFormat">转为:</label>' +
                    '<select id="ifFormat">' +
                        '<option value="image/png">PNG（无损）</option>' +
                        '<option value="image/jpeg">JPEG</option>' +
                        '<option value="image/webp">WebP</option>' +
                        '<option value="image/avif" id="ifFormatAvif">AVIF</option>' +
                        '<option value="image/x-icon">ICO（图标，最大 256px）</option>' +
                    '</select>' +
                    '<div class="ic-opt-spacer"></div>' +
                    '<button class="ic-btn ic-btn-primary" id="ifDownload">&#x2B07; 下载</button>' +
                    '<button class="ic-btn" id="ifReset">&#x1F504; 重置</button>' +
                '</div>' +
                '<div class="ic-opt-row">' +
                    '<label>质量:</label>' +
                    '<input class="ic-quality-input" id="ifQualityInput" type="number" step="0.05" value="0.9" title="可手动输入 0.1~1；输负数触发彩蛋" />' +
                    '<input class="ic-slider" id="ifQuality" type="range" min="0.1" max="1" step="0.05" value="0.9" />' +
                '</div>' +
                '<div class="ic-slider-note-row">' +
                    '<span class="ic-slider-note" id="ifSliderNote">当前格式为无损（PNG/ICO），无需质量设置</span>' +
                '</div>' +
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
    var qualityInput = document.getElementById('ifQualityInput');
    var sliderNote = document.getElementById('ifSliderNote');
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
            dropzone.style.display = 'none'; // 选图成功后收起拖拽框，界面更干净
        };
        reader.readAsDataURL(file);
    }

    // --- 显示原始图片 ---
    function showOriginal() {
        originalPreview.innerHTML = '<img src="' + originalDataUrl + '" alt="原始图片" />';
        originalInfo.textContent = formatFileSize(originalFile.size) + ' | ' + originalFile.name;
    }

    // --- 转换 ---
    // 版本号：每次 convert 锁定当时的格式/质量，所有异步回调（onload/toBlob/ICO）都校验版本，
    // 只有最新一次转换的结果会显示，杜绝快速切换时旧结果晚到覆盖新值
    var convertVersion = 0;
    function convert() {
        if (!originalDataUrl) return;
        var myVer = ++convertVersion;
        var format = formatSelect.value; // 调用时锁定格式，避免 onload 时读到已切换的新格式
        var isLossless = (format === 'image/png' || format === 'image/x-icon');
        var qRaw = parseFloat(qualityInput.value);   // 手动输入值（可为负）
        var isGlitch = !isNaN(qRaw) && qRaw < 0;     // 负数 = 彩蛋模式
        var quality = isGlitch ? 0.95
            : (isLossless ? undefined : Math.min(1, Math.max(0.1, isNaN(qRaw) ? 0.9 : qRaw)));
        var glitchIntensity = isGlitch ? Math.min(1, Math.abs(qRaw)) : 0;
        var isCurrent = function () { return myVer === convertVersion; };

        var img = new Image();
        img.onload = function () {
            if (!isCurrent()) return; // 过期结果，丢弃
            // SVG 无固有尺寸时兜底
            var w = img.naturalWidth || img.width;
            var h = img.naturalHeight || img.height;
            if (!w || !h) { w = 800; h = 600; }

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

            // 彩蛋：负数质量 → 像素级「炸裂的糊」（撕裂 + 马赛克 + 彩色噪点），强度随 |负值| 增大
            if (isGlitch) {
                applyGlitch(ctx, outW, outH, glitchIntensity);
            }

            if (format === 'image/x-icon') {
                // 先出 PNG 再封装 ICO
                canvas.toBlob(function (pngBlob) {
                    if (!isCurrent()) return;
                    if (!pngBlob) { failToast(); return; }
                    buildIco(pngBlob, outW, outH, function (icoBlob) {
                        if (!isCurrent()) return;
                        showResult(icoBlob, 'ico', format);
                    });
                }, 'image/png');
            } else if (format === 'image/avif' && !avifSupported) {
                showToast('当前浏览器不支持 AVIF，请换用 Chrome / Edge');
            } else {
                canvas.toBlob(function (blob) {
                    if (!isCurrent()) return;
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
        dropzone.style.display = ''; // 重置后恢复拖拽框
        fileInput.value = '';
        qualitySlider.value = '0.9';
        qualityInput.value = '0.9';
        formatSelect.value = 'image/png';
        updateSliderState();
    }

    // --- 滑块/提示状态：随「格式 + 手动输入值」三态联动（无损 / 有损 / 彩蛋负值） ---
    function currentMode() {
        var v = parseFloat(qualityInput.value);
        if (!isNaN(v) && v < 0) return 'glitch';
        return (formatSelect.value === 'image/png' || formatSelect.value === 'image/x-icon') ? 'lossless' : 'lossy';
    }

    function updateSliderState() {
        var mode = currentMode();
        // 滑块只由格式决定是否禁用：无损永远锁（正常质量无意义）；彩蛋只走输入框。
        // 注意：若在无损格式 + 彩蛋时放行滑块，拖动会把输入框改回正数、滑块又在拖动中被锁死（旧 bug 重演）
        var isLosslessFormat = (formatSelect.value === 'image/png' || formatSelect.value === 'image/x-icon');
        qualitySlider.disabled = isLosslessFormat;
        qualitySlider.classList.toggle('ic-slider-locked', isLosslessFormat);
        qualitySlider.title = isLosslessFormat ? '' : '质量越高，文件越大';
        // 提示小字用 visibility 切换而非 display：隐藏时仍占一行，选项区布局高度始终统一
        if (mode === 'glitch') {
            sliderNote.style.visibility = 'visible';
            sliderNote.textContent = '🎉 彩蛋：炸裂的糊 -' + Math.abs(parseFloat(qualityInput.value)).toFixed(2) + '（输入 0.1~1 恢复）';
        } else if (mode === 'lossless') {
            sliderNote.style.visibility = 'visible';
            sliderNote.textContent = '当前格式为无损（PNG/ICO），无需质量设置';
        } else {
            sliderNote.style.visibility = 'hidden';
        }
    }

    // 初始格式为 PNG（无损）→ 滑块一开始就是禁用态（灰着是正常，不是卡死）
    updateSliderState();

    // --- 转换调度：rAF 节流（拖动时每帧最多一次，防大图转换风暴），
    //     加定时器兜底：无头/后台标签页 rAF 可能不触发，保证最终值一定被转换 ---
    var convertScheduled = false;
    function scheduleConvert() {
        if (convertScheduled) return;
        convertScheduled = true;
        var run = function () {
            if (!convertScheduled) return;
            convertScheduled = false;
            convert();
        };
        requestAnimationFrame(run);
        setTimeout(run, 40); // 谁先到谁执行，另一个因 convertScheduled=false 跳过
    }

    // --- 事件绑定 ---
    qualitySlider.addEventListener('input', function () {
        qualityInput.value = qualitySlider.value; // 滑块只给正常值 0.1~1，实时回填输入框
        updateSliderState();
        if (originalDataUrl) scheduleConvert();
    });

    // 手动输入框：可输 ≤1 任意数（含负数 → 彩蛋）；与滑块双向联动
    qualityInput.addEventListener('input', function () {
        var v = parseFloat(qualityInput.value);
        if (!isNaN(v) && v >= 0.1 && v <= 1) qualitySlider.value = v;
        updateSliderState();
        if (originalDataUrl) scheduleConvert();
    });
    qualityInput.addEventListener('change', function () {
        var v = parseFloat(qualityInput.value);
        if (isNaN(v)) {
            qualityInput.value = qualitySlider.value; // 空/非法输入回填当前滑块值
        } else if (v >= 0) {
            var clamped = Math.min(1, Math.max(0.1, v)); // 正常值钳制到滑块范围
            qualityInput.value = String(clamped);
            qualitySlider.value = clamped;
        } // 负值保留原样（彩蛋）
        updateSliderState();
        if (originalDataUrl) convert();
    });

    formatSelect.addEventListener('change', function () {
        updateSliderState();
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

    // --- 彩蛋：像素级「炸裂的糊」 ---
    // 三件套叠加：①马赛克糊（分块取中心色填充）→ ②撕裂（横向条带整体错位）→ ③彩色噪点
    // 强度 t = min(1, |负质量|)，-1 即封顶的满格炸裂
    function applyGlitch(ctx, w, h, t) {
        if (!w || !h) return;
        var imgData = ctx.getImageData(0, 0, w, h);
        var d = imgData.data;
        var n = d.length;

        // 1. 马赛克糊：块越大越糊（4px → 20px）
        var block = Math.max(2, Math.round(4 + t * 16));
        for (var by = 0; by < h; by += block) {
            for (var bx = 0; bx < w; bx += block) {
                var cx = Math.min(bx + (block >> 1), w - 1);
                var cy = Math.min(by + (block >> 1), h - 1);
                var ci = (cy * w + cx) * 4;
                var r = d[ci], g = d[ci + 1], b = d[ci + 2], a = d[ci + 3];
                var yEnd = Math.min(by + block, h);
                var xEnd = Math.min(bx + block, w);
                for (var yy = by; yy < yEnd; yy++) {
                    var row = yy * w;
                    for (var xx = bx; xx < xEnd; xx++) {
                        var i = (row + xx) * 4;
                        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
                    }
                }
            }
        }

        // 2. 撕裂：横向条带整体随机平移（最大 ±40% 宽），条带越细碎越炸
        var strip = Math.max(1, Math.round(2 + t * 12));
        var rowCount = Math.ceil(h / strip);
        var shifts = new Array(rowCount);
        var maxShift = Math.max(1, Math.round(w * t * 0.4));
        for (var s = 0; s < rowCount; s++) {
            shifts[s] = Math.round((Math.random() * 2 - 1) * maxShift);
        }
        var moved = new Uint8ClampedArray(d);
        for (var y = 0; y < h; y++) {
            var shift = shifts[Math.floor(y / strip)];
            if (shift === 0) continue;
            var srcRow = y * w * 4;
            for (var x = 0; x < w; x++) {
                var si = srcRow + ((x - shift + w) % w) * 4;
                var di = srcRow + x * 4;
                moved[di] = d[si]; moved[di + 1] = d[si + 1]; moved[di + 2] = d[si + 2]; moved[di + 3] = d[si + 3];
            }
        }

        // 3. 彩色噪点：随机像素撒 RGB 雪花
        var density = t * 0.07;
        for (var i = 0; i < n; i += 4) {
            if (Math.random() < density) {
                moved[i] = Math.random() * 255 | 0;
                moved[i + 1] = Math.random() * 255 | 0;
                moved[i + 2] = Math.random() * 255 | 0;
            }
        }

        ctx.putImageData(new ImageData(moved, w, h), 0, 0);
    }
};

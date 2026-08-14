// 夏夜工具集 - 图片压缩工具 (ES5)

window.initImageCompress = function(container) {

    var originalFile = null;
    var originalDataUrl = null;

    // --- 构建 UI ---
    container.innerHTML =
        '<div class="ic-container">' +
            '<div class="ic-dropzone" id="icDropzone">' +
                '<div class="ic-icon">&#x1F5BC;</div>' +
                '<p>拖拽图片到此处，或点击选择文件</p>' +
                '<p style="font-size:0.78rem;color:#A8A29E;margin-top:4px;">支持 JPG / PNG / WebP，最大 20MB</p>' +
            '</div>' +
            '<input type="file" id="icFileInput" accept="image/*" style="display:none;" />' +

            '<div class="ic-preview-row" id="icPreviewRow" style="display:none;">' +
                '<div class="ic-preview-col">' +
                    '<label>原始图片</label>' +
                    '<div class="ic-preview-wrap" id="icOriginalPreview"></div>' +
                    '<div class="ic-info" id="icOriginalInfo"></div>' +
                '</div>' +
                '<div class="ic-preview-col">' +
                    '<label>压缩后</label>' +
                    '<div class="ic-preview-wrap" id="icCompressedPreview"></div>' +
                    '<div class="ic-info" id="icCompressedInfo"></div>' +
                '</div>' +
            '</div>' +

            '<div class="ic-slider-row" id="icControls" style="display:none;">' +
                '<label>质量: <span class="ic-slider-val" id="icQualityVal">0.7</span></label>' +
                '<input class="ic-slider" id="icQuality" type="range" min="0.1" max="1" step="0.05" value="0.7" />' +
                '<label>最大宽度:</label>' +
                '<input type="number" id="icMaxWidth" value="1920" min="100" max="8000" style="width:90px;padding:6px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.7);background:rgba(255,255,255,0.5);color:#1E293B;outline:none;" />' +
            '</div>' +

            '<div class="ic-options" id="icOptions" style="display:none;">' +
                '<label for="icFormat">格式:</label>' +
                '<select id="icFormat">' +
                    '<option value="original">保持原格式</option>' +
                    '<option value="image/jpeg">JPEG</option>' +
                    '<option value="image/png">PNG</option>' +
                    '<option value="image/webp">WebP</option>' +
                '</select>' +
                '<button class="ic-btn ic-btn-primary" id="icDownload">&#x2B07; 下载</button>' +
                '<button class="ic-btn" id="icReset">&#x1F504; 重置</button>' +
            '</div>' +
        '</div>';

    var dropzone = document.getElementById('icDropzone');
    var fileInput = document.getElementById('icFileInput');
    var previewRow = document.getElementById('icPreviewRow');
    var originalPreview = document.getElementById('icOriginalPreview');
    var compressedPreview = document.getElementById('icCompressedPreview');
    var originalInfo = document.getElementById('icOriginalInfo');
    var compressedInfo = document.getElementById('icCompressedInfo');
    var controls = document.getElementById('icControls');
    var options = document.getElementById('icOptions');
    var qualitySlider = document.getElementById('icQuality');
    var qualityVal = document.getElementById('icQualityVal');
    var maxWidthInput = document.getElementById('icMaxWidth');
    var formatSelect = document.getElementById('icFormat');
    var downloadBtn = document.getElementById('icDownload');
    var resetBtn = document.getElementById('icReset');

    // --- 拖拽上传 ---
    dropzone.addEventListener('click', function() {
        fileInput.click();
    });

    dropzone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        var files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    fileInput.addEventListener('change', function() {
        if (fileInput.files.length > 0) {
            handleFile(fileInput.files[0]);
        }
    });

    // --- 处理文件 ---
    function handleFile(file) {
        // 检查大小
        if (file.size > 20 * 1024 * 1024) {
            showToast('图片超过 20MB 限制，请压缩后再试');
            return;
        }

        // 检查类型
        if (file.type.indexOf('image/') !== 0) {
            showToast('请选择图片文件');
            return;
        }

        originalFile = file;

        var reader = new FileReader();
        reader.onload = function(e) {
            originalDataUrl = e.target.result;
            showOriginal();
            compress();
            previewRow.style.display = 'flex';
            controls.style.display = 'flex';
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

    // --- 压缩 ---
    function compress() {
        if (!originalDataUrl) return;

        var img = new Image();
        img.onload = function() {
            var quality = parseFloat(qualitySlider.value);
            var maxWidth = parseInt(maxWidthInput.value, 10) || 1920;
            var format = formatSelect.value;

            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');

            // 计算缩放
            var w = img.width;
            var h = img.height;
            if (w > maxWidth) {
                h = h * maxWidth / w;
                w = maxWidth;
            }

            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);

            // 确定输出格式
            var outputFormat = format;
            if (outputFormat === 'original') {
                outputFormat = originalFile.type || 'image/jpeg';
            }

            var dataUrl = canvas.toDataURL(outputFormat, quality);

            // 显示压缩后预览
            compressedPreview.innerHTML = '<img src="' + dataUrl + '" alt="压缩后图片" />';

            // 计算压缩后大小
            var base64Str = dataUrl.split(',')[1] || '';
            var compressedBytes = Math.round(base64Str.length * 3 / 4) - (base64Str.endsWith('==') ? 2 : base64Str.endsWith('=') ? 1 : 0);
            var ratio = ((1 - compressedBytes / originalFile.size) * 100).toFixed(1);

            compressedInfo.textContent = formatFileSize(compressedBytes) + ' | 压缩 ' + ratio + '%';

            // 存储用于下载
            compressedPreview._downloadData = dataUrl;
            compressedPreview._downloadFormat = outputFormat;
        };
        img.src = originalDataUrl;
    }

    // --- 下载 ---
    function downloadCompressed() {
        var dataUrl = compressedPreview._downloadData;
        if (!dataUrl) {
            showToast('请先上传图片');
            return;
        }

        var ext = 'png';
        var format = compressedPreview._downloadFormat || 'image/png';
        if (format === 'image/jpeg') ext = 'jpg';
        else if (format === 'image/webp') ext = 'webp';

        var link = document.createElement('a');
        link.download = 'compressed.' + ext;
        link.href = dataUrl;
        link.click();
    }

    // --- 重置 ---
    function resetAll() {
        originalFile = null;
        originalDataUrl = null;
        originalPreview.innerHTML = '';
        compressedPreview.innerHTML = '';
        originalInfo.textContent = '';
        compressedInfo.textContent = '';
        previewRow.style.display = 'none';
        controls.style.display = 'none';
        options.style.display = 'none';
        dropzone.style.display = ''; // 重置后恢复拖拽框
        fileInput.value = '';
        qualitySlider.value = '0.7';
        qualityVal.textContent = '0.7';
        maxWidthInput.value = '1920';
        formatSelect.value = 'original';
        compressedPreview._downloadData = null;
        compressedPreview._downloadFormat = null;
    }

    // --- 事件绑定 ---
    qualitySlider.addEventListener('input', function() {
        qualityVal.textContent = qualitySlider.value;
        if (originalDataUrl) compress();
    });

    maxWidthInput.addEventListener('change', function() {
        if (originalDataUrl) compress();
    });

    formatSelect.addEventListener('change', function() {
        if (originalDataUrl) compress();
    });

    downloadBtn.addEventListener('click', downloadCompressed);
    resetBtn.addEventListener('click', resetAll);
};

// 夏夜工具集 - 文字识别/OCR 工具 (ES5)

window.initOCR = function(container) {

    var selectedFile = null;
    var selectedDataUrl = null;
    var tesseractLoaded = false;

    // --- 构建 UI ---
    container.innerHTML =
        '<div class="ocr-container">' +
            '<div class="ocr-upload-zone" id="ocrDropzone">' +
                '<div class="ocr-icon">&#x1F5BC;</div>' +
                '<p>拖拽图片到此处，或点击选择图片</p>' +
                '<p style="font-size:0.78rem;color:#A8A29E;margin-top:4px;">支持 JPG / PNG / WebP</p>' +
            '</div>' +
            '<input type="file" id="ocrFileInput" accept="image/*" style="display:none;" />' +

            '<div class="ocr-preview-row" id="ocrPreviewRow" style="display:none;">' +
                '<div class="ocr-thumb" id="ocrThumb"></div>' +
                '<div class="ocr-progress-wrap">' +
                    '<div class="ocr-progress-bar">' +
                        '<div class="ocr-progress-fill" id="ocrProgressFill"></div>' +
                    '</div>' +
                    '<div class="ocr-status" id="ocrStatus">准备就绪</div>' +
                '</div>' +
            '</div>' +

            '<div class="ocr-btn-group" id="ocrBtnGroup" style="display:none;">' +
                '<button class="ocr-btn ocr-btn-primary" id="ocrStart">&#x1F50D; 开始识别</button>' +
                '<div>' +
                    '<label for="ocrLang" style="font-size:0.85rem;font-weight:600;color:#57534E;margin-right:6px;">语言:</label>' +
                    '<select class="ocr-lang-select" id="ocrLang">' +
                        '<option value="chi_sim+eng">中文+英文</option>' +
                        '<option value="chi_sim">中文</option>' +
                        '<option value="eng">English</option>' +
                    '</select>' +
                '</div>' +
            '</div>' +

            '<textarea class="ocr-result-textarea" id="ocrResult" placeholder="识别结果将显示在这里..." readonly></textarea>' +

            '<div class="ocr-btn-group" id="ocrResultBtns" style="display:none;">' +
                '<button class="ocr-btn" id="ocrCopy">&#x1F4CB; 复制结果</button>' +
                '<button class="ocr-btn" id="ocrDownload">&#x2B07; 下载为 TXT</button>' +
                '<button class="ocr-btn ocr-btn-danger" id="ocrReset">&#x1F5D1; 重置</button>' +
            '</div>' +
        '</div>';

    var dropzone = document.getElementById('ocrDropzone');
    var fileInput = document.getElementById('ocrFileInput');
    var previewRow = document.getElementById('ocrPreviewRow');
    var thumb = document.getElementById('ocrThumb');
    var progressFill = document.getElementById('ocrProgressFill');
    var statusEl = document.getElementById('ocrStatus');
    var btnGroup = document.getElementById('ocrBtnGroup');
    var startBtn = document.getElementById('ocrStart');
    var langSelect = document.getElementById('ocrLang');
    var resultTextarea = document.getElementById('ocrResult');
    var resultBtns = document.getElementById('ocrResultBtns');
    var copyBtn = document.getElementById('ocrCopy');
    var downloadBtn = document.getElementById('ocrDownload');
    var resetBtn = document.getElementById('ocrReset');

    // --- 加载 Tesseract.js ---
    function loadTesseract(callback) {
        if (typeof Tesseract !== 'undefined') {
            tesseractLoaded = true;
            callback();
            return;
        }
        statusEl.textContent = '正在加载 OCR 引擎...';
        var script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        script.onload = function() {
            tesseractLoaded = true;
            statusEl.textContent = 'OCR 引擎加载完成';
            callback();
        };
        script.onerror = function() {
            statusEl.textContent = '加载 OCR 引擎失败，请检查网络连接';
            statusEl.style.color = '#DC2626';
        };
        document.body.appendChild(script);
    }

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
        if (file.type.indexOf('image/') !== 0) {
            showToast('请选择图片文件');
            return;
        }

        selectedFile = file;
        var reader = new FileReader();
        reader.onload = function(e) {
            selectedDataUrl = e.target.result;
            thumb.innerHTML = '<img src="' + selectedDataUrl + '" alt="识别图片" />';
            previewRow.style.display = 'flex';
            btnGroup.style.display = 'flex';
            resultTextarea.value = '';
            resultBtns.style.display = 'none';
            progressFill.style.width = '0%';
            statusEl.textContent = '图片已加载，点击「开始识别」';
            statusEl.style.color = '#78716C';
        };
        reader.readAsDataURL(file);
    }

    // --- 开始识别 ---
    startBtn.addEventListener('click', function() {
        if (!selectedFile) return;

        if (!tesseractLoaded) {
            statusEl.textContent = '正在加载 OCR 引擎，请稍候...';
            loadTesseract(function() {
                runOCR();
            });
            return;
        }

        runOCR();
    });

    function runOCR() {
        if (!selectedDataUrl) return;

        startBtn.disabled = true;
        startBtn.textContent = '识别中...';
        progressFill.style.width = '0%';
        statusEl.textContent = '正在识别...';
        statusEl.style.color = '#7C3AED';

        var lang = langSelect.value;

        try {
            Tesseract.recognize(
                selectedDataUrl,
                lang,
                {
                    logger: function(m) {
                        if (m.status === 'recognizing text') {
                            var pct = Math.round(m.progress * 100);
                            progressFill.style.width = pct + '%';
                            statusEl.textContent = '识别中 ' + pct + '%';
                        } else if (m.status === 'loading tesseract core') {
                            statusEl.textContent = '加载核心引擎...';
                        } else if (m.status === 'initializing tesseract') {
                            statusEl.textContent = '初始化引擎...';
                        } else if (m.status === 'loading language traineddata') {
                            statusEl.textContent = '加载语言包: ' + (m.lang || lang) + '...';
                        } else if (m.status === 'initializing api') {
                            statusEl.textContent = '初始化 API...';
                        }
                    }
                }
            ).then(function(result) {
                var text = result.data.text;
                resultTextarea.value = text;
                progressFill.style.width = '100%';

                if (text.trim()) {
                    statusEl.textContent = '识别完成！共 ' + text.length + ' 个字符';
                    statusEl.style.color = '#059669';
                    resultBtns.style.display = 'flex';
                } else {
                    statusEl.textContent = '未识别到文字，请尝试其他图片';
                    statusEl.style.color = '#D97706';
                    resultBtns.style.display = 'none';
                }

                startBtn.disabled = false;
                startBtn.textContent = '🔍 开始识别';
            }).catch(function(err) {
                statusEl.textContent = '识别出错: ' + (err.message || '未知错误');
                statusEl.style.color = '#DC2626';
                progressFill.style.width = '0%';
                startBtn.disabled = false;
                startBtn.textContent = '🔍 开始识别';
            });
        } catch (e) {
            statusEl.textContent = '启动识别失败: ' + e.message;
            statusEl.style.color = '#DC2626';
            startBtn.disabled = false;
            startBtn.textContent = '🔍 开始识别';
        }
    }

    // --- 复制 ---
    copyBtn.addEventListener('click', function() {
        var text = resultTextarea.value;
        if (text) {
            copyToClipboard(text);
            showToast('已复制到剪贴板');
        }
    });

    // --- 下载 TXT ---
    downloadBtn.addEventListener('click', function() {
        var text = resultTextarea.value;
        if (!text) return;
        var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.download = 'ocr-result.txt';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    });

    // --- 重置 ---
    resetBtn.addEventListener('click', function() {
        selectedFile = null;
        selectedDataUrl = null;
        thumb.innerHTML = '';
        previewRow.style.display = 'none';
        btnGroup.style.display = 'none';
        resultTextarea.value = '';
        resultBtns.style.display = 'none';
        progressFill.style.width = '0%';
        statusEl.textContent = '准备就绪';
        statusEl.style.color = '#78716C';
        fileInput.value = '';
        startBtn.disabled = false;
        startBtn.textContent = '🔍 开始识别';
    });
};

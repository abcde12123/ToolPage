// 夏夜工具集 - PDF 工具箱 (ES5)
// 懒加载 PDF 引擎：只有点开本工具才动态下载 pdf-lib + pdf.js，其他工具零影响
// 功能：合并 PDF（pdf-lib）/ 转图片（pdf.js 渲染）/ 优化体积（pdf-lib 重构流）
// 数据全程本地处理，不上传服务器

window.initPdfTools = function (container) {

    var PDFLib = null;
    var pdfjsLib = null;
    var enginesReady = false;

    var mergeFiles = [];     // 待合并文件
    var convertFile = null;  // 转图片文件
    var convertData = null;  // 转图片的字节
    var optimizeFile = null; // 优化文件

    // ---------- 构建 UI ----------
    container.innerHTML =
        '<div class="pt-loading" id="ptEngineStatus">' +
            '<span class="pt-spinner" aria-hidden="true"></span>' +
            '<span id="ptEngineText">正在加载 PDF 引擎（首次约 3-10 秒）...</span>' +
        '</div>' +

        '<div class="pt-tabs" id="ptTabs">' +
            '<button type="button" class="pt-tab active" data-tab="merge">&#x1F4C2; 合并</button>' +
            '<button type="button" class="pt-tab" data-tab="render">&#x1F5BC; 转图片</button>' +
            '<button type="button" class="pt-tab" data-tab="split">&#x1F4D1; 拆分</button>' +
            '<button type="button" class="pt-tab" data-tab="rotate">&#x1F504; 旋转</button>' +
            '<button type="button" class="pt-tab" data-tab="delete">&#x1F5D1; 删页</button>' +
            '<button type="button" class="pt-tab" data-tab="img2pdf">&#x1F5BC;&#x2192;&#x1F4C4; 图转PDF</button>' +
            '<button type="button" class="pt-tab" data-tab="watermark">&#x1F4A7; 水印</button>' +
            '<button type="button" class="pt-tab" data-tab="optimize">&#x2702; 优化体积</button>' +
            '<button type="button" class="pt-tab" data-tab="ocr">&#x1F4DD;&#x1F48E; OCR</button>' +
            '<button type="button" class="pt-tab" data-tab="encrypt">&#x1F512;&#x1F48E; 加密</button>' +
            '<button type="button" class="pt-tab" data-tab="decrypt">&#x1F513;&#x1F48E; 解密</button>' +
        '</div>' +

        <!-- 合并 -->
        '<div class="pt-panel active" id="ptPanelMerge">' +
            '<div class="ic-dropzone" id="ptMergeDrop">' +
                '<div class="ic-icon">&#x1F4C2;</div>' +
                '<p>拖拽多个 PDF 到此处，或点击选择</p>' +
                '<p style="font-size:0.78rem;color:#A8A29E;margin-top:4px;">按列表顺序合并，可拖入多份</p>' +
            '</div>' +
            '<input type="file" id="ptMergeInput" accept="application/pdf" multiple style="display:none;" />' +
            '<div class="pt-list" id="ptMergeList" style="display:none;"></div>' +
            '<button class="ic-btn ic-btn-primary" id="ptMergeBtn" disabled>&#x1F4C2; 合并并下载</button>' +
        '</div>' +

        <!-- 转图片 -->
        '<div class="pt-panel" id="ptPanelRender">' +
            '<div class="ic-dropzone" id="ptRenderDrop">' +
                '<div class="ic-icon">&#x1F5BC;</div>' +
                '<p>拖拽一个 PDF 到此处，或点击选择</p>' +
            '</div>' +
            '<input type="file" id="ptRenderInput" accept="application/pdf" style="display:none;" />' +
            '<div class="ic-options" id="ptRenderOpts" style="display:none;">' +
                '<label>格式:</label>' +
                '<select id="ptRenderFormat">' +
                    '<option value="image/png">PNG</option>' +
                    '<option value="image/webp">WebP</option>' +
                '</select>' +
                '<label>缩放:</label>' +
                '<select id="ptRenderScale">' +
                    '<option value="1">1x（标准）</option>' +
                    '<option value="1.5">1.5x（清晰）</option>' +
                    '<option value="2">2x（高清）</option>' +
                '</select>' +
                '<label>页: <input type="number" id="ptRenderFrom" value="1" min="1" style="width:56px;padding:5px 8px;border-radius:10px;border:1px solid rgba(255,255,255,0.7);background:rgba(255,255,255,0.5);color:#1E293B;outline:none;text-align:center;"> - ' +
                '<input type="number" id="ptRenderTo" value="1" min="1" style="width:56px;padding:5px 8px;border-radius:10px;border:1px solid rgba(255,255,255,0.7);background:rgba(255,255,255,0.5);color:#1E293B;outline:none;text-align:center;"> / <span id="ptRenderTotal">-</span> 页</label>' +
                '<button class="ic-btn ic-btn-primary" id="ptRenderBtn" disabled>&#x1F5BC; 开始转换</button>' +
            '</div>' +
            '<div class="ic-preview-row" id="ptRenderPreviewRow" style="display:none;">' +
                '<div class="ic-preview-col">' +
                    '<label>预览</label>' +
                    '<div class="ic-preview-wrap" id="ptRenderPreview"></div>' +
                    '<div class="ic-options" style="justify-content:center;">' +
                        '<button class="ic-btn ic-btn-primary" id="ptDownloadOne" disabled>&#x2B07; 下载当前页</button>' +
                        '<button class="ic-btn" id="ptDownloadAll" disabled>&#x2B07; 下载全部</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<p class="pt-note" id="ptRenderNote"></p>' +
        '</div>' +

        <!-- 拆分 -->
        '<div class="pt-panel" id="ptPanelSplit">' +
            '<div class="ic-dropzone" id="ptSplitDrop">' +
                '<div class="ic-icon">&#x1F4D1;</div>' +
                '<p>拖拽一个 PDF 到此处，或点击选择</p>' +
            '</div>' +
            '<input type="file" id="ptSplitInput" accept="application/pdf" style="display:none;" />' +
            '<div class="ic-options" id="ptSplitOpts" style="display:none;">' +
                '<label>提取页码: <input type="text" id="ptSplitRange" placeholder="如: 1-3,5,7-9" style="flex:1;min-width:160px;padding:5px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.7);background:rgba(255,255,255,0.5);color:#1E293B;outline:none;"></label>' +
                '<span style="font-size:0.8rem;color:#78716C;">共 <span id="ptSplitTotal">-</span> 页</span>' +
                '<button class="ic-btn ic-btn-primary" id="ptSplitBtn" disabled>&#x1F4D1; 提取并下载</button>' +
            '</div>' +
        '</div>' +

        <!-- 旋转 -->
        '<div class="pt-panel" id="ptPanelRotate">' +
            '<div class="ic-dropzone" id="ptRotateDrop">' +
                '<div class="ic-icon">&#x1F504;</div>' +
                '<p>拖拽一个 PDF 到此处，或点击选择</p>' +
            '</div>' +
            '<input type="file" id="ptRotateInput" accept="application/pdf" style="display:none;" />' +
            '<div class="ic-options" id="ptRotateOpts" style="display:none;">' +
                '<label>旋转页码: <input type="text" id="ptRotateRange" placeholder="如: 1-3,5 或留空=全部" style="flex:1;min-width:160px;padding:5px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.7);background:rgba(255,255,255,0.5);color:#1E293B;outline:none;"></label>' +
                '<label>角度: <select id="ptRotateAngle">' +
                    '<option value="90">顺时针 90°</option>' +
                    '<option value="180">180°</option>' +
                    '<option value="270">逆时针 90°</option>' +
                '</select></label>' +
                '<span style="font-size:0.8rem;color:#78716C;">共 <span id="ptRotateTotal">-</span> 页</span>' +
                '<button class="ic-btn ic-btn-primary" id="ptRotateBtn" disabled>&#x1F504; 旋转并下载</button>' +
            '</div>' +
        '</div>' +

        <!-- 删页 -->
        '<div class="pt-panel" id="ptPanelDelete">' +
            '<div class="ic-dropzone" id="ptDeleteDrop">' +
                '<div class="ic-icon">&#x1F5D1;</div>' +
                '<p>拖拽一个 PDF 到此处，或点击选择</p>' +
            '</div>' +
            '<input type="file" id="ptDeleteInput" accept="application/pdf" style="display:none;" />' +
            '<div class="ic-options" id="ptDeleteOpts" style="display:none;">' +
                '<label>删除页码: <input type="text" id="ptDeleteRange" placeholder="如: 2,4-6,9" style="flex:1;min-width:160px;padding:5px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.7);background:rgba(255,255,255,0.5);color:#1E293B;outline:none;"></label>' +
                '<span style="font-size:0.8rem;color:#78716C;">共 <span id="ptDeleteTotal">-</span> 页</span>' +
                '<button class="ic-btn ic-btn-primary" id="ptDeleteBtn" disabled>&#x1F5D1; 删除并下载</button>' +
            '</div>' +
        '</div>' +

        <!-- 图转PDF -->
        '<div class="pt-panel" id="ptPanelImg2pdf">' +
            '<div class="ic-dropzone" id="ptImg2pdfDrop">' +
                '<div class="ic-icon">&#x1F5BC;</div>' +
                '<p>拖拽多张图片到此处，或点击选择</p>' +
                '<p style="font-size:0.78rem;color:#A8A29E;margin-top:4px;">支持 PNG / JPG，按顺序生成 PDF</p>' +
            '</div>' +
            '<input type="file" id="ptImg2pdfInput" accept="image/png,image/jpeg" multiple style="display:none;" />' +
            '<div class="pt-list" id="ptImg2pdfList" style="display:none;"></div>' +
            '<button class="ic-btn ic-btn-primary" id="ptImg2pdfBtn" disabled>&#x1F4C4; 生成 PDF</button>' +
        '</div>' +

        <!-- 水印 -->
        '<div class="pt-panel" id="ptPanelWatermark">' +
            '<div class="ic-dropzone" id="ptWatermarkDrop">' +
                '<div class="ic-icon">&#x1F4A7;</div>' +
                '<p>拖拽一个 PDF 到此处，或点击选择</p>' +
            '</div>' +
            '<input type="file" id="ptWatermarkInput" accept="application/pdf" style="display:none;" />' +
            '<div class="ic-options" id="ptWatermarkOpts" style="display:none;">' +
                '<label>水印文字: <input type="text" id="ptWatermarkText" placeholder="输入水印内容" style="flex:1;min-width:140px;padding:5px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.7);background:rgba(255,255,255,0.5);color:#1E293B;outline:none;"></label>' +
                '<label>位置: <select id="ptWatermarkPos">' +
                    '<option value="center">居中</option>' +
                    '<option value="diagonal">斜对角</option>' +
                    '<option value="bottom">底部</option>' +
                '</select></label>' +
                '<label>透明度: <select id="ptWatermarkOpacity">' +
                    '<option value="0.3">30%</option>' +
                    '<option value="0.5" selected>50%</option>' +
                    '<option value="0.7">70%</option>' +
                '</select></label>' +
                '<span style="font-size:0.8rem;color:#78716C;">共 <span id="ptWatermarkTotal">-</span> 页</span>' +
                '<button class="ic-btn ic-btn-primary" id="ptWatermarkBtn" disabled>&#x1F4A7; 添加水印</button>' +
            '</div>' +
        '</div>' +

        <!-- 优化 -->
        '<div class="pt-panel" id="ptPanelOptimize">' +
            '<div class="ic-dropzone" id="ptOptDrop">' +
                '<div class="ic-icon">&#x2702;</div>' +
                '<p>拖拽一个 PDF 到此处，或点击选择</p>' +
                '<p style="font-size:0.78rem;color:#A8A29E;margin-top:4px;">重构文档结构、压缩数据流，无画质损失</p>' +
            '</div>' +
            '<input type="file" id="ptOptInput" accept="application/pdf" style="display:none;" />' +
            '<div class="ic-options" id="ptOptRes" style="display:none;">' +
                '<button class="ic-btn ic-btn-primary" id="ptOptBtn" disabled>&#x2702; 优化并下载</button>' +
            '</div>' +
            '<div class="ic-info" id="ptOptInfo" style="display:none;margin-top:8px;"></div>' +
        '</div>' +

        <!-- OCR -->
        '<div class="pt-panel" id="ptPanelOcr">' +
            '<div class="ic-dropzone" id="ptOcrDrop">' +
                '<div class="ic-icon">&#x1F4DD;</div>' +
                '<p>拖拽一个 PDF 到此处，或点击选择</p>' +
                '<p style="font-size:0.78rem;color:#A8A29E;margin-top:4px;">&#x1F48E; 需要管理员密码，使用服务器 OCR 识别</p>' +
            '</div>' +
            '<input type="file" id="ptOcrInput" accept="application/pdf" style="display:none;" />' +
            '<div class="ic-options" id="ptOcrOpts" style="display:none;">' +
                '<label>识别页码: <input type="text" id="ptOcrRange" placeholder="如: 1-3,5 或留空=全部" style="flex:1;min-width:160px;padding:5px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.7);background:rgba(255,255,255,0.5);color:#1E293B;outline:none;"></label>' +
                '<label>语言: <select id="ptOcrLang">' +
                    '<option value="chi_sim">中文简体</option>' +
                    '<option value="eng">英文</option>' +
                '</select></label>' +
                '<span style="font-size:0.8rem;color:#78716C;">共 <span id="ptOcrTotal">-</span> 页</span>' +
                '<button class="ic-btn ic-btn-primary" id="ptOcrBtn" disabled>&#x1F4DD; 开始识别</button>' +
            '</div>' +
            '<div class="ic-preview-row" id="ptOcrResult" style="display:none;">' +
                '<div class="ic-preview-col" style="width:100%;">' +
                    '<label>识别结果</label>' +
                    '<textarea id="ptOcrText" readonly style="width:100%;min-height:200px;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.7);background:rgba(255,255,255,0.5);color:#1E293B;font-family:monospace;resize:vertical;"></textarea>' +
                    '<button class="ic-btn ic-btn-primary" id="ptOcrCopy" style="margin-top:10px;">&#x1F4CB; 复制文本</button>' +
                '</div>' +
            '</div>' +
        '</div>' +

        <!-- 加密 -->
        '<div class="pt-panel" id="ptPanelEncrypt">' +
            '<div class="ic-dropzone" id="ptEncryptDrop">' +
                '<div class="ic-icon">&#x1F512;</div>' +
                '<p>拖拽一个 PDF 到此处，或点击选择</p>' +
                '<p style="font-size:0.78rem;color:#A8A29E;margin-top:4px;">&#x1F48E; 需要管理员密码，为 PDF 添加密码保护</p>' +
            '</div>' +
            '<input type="file" id="ptEncryptInput" accept="application/pdf" style="display:none;" />' +
            '<div class="ic-options" id="ptEncryptOpts" style="display:none;">' +
                '<label>设置密码: <input type="password" id="ptEncryptPassword" placeholder="输入 PDF 密码" style="flex:1;min-width:160px;padding:5px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.7);background:rgba(255,255,255,0.5);color:#1E293B;outline:none;"></label>' +
                '<button class="ic-btn ic-btn-primary" id="ptEncryptBtn" disabled>&#x1F512; 加密并下载</button>' +
            '</div>' +
        '</div>' +

        <!-- 解密 -->
        '<div class="pt-panel" id="ptPanelDecrypt">' +
            '<div class="ic-dropzone" id="ptDecryptDrop">' +
                '<div class="ic-icon">&#x1F513;</div>' +
                '<p>拖拽一个 PDF 到此处，或点击选择</p>' +
                '<p style="font-size:0.78rem;color:#A8A29E;margin-top:4px;">&#x1F48E; 需要管理员密码，移除 PDF 密码保护</p>' +
            '</div>' +
            '<input type="file" id="ptDecryptInput" accept="application/pdf" style="display:none;" />' +
            '<div class="ic-options" id="ptDecryptOpts" style="display:none;">' +
                '<label>原密码: <input type="password" id="ptDecryptPassword" placeholder="输入 PDF 原密码" style="flex:1;min-width:160px;padding:5px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.7);background:rgba(255,255,255,0.5);color:#1E293B;outline:none;"></label>' +
                '<button class="ic-btn ic-btn-primary" id="ptDecryptBtn" disabled>&#x1F513; 解密并下载</button>' +
            '</div>' +
        '</div>';

    // ---------- 元素引用 ----------
    var engineStatus = document.getElementById('ptEngineStatus');
    var engineText = document.getElementById('ptEngineText');
    var tabs = document.getElementById('ptTabs');

    // 合并
    var mergeDrop = document.getElementById('ptMergeDrop');
    var mergeInput = document.getElementById('ptMergeInput');
    var mergeList = document.getElementById('ptMergeList');
    var mergeBtn = document.getElementById('ptMergeBtn');

    // 转图片
    var renderDrop = document.getElementById('ptRenderDrop');
    var renderInput = document.getElementById('ptRenderInput');
    var renderOpts = document.getElementById('ptRenderOpts');
    var renderFormat = document.getElementById('ptRenderFormat');
    var renderScale = document.getElementById('ptRenderScale');
    var renderFrom = document.getElementById('ptRenderFrom');
    var renderTo = document.getElementById('ptRenderTo');
    var renderTotal = document.getElementById('ptRenderTotal');
    var renderBtn = document.getElementById('ptRenderBtn');
    var renderPreviewRow = document.getElementById('ptRenderPreviewRow');
    var renderPreview = document.getElementById('ptRenderPreview');
    var renderNote = document.getElementById('ptRenderNote');
    var downloadOne = document.getElementById('ptDownloadOne');
    var downloadAll = document.getElementById('ptDownloadAll');

    // 拆分
    var splitDrop = document.getElementById('ptSplitDrop');
    var splitInput = document.getElementById('ptSplitInput');
    var splitOpts = document.getElementById('ptSplitOpts');
    var splitRange = document.getElementById('ptSplitRange');
    var splitTotal = document.getElementById('ptSplitTotal');
    var splitBtn = document.getElementById('ptSplitBtn');
    var splitFile = null;

    // 旋转
    var rotateDrop = document.getElementById('ptRotateDrop');
    var rotateInput = document.getElementById('ptRotateInput');
    var rotateOpts = document.getElementById('ptRotateOpts');
    var rotateRange = document.getElementById('ptRotateRange');
    var rotateAngle = document.getElementById('ptRotateAngle');
    var rotateTotal = document.getElementById('ptRotateTotal');
    var rotateBtn = document.getElementById('ptRotateBtn');
    var rotateFile = null;

    // 删页
    var deleteDrop = document.getElementById('ptDeleteDrop');
    var deleteInput = document.getElementById('ptDeleteInput');
    var deleteOpts = document.getElementById('ptDeleteOpts');
    var deleteRange = document.getElementById('ptDeleteRange');
    var deleteTotal = document.getElementById('ptDeleteTotal');
    var deleteBtn = document.getElementById('ptDeleteBtn');
    var deleteFile = null;

    // 图转PDF
    var img2pdfDrop = document.getElementById('ptImg2pdfDrop');
    var img2pdfInput = document.getElementById('ptImg2pdfInput');
    var img2pdfList = document.getElementById('ptImg2pdfList');
    var img2pdfBtn = document.getElementById('ptImg2pdfBtn');
    var img2pdfFiles = [];

    // 水印
    var watermarkDrop = document.getElementById('ptWatermarkDrop');
    var watermarkInput = document.getElementById('ptWatermarkInput');
    var watermarkOpts = document.getElementById('ptWatermarkOpts');
    var watermarkText = document.getElementById('ptWatermarkText');
    var watermarkPos = document.getElementById('ptWatermarkPos');
    var watermarkOpacity = document.getElementById('ptWatermarkOpacity');
    var watermarkTotal = document.getElementById('ptWatermarkTotal');
    var watermarkBtn = document.getElementById('ptWatermarkBtn');
    var watermarkFile = null;

    // 优化
    var optDrop = document.getElementById('ptOptDrop');
    var optInput = document.getElementById('ptOptInput');
    var optRes = document.getElementById('ptOptRes');
    var optBtn = document.getElementById('ptOptBtn');
    var optInfo = document.getElementById('ptOptInfo');

    // OCR
    var ocrDrop = document.getElementById('ptOcrDrop');
    var ocrInput = document.getElementById('ptOcrInput');
    var ocrOpts = document.getElementById('ptOcrOpts');
    var ocrRange = document.getElementById('ptOcrRange');
    var ocrLang = document.getElementById('ptOcrLang');
    var ocrTotal = document.getElementById('ptOcrTotal');
    var ocrBtn = document.getElementById('ptOcrBtn');
    var ocrResult = document.getElementById('ptOcrResult');
    var ocrText = document.getElementById('ptOcrText');
    var ocrCopy = document.getElementById('ptOcrCopy');
    var ocrFile = null;

    // 加密
    var encryptDrop = document.getElementById('ptEncryptDrop');
    var encryptInput = document.getElementById('ptEncryptInput');
    var encryptOpts = document.getElementById('ptEncryptOpts');
    var encryptPassword = document.getElementById('ptEncryptPassword');
    var encryptBtn = document.getElementById('ptEncryptBtn');
    var encryptFile = null;

    // 解密
    var decryptDrop = document.getElementById('ptDecryptDrop');
    var decryptInput = document.getElementById('ptDecryptInput');
    var decryptOpts = document.getElementById('ptDecryptOpts');
    var decryptPassword = document.getElementById('ptDecryptPassword');
    var decryptBtn = document.getElementById('ptDecryptBtn');
    var decryptFile = null;

    // 管理员密码（用于后端功能）
    var adminPassword = null;

    // 渲染结果缓存
    var renderedPages = []; // {canvas, blob, pageNo}
    var renderFormatType = 'image/png';
    var renderExt = 'png';

    // ---------- 懒加载 PDF 引擎 ----------
    loadScript('/vendor/pdf-lib.min.js?v=1', function (err1) {
        if (err1) { engineFail(); return; }
        loadScript('/vendor/pdf.min.js?v=1', function (err2) {
            if (err2) { engineFail(); return; }
            PDFLib = window.PDFLib;
            pdfjsLib = window.pdfjsLib;
            if (!PDFLib || !pdfjsLib) { engineFail(); return; }
            pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.js?v=1';
            enginesReady = true;
            engineStatus.style.display = 'none';
            mergeBtn.disabled = false;
            optBtn.disabled = false; // 引擎就绪后，若此前已选好文件则优化按钮立即可用
        });
    });

    function engineFail() {
        engineText.textContent = 'PDF 引擎加载失败，请检查网络后关闭重试';
        engineStatus.style.background = 'rgba(220,38,38,0.1)';
        engineStatus.style.color = '#DC2626';
    }

    function loadScript(src, cb) {
        var s = document.createElement('script');
        s.src = src;
        s.onload = function () { cb(null); };
        s.onerror = function () { cb(new Error('fail ' + src)); };
        document.head.appendChild(s);
    }

    function needEngine(cb) {
        if (enginesReady) { cb(); return true; }
        showToast('PDF 引擎仍在加载，请稍候再试');
        return false;
    }

    // ---------- Tab 切换 ----------
    tabs.addEventListener('click', function (e) {
        var btn = e.target.closest('.pt-tab');
        if (!btn) return;
        var name = btn.getAttribute('data-tab');
        var btns = tabs.querySelectorAll('.pt-tab');
        for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
        btn.classList.add('active');
        var panels = container.querySelectorAll('.pt-panel');
        for (var j = 0; j < panels.length; j++) panels[j].classList.remove('active');
        document.getElementById('ptPanel' + name.charAt(0).toUpperCase() + name.slice(1)).classList.add('active');
    });

    // ---------- 通用拖拽绑定 ----------
    function bindDropzone(dz, input, multiple, onFile) {
        dz.addEventListener('click', function () { input.click(); });
        dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('drag-over'); });
        dz.addEventListener('dragleave', function (e) { e.preventDefault(); dz.classList.remove('drag-over'); });
        dz.addEventListener('drop', function (e) {
            e.preventDefault();
            dz.classList.remove('drag-over');
            var files = e.dataTransfer.files;
            onFile(files);
        });
        input.addEventListener('change', function () {
            onFile(input.files);
            input.value = '';
        });
    }

    // ================= 合并 =================
    bindDropzone(mergeDrop, mergeInput, true, function (files) {
        for (var i = 0; i < files.length; i++) {
            if (files[i].type !== 'application/pdf' && !/\.pdf$/i.test(files[i].name)) {
                showToast('请选择 PDF 文件：' + files[i].name);
                continue;
            }
            mergeFiles.push(files[i]);
        }
        renderMergeList();
    });

    function renderMergeList() {
        if (!mergeFiles.length) { mergeList.style.display = 'none'; mergeBtn.disabled = !enginesReady; return; }
        mergeList.style.display = 'block';
        var html = '';
        for (var i = 0; i < mergeFiles.length; i++) {
            var f = mergeFiles[i];
            html +=
                '<div class="pt-list-row">' +
                    '<span style="color:#A8A29E;min-width:18px;">' + (i + 1) + '</span>' +
                    '<span class="pt-list-name" title="' + escapeHtml(f.name) + '">' + escapeHtml(f.name) + '</span>' +
                    '<span style="color:#A8A29E;font-size:0.75rem;">' + formatFileSize(f.size) + '</span>' +
                    (mergeFiles.length > 1 ? '<button type="button" class="pt-btn-mini" data-i="' + i + '" data-act="up">&#x2191;</button>' : '') +
                    (mergeFiles.length > 1 ? '<button type="button" class="pt-btn-mini" data-i="' + i + '" data-act="down">&#x2193;</button>' : '') +
                    '<button type="button" class="pt-btn-mini" data-i="' + i + '" data-act="del">&#x2715;</button>' +
                '</div>';
        }
        mergeList.innerHTML = html;
        mergeBtn.disabled = !enginesReady;
    }

    mergeList.addEventListener('click', function (e) {
        var btn = e.target.closest('.pt-btn-mini');
        if (!btn) return;
        var i = parseInt(btn.getAttribute('data-i'), 10);
        var act = btn.getAttribute('data-act');
        if (act === 'del') { mergeFiles.splice(i, 1); }
        else if (act === 'up' && i > 0) { swap(mergeFiles, i, i - 1); }
        else if (act === 'down' && i < mergeFiles.length - 1) { swap(mergeFiles, i, i + 1); }
        renderMergeList();
    });

    function swap(arr, a, b) { var t = arr[a]; arr[a] = arr[b]; arr[b] = t; }

    mergeBtn.addEventListener('click', function () {
        if (!needEngine(doMerge)) return;
    });

    function doMerge() {
        if (!mergeFiles.length) { showToast('请先添加 PDF 文件'); return; }
        setBtnLoading(mergeBtn, '合并中...');
        PDFLib.PDFDocument.create().then(function (merged) {
            var chain = Promise.resolve();
            mergeFiles.forEach(function (f) {
                chain = chain.then(function () {
                    return fileToArrayBuffer(f).then(function (buf) {
                        return PDFLib.PDFDocument.load(buf, { ignoreEncryption: true }).then(function (src) {
                            return merged.copyPages(src, src.getPageIndices()).then(function (pages) {
                                pages.forEach(function (p) { merged.addPage(p); });
                            });
                        });
                    });
                });
            });
            chain.then(function () {
                return merged.save();
            }).then(function (bytes) {
                setBtnLoading(mergeBtn, '合并并下载');
                var blob = new Blob([bytes], { type: 'application/pdf' });
                downloadBlob(blob, 'merged.pdf');
                showToast('合并完成，共 ' + merged.getPageCount() + ' 页');
            }).catch(function (err) {
                setBtnLoading(mergeBtn, '合并并下载');
                showToast('合并失败，可能有加密或损坏文件');
                console.error(err);
            });
        }).catch(function (err) {
            setBtnLoading(mergeBtn, '合并并下载');
            showToast('PDF 引擎异常，请刷新重试');
            console.error(err);
        });
    }

    // ================= 转图片 =================
    bindDropzone(renderDrop, renderInput, false, function (files) {
        if (!files.length) return;
        var f = files[0];
        if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { showToast('请选择 PDF 文件'); return; }
        convertFile = f;
        resetRender();
        fileToArrayBuffer(f).then(function (buf) {
            // 存一份私有字节副本：pdf.js 传给 worker 时会转移(detach)传入的 buffer，
            // 若直接把原 buffer 存下来，二次 getDocument 会撞上已分离的 ArrayBuffer
            convertData = new Uint8Array(buf.slice(0));
            // 读页数
            if (!enginesReady) { showToast('PDF 引擎加载中，请稍候'); return; }
            pdfjsLib.getDocument({ data: convertData.slice() }).promise.then(function (doc) {
                renderTotal.textContent = doc.numPages;
                renderTo.max = doc.numPages;
                renderTo.value = String(Math.min(1, doc.numPages));
                renderFrom.max = doc.numPages;
                renderOpts.style.display = 'flex';
                renderNote.textContent = '';
                renderBtn.disabled = false; // 读页数成功后才允许转换
                doc.destroy();
            }).catch(function (err) {
                showToast('无法读取 PDF（可能损坏或加密）');
                console.error(err);
            });
        });
    });

    function resetRender() {
        renderOpts.style.display = 'none';
        renderPreviewRow.style.display = 'none';
        renderPreview.innerHTML = '';
        renderedPages = [];
        downloadOne.disabled = true;
        downloadAll.disabled = true;
        renderBtn.disabled = true; // 新文件在读页数前，转换按钮保持禁用
        renderTotal.textContent = '-';
        renderNote.textContent = '';
    }

    renderBtn.addEventListener('click', function () {
        if (!needEngine(doRender)) return;
    });

    function doRender() {
        if (!convertData) { showToast('请先选择 PDF'); return; }
        var from = parseInt(renderFrom.value, 10) || 1;
        var to = parseInt(renderTo.value, 10) || 1;
        if (from > to) { showToast('起始页不能大于结束页'); return; }
        var total = parseInt(renderTotal.textContent, 10) || 1;
        if (to > total) { showToast('结束页超过总页数'); return; }
        if (to - from + 1 > 20) { showToast('一次最多转换 20 页，请缩小范围'); return; }

        setBtnLoading(renderBtn, '转换中...');
        renderBtn.disabled = true; // 处理中禁止重复点击
        renderNote.textContent = '正在渲染第 ' + from + ' - ' + to + ' 页，请稍候...';
        renderFormatType = renderFormat.value;
        renderExt = renderFormatType === 'image/png' ? 'png' : 'webp';
        var scale = parseFloat(renderScale.value);

        pdfjsLib.getDocument({ data: convertData.slice() }).promise.then(function (doc) {
            var pages = [];
            var chain = Promise.resolve();
            for (var p = from; p <= to; p++) {
                (function (pageNo) {
                    chain = chain.then(function () {
                        return doc.getPage(pageNo).then(function (page) {
                            return renderPageToCanvas(page, scale);
                        }).then(function (canvas) {
                            return canvasToBlob(canvas, renderFormatType, 0.92).then(function (blob) {
                                pages.push({ canvas: canvas, blob: blob, pageNo: pageNo });
                            });
                        });
                    });
                })(p);
            }
            return chain.then(function () {
                doc.destroy();
                renderedPages = pages;
                showPreview();
                setBtnLoading(renderBtn, '开始转换');
                renderNote.textContent = '';
            });
        }).catch(function (err) {
            setBtnLoading(renderBtn, '开始转换');
            showToast('转换失败，PDF 可能损坏或内容特殊');
            console.error(err);
        });
    }

    function renderPageToCanvas(page, scale) {
        var viewport = page.getViewport({ scale: scale });
        var canvas = document.createElement('canvas');
        canvas.width = Math.min(viewport.width, 4096);
        canvas.height = Math.min(viewport.height, 4096);
        var ctx = canvas.getContext('2d');
        return page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function () {
            return canvas;
        });
    }

    function canvasToBlob(canvas, type, quality) {
        return new Promise(function (resolve) {
            canvas.toBlob(function (b) { resolve(b); }, type, quality);
        });
    }

    function showPreview() {
        var first = renderedPages[0];
        if (!first) return;
        renderPreview.innerHTML = '';
        var canvas = first.canvas.cloneNode(true);
        canvas.className = 'pt-preview-canvas';
        renderPreview.appendChild(canvas);
        renderPreviewRow.style.display = 'flex';
        downloadOne.disabled = false;
        downloadAll.disabled = renderedPages.length < 2;
    }

    downloadOne.addEventListener('click', function () {
        if (!renderedPages.length) return;
        var p = renderedPages[0];
        downloadBlob(p.blob, 'page-' + p.pageNo + '.' + renderExt);
    });

    downloadAll.addEventListener('click', function () {
        if (!renderedPages.length) return;
        renderedPages.forEach(function (p, idx) {
            setTimeout(function () {
                downloadBlob(p.blob, 'page-' + p.pageNo + '.' + renderExt);
            }, idx * 300);
        });
        showToast('正在下载 ' + renderedPages.length + ' 张图片');
    });

    // ================= 拆分 =================
    bindDropzone(splitDrop, splitInput, false, function (files) {
        if (!files.length) return;
        var f = files[0];
        if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { showToast('请选择 PDF 文件'); return; }
        splitFile = f;
        splitOpts.style.display = 'flex';
        splitBtn.disabled = !enginesReady;
        fileToArrayBuffer(f).then(function (buf) {
            return PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
        }).then(function (doc) {
            splitTotal.textContent = doc.getPageCount();
            splitBtn.disabled = false;
        }).catch(function (err) {
            showToast('无法读取 PDF');
            console.error(err);
        });
    });

    splitBtn.addEventListener('click', function () {
        if (!needEngine(doSplit)) return;
    });

    function doSplit() {
        if (!splitFile) { showToast('请先选择 PDF'); return; }
        var rangeStr = splitRange.value.trim();
        if (!rangeStr) { showToast('请输入页码范围'); return; }
        var pages = parsePageRange(rangeStr);
        if (!pages.length) { showToast('页码格式错误'); return; }

        setBtnLoading(splitBtn, '提取中...');
        fileToArrayBuffer(splitFile).then(function (buf) {
            return PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
        }).then(function (src) {
            var total = src.getPageCount();
            var validPages = pages.filter(function (p) { return p >= 1 && p <= total; });
            if (!validPages.length) { showToast('没有有效页码'); setBtnLoading(splitBtn, '提取并下载'); return; }

            return PDFLib.PDFDocument.create().then(function (out) {
                var indices = validPages.map(function (p) { return p - 1; });
                return out.copyPages(src, indices).then(function (copied) {
                    copied.forEach(function (page) { out.addPage(page); });
                    return out.save();
                });
            });
        }).then(function (bytes) {
            setBtnLoading(splitBtn, '提取并下载');
            var blob = new Blob([bytes], { type: 'application/pdf' });
            downloadBlob(blob, 'split.pdf');
            showToast('提取完成，共 ' + pages.length + ' 页');
        }).catch(function (err) {
            setBtnLoading(splitBtn, '提取并下载');
            showToast('提取失败');
            console.error(err);
        });
    }

    // ================= 旋转 =================
    bindDropzone(rotateDrop, rotateInput, false, function (files) {
        if (!files.length) return;
        var f = files[0];
        if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { showToast('请选择 PDF 文件'); return; }
        rotateFile = f;
        rotateOpts.style.display = 'flex';
        rotateBtn.disabled = !enginesReady;
        fileToArrayBuffer(f).then(function (buf) {
            return PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
        }).then(function (doc) {
            rotateTotal.textContent = doc.getPageCount();
            rotateBtn.disabled = false;
        }).catch(function (err) {
            showToast('无法读取 PDF');
            console.error(err);
        });
    });

    rotateBtn.addEventListener('click', function () {
        if (!needEngine(doRotate)) return;
    });

    function doRotate() {
        if (!rotateFile) { showToast('请先选择 PDF'); return; }
        var angle = parseInt(rotateAngle.value, 10);

        setBtnLoading(rotateBtn, '旋转中...');
        fileToArrayBuffer(rotateFile).then(function (buf) {
            return PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
        }).then(function (doc) {
            var rangeStr = rotateRange.value.trim();
            var total = doc.getPageCount();
            var pagesToRotate = [];

            if (!rangeStr) {
                for (var i = 0; i < total; i++) pagesToRotate.push(i);
            } else {
                var pages = parsePageRange(rangeStr);
                pagesToRotate = pages.filter(function (p) { return p >= 1 && p <= total; }).map(function (p) { return p - 1; });
            }

            if (!pagesToRotate.length) { showToast('没有有效页码'); setBtnLoading(rotateBtn, '旋转并下载'); return; }

            pagesToRotate.forEach(function (idx) {
                var page = doc.getPage(idx);
                var currentRotation = page.getRotation().angle;
                page.setRotation(PDFLib.degrees((currentRotation + angle) % 360));
            });

            return doc.save();
        }).then(function (bytes) {
            setBtnLoading(rotateBtn, '旋转并下载');
            var blob = new Blob([bytes], { type: 'application/pdf' });
            downloadBlob(blob, 'rotated.pdf');
            showToast('旋转完成');
        }).catch(function (err) {
            setBtnLoading(rotateBtn, '旋转并下载');
            showToast('旋转失败');
            console.error(err);
        });
    }

    // ================= 删页 =================
    bindDropzone(deleteDrop, deleteInput, false, function (files) {
        if (!files.length) return;
        var f = files[0];
        if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { showToast('请选择 PDF 文件'); return; }
        deleteFile = f;
        deleteOpts.style.display = 'flex';
        deleteBtn.disabled = !enginesReady;
        fileToArrayBuffer(f).then(function (buf) {
            return PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
        }).then(function (doc) {
            deleteTotal.textContent = doc.getPageCount();
            deleteBtn.disabled = false;
        }).catch(function (err) {
            showToast('无法读取 PDF');
            console.error(err);
        });
    });

    deleteBtn.addEventListener('click', function () {
        if (!needEngine(doDelete)) return;
    });

    function doDelete() {
        if (!deleteFile) { showToast('请先选择 PDF'); return; }
        var rangeStr = deleteRange.value.trim();
        if (!rangeStr) { showToast('请输入要删除的页码'); return; }
        var pagesToDelete = parsePageRange(rangeStr);
        if (!pagesToDelete.length) { showToast('页码格式错误'); return; }

        setBtnLoading(deleteBtn, '删除中...');
        fileToArrayBuffer(deleteFile).then(function (buf) {
            return PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
        }).then(function (src) {
            var total = src.getPageCount();
            var deleteSet = {};
            pagesToDelete.forEach(function (p) {
                if (p >= 1 && p <= total) deleteSet[p] = true;
            });

            var keepIndices = [];
            for (var i = 1; i <= total; i++) {
                if (!deleteSet[i]) keepIndices.push(i - 1);
            }

            if (!keepIndices.length) { showToast('不能删除所有页面'); setBtnLoading(deleteBtn, '删除并下载'); return; }

            return PDFLib.PDFDocument.create().then(function (out) {
                return out.copyPages(src, keepIndices).then(function (copied) {
                    copied.forEach(function (page) { out.addPage(page); });
                    return out.save();
                });
            });
        }).then(function (bytes) {
            setBtnLoading(deleteBtn, '删除并下载');
            var blob = new Blob([bytes], { type: 'application/pdf' });
            downloadBlob(blob, 'deleted.pdf');
            showToast('删除完成');
        }).catch(function (err) {
            setBtnLoading(deleteBtn, '删除并下载');
            showToast('删除失败');
            console.error(err);
        });
    }

    // ================= 图转PDF =================
    bindDropzone(img2pdfDrop, img2pdfInput, true, function (files) {
        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            if (!/^image\/(png|jpeg)$/.test(f.type) && !/\.(png|jpe?g)$/i.test(f.name)) {
                showToast('请选择 PNG 或 JPG 图片：' + f.name);
                continue;
            }
            img2pdfFiles.push(f);
        }
        renderImg2pdfList();
    });

    function renderImg2pdfList() {
        if (!img2pdfFiles.length) { img2pdfList.style.display = 'none'; img2pdfBtn.disabled = !enginesReady; return; }
        img2pdfList.style.display = 'block';
        var html = '';
        for (var i = 0; i < img2pdfFiles.length; i++) {
            var f = img2pdfFiles[i];
            html +=
                '<div class="pt-list-row">' +
                    '<span style="color:#A8A29E;min-width:18px;">' + (i + 1) + '</span>' +
                    '<span class="pt-list-name" title="' + escapeHtml(f.name) + '">' + escapeHtml(f.name) + '</span>' +
                    '<span style="color:#A8A29E;font-size:0.75rem;">' + formatFileSize(f.size) + '</span>' +
                    (img2pdfFiles.length > 1 ? '<button type="button" class="pt-btn-mini" data-i="' + i + '" data-act="up">&#x2191;</button>' : '') +
                    (img2pdfFiles.length > 1 ? '<button type="button" class="pt-btn-mini" data-i="' + i + '" data-act="down">&#x2193;</button>' : '') +
                    '<button type="button" class="pt-btn-mini" data-i="' + i + '" data-act="del">&#x2715;</button>' +
                '</div>';
        }
        img2pdfList.innerHTML = html;
        img2pdfBtn.disabled = !enginesReady;
    }

    img2pdfList.addEventListener('click', function (e) {
        var btn = e.target.closest('.pt-btn-mini');
        if (!btn) return;
        var i = parseInt(btn.getAttribute('data-i'), 10);
        var act = btn.getAttribute('data-act');
        if (act === 'del') { img2pdfFiles.splice(i, 1); }
        else if (act === 'up' && i > 0) { swap(img2pdfFiles, i, i - 1); }
        else if (act === 'down' && i < img2pdfFiles.length - 1) { swap(img2pdfFiles, i, i + 1); }
        renderImg2pdfList();
    });

    img2pdfBtn.addEventListener('click', function () {
        if (!needEngine(doImg2pdf)) return;
    });

    function doImg2pdf() {
        if (!img2pdfFiles.length) { showToast('请先添加图片'); return; }
        setBtnLoading(img2pdfBtn, '生成中...');

        PDFLib.PDFDocument.create().then(function (pdfDoc) {
            var chain = Promise.resolve();

            img2pdfFiles.forEach(function (file) {
                chain = chain.then(function () {
                    return fileToArrayBuffer(file).then(function (buf) {
                        var isPng = /\.png$/i.test(file.name) || file.type === 'image/png';
                        return (isPng ? pdfDoc.embedPng(buf) : pdfDoc.embedJpg(buf)).then(function (img) {
                            var page = pdfDoc.addPage([img.width, img.height]);
                            page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
                        });
                    });
                });
            });

            return chain.then(function () {
                return pdfDoc.save();
            });
        }).then(function (bytes) {
            setBtnLoading(img2pdfBtn, '生成 PDF');
            var blob = new Blob([bytes], { type: 'application/pdf' });
            downloadBlob(blob, 'images.pdf');
            showToast('生成完成，共 ' + img2pdfFiles.length + ' 页');
        }).catch(function (err) {
            setBtnLoading(img2pdfBtn, '生成 PDF');
            showToast('生成失败，请检查图片格式');
            console.error(err);
        });
    }

    // ================= 水印 =================
    bindDropzone(watermarkDrop, watermarkInput, false, function (files) {
        if (!files.length) return;
        var f = files[0];
        if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { showToast('请选择 PDF 文件'); return; }
        watermarkFile = f;
        watermarkOpts.style.display = 'flex';
        watermarkBtn.disabled = !enginesReady;
        fileToArrayBuffer(f).then(function (buf) {
            return PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
        }).then(function (doc) {
            watermarkTotal.textContent = doc.getPageCount();
            watermarkBtn.disabled = false;
        }).catch(function (err) {
            showToast('无法读取 PDF');
            console.error(err);
        });
    });

    watermarkBtn.addEventListener('click', function () {
        if (!needEngine(doWatermark)) return;
    });

    function doWatermark() {
        if (!watermarkFile) { showToast('请先选择 PDF'); return; }
        var text = watermarkText.value.trim();
        if (!text) { showToast('请输入水印文字'); return; }
        var pos = watermarkPos.value;
        var opacity = parseFloat(watermarkOpacity.value);

        setBtnLoading(watermarkBtn, '添加中...');
        fileToArrayBuffer(watermarkFile).then(function (buf) {
            return PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
        }).then(function (doc) {
            var pages = doc.getPages();
            var fontSize = 48;
            var color = PDFLib.rgb(0.5, 0.5, 0.5);

            pages.forEach(function (page) {
                var width = page.getWidth();
                var height = page.getHeight();
                var textWidth = text.length * fontSize * 0.6;
                var x, y, rotate;

                if (pos === 'center') {
                    x = (width - textWidth) / 2;
                    y = height / 2;
                    rotate = PDFLib.degrees(0);
                } else if (pos === 'diagonal') {
                    x = width / 2 - textWidth / 2;
                    y = height / 2;
                    rotate = PDFLib.degrees(45);
                } else {
                    x = (width - textWidth) / 2;
                    y = 50;
                    rotate = PDFLib.degrees(0);
                }

                page.drawText(text, {
                    x: x,
                    y: y,
                    size: fontSize,
                    color: color,
                    opacity: opacity,
                    rotate: rotate
                });
            });

            return doc.save();
        }).then(function (bytes) {
            setBtnLoading(watermarkBtn, '添加水印');
            var blob = new Blob([bytes], { type: 'application/pdf' });
            downloadBlob(blob, 'watermarked.pdf');
            showToast('水印添加完成');
        }).catch(function (err) {
            setBtnLoading(watermarkBtn, '添加水印');
            showToast('添加失败');
            console.error(err);
        });
    }

    // ================= 优化体积 =================
    bindDropzone(optDrop, optInput, false, function (files) {
        if (!files.length) return;
        var f = files[0];
        if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { showToast('请选择 PDF 文件'); return; }
        optimizeFile = f;
        optInfo.style.display = 'none';
        optRes.style.display = 'flex';
        optBtn.disabled = !enginesReady;
    });

    optBtn.addEventListener('click', function () {
        if (!needEngine(doOptimize)) return;
    });

    function doOptimize() {
        if (!optimizeFile) { showToast('请先选择 PDF'); return; }
        setBtnLoading(optBtn, '优化中...');
        var originalSize = optimizeFile.size;
        fileToArrayBuffer(optimizeFile).then(function (buf) {
            return PDFLib.PDFDocument.load(buf, { ignoreEncryption: true }).then(function (doc) {
                return doc.save({ useObjectStreams: true });
            });
        }).then(function (bytes) {
            setBtnLoading(optBtn, '优化并下载');
            var blob = new Blob([bytes], { type: 'application/pdf' });
            var saved = blob.size;
            var delta = ((saved / originalSize - 1) * 100);
            var sign = delta >= 0 ? '+' : '';
            optInfo.style.display = 'block';
            optInfo.textContent = originalSize + ' → ' + saved + '（' + sign + delta.toFixed(1) + '%）' +
                (saved >= originalSize ? '，本文件结构已优化，无更多空间' : '');
            downloadBlob(blob, 'optimized.pdf');
            showToast('优化完成');
        }).catch(function (err) {
            setBtnLoading(optBtn, '优化并下载');
            showToast('优化失败，PDF 可能加密或损坏');
            console.error(err);
        });
    }

    // ================= 工具函数 =================
    function fileToArrayBuffer(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () { resolve(reader.result); };
            reader.onerror = function () { reject(reader.error); };
            reader.readAsArrayBuffer(file);
        });
    }

    function setBtnLoading(btn, text) {
        btn.disabled = false;
        btn.textContent = text;
    }

    function downloadBlob(blob, filename) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    }

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function parsePageRange(str) {
        var result = [];
        var parts = str.split(',');
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i].trim();
            if (/^\d+$/.test(part)) {
                result.push(parseInt(part, 10));
            } else if (/^\d+-\d+$/.test(part)) {
                var range = part.split('-');
                var start = parseInt(range[0], 10);
                var end = parseInt(range[1], 10);
                for (var p = start; p <= end; p++) result.push(p);
            }
        }
        return result;
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }
};

// 夏夜工具集 - URL 编解码 (ES5)

window.initUrlEncode = function(container) {

    var debounceTimer = null;

    // --- 构建 UI ---
    container.innerHTML =
        '<div class="ue-container">' +
            '<label class="ue-label">📝 原文</label>' +
            '<textarea class="ue-textarea" id="ueInput" placeholder="输入要编码的文本或 URL..." spellcheck="false"></textarea>' +
            '<div class="ue-btn-group">' +
                '<button class="ue-btn ue-btn-primary" id="ueEncode">🔒 编码</button>' +
                '<button class="ue-btn ue-btn-primary" id="ueDecode">🔓 解码</button>' +
                '<button class="ue-btn" id="ueCopy">📋 复制结果</button>' +
                '<button class="ue-btn" id="ueClear">🗑️ 清空</button>' +
            '</div>' +
            '<label class="ue-label">📤 结果</label>' +
            '<textarea class="ue-textarea" id="ueOutput" placeholder="编码/解码结果..." spellcheck="false" readonly></textarea>' +
            '<div class="ue-error" id="ueError" style="display:none;"></div>' +
        '</div>';

    var inputEl = document.getElementById('ueInput');
    var outputEl = document.getElementById('ueOutput');
    var errorEl = document.getElementById('ueError');
    var btnEncode = document.getElementById('ueEncode');
    var btnDecode = document.getElementById('ueDecode');
    var btnCopy = document.getElementById('ueCopy');
    var btnClear = document.getElementById('ueClear');

    // --- 核心逻辑 ---
    function doEncode() {
        var text = inputEl.value;
        errorEl.style.display = 'none';
        if (!text) {
            outputEl.value = '';
            return;
        }
        try {
            outputEl.value = encodeURIComponent(text);
        } catch (e) {
            errorEl.textContent = '编码错误: ' + e.message;
            errorEl.style.display = 'block';
        }
    }

    function doDecode() {
        var text = inputEl.value;
        errorEl.style.display = 'none';
        if (!text) {
            outputEl.value = '';
            return;
        }
        try {
            outputEl.value = decodeURIComponent(text);
        } catch (e) {
            if (e instanceof URIError) {
                errorEl.textContent = '解码错误: 无效的 URL 编码字符串';
            } else {
                errorEl.textContent = '解码错误: ' + e.message;
            }
            errorEl.style.display = 'block';
            outputEl.value = '';
        }
    }

    function copyResult() {
        var text = outputEl.value;
        if (!text) return;
        copyToClipboard(text);
        showToast('已复制到剪贴板');
    }

    function clearAll() {
        inputEl.value = '';
        outputEl.value = '';
        errorEl.style.display = 'none';
    }

    // --- 实时编码（防抖 300ms） ---
    inputEl.addEventListener('input', function() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(doEncode, 300);
    });

    // --- 事件绑定 ---
    btnEncode.addEventListener('click', doEncode);
    btnDecode.addEventListener('click', doDecode);
    btnCopy.addEventListener('click', copyResult);
    btnClear.addEventListener('click', clearAll);
};

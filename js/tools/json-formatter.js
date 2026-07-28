// 夏夜工具集 - JSON 格式化工具 (ES5)

window.initJSONFormatter = function(container) {

    var debounceTimer = null;

    // --- 构建 UI ---
    container.innerHTML =
        '<div class="jt-container">' +
            '<textarea class="jt-textarea" id="jtInput" placeholder="粘贴 JSON 数据..." spellcheck="false"></textarea>' +
            '<div class="jt-btn-group">' +
                '<button class="jt-btn jt-btn-primary" id="jtFormat">&#x1F4CB; 格式化</button>' +
                '<button class="jt-btn" id="jtCompact">&#x1F4A2; 压缩</button>' +
                '<button class="jt-btn" id="jtCopy">&#x1F4CB; 复制结果</button>' +
                '<button class="jt-btn jt-btn-danger" id="jtClear">&#x1F5D1; 清空</button>' +
            '</div>' +
            '<div class="jt-output" id="jtOutput">' +
                '<span class="jt-hint">&#x1F447; 输入 JSON 数据后点击「格式化」或「压缩」</span>' +
            '</div>' +
        '</div>';

    var input = document.getElementById('jtInput');
    var output = document.getElementById('jtOutput');
    var btnFormat = document.getElementById('jtFormat');
    var btnCompact = document.getElementById('jtCompact');
    var btnCopy = document.getElementById('jtCopy');
    var btnClear = document.getElementById('jtClear');

    var lastResultError = false;

    // --- 核心逻辑 ---
    function processJson(compact) {
        var raw = input.value.trim();
        if (!raw) {
            output.innerHTML = '<span class="jt-hint">&#x1F447; 请输入 JSON 数据</span>';
            output.classList.remove('jt-error');
            return;
        }

        try {
            var parsed = JSON.parse(raw);
            var result = compact ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2);
            output.textContent = result;
            output.classList.remove('jt-error');
            lastResultError = false;
        } catch (e) {
            output.textContent = 'JSON 解析错误: ' + e.message;
            output.classList.add('jt-error');
            lastResultError = true;
        }
    }

    function clearAll() {
        input.value = '';
        output.textContent = '';
        output.innerHTML = '<span class="jt-hint">&#x1F447; 请输入 JSON 数据</span>';
        output.classList.remove('jt-error');
    }

    function copyResult() {
        var text = output.textContent;
        if (!text || output.classList.contains('jt-error') || lastResultError) {
            return;
        }
        copyToClipboard(text);
    }

    // 自动格式化（粘贴后防抖）
    function autoFormat() {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(function() {
            processJson(false);
        }, 600);
    }

    // --- 事件绑定 ---
    btnFormat.addEventListener('click', function() { processJson(false); });
    btnCompact.addEventListener('click', function() { processJson(true); });
    btnCopy.addEventListener('click', copyResult);
    btnClear.addEventListener('click', clearAll);
    input.addEventListener('paste', function() {
        setTimeout(autoFormat, 50);
    });
    input.addEventListener('input', autoFormat);

    // Ctrl+Enter 快捷键
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            processJson(false);
        }
    });
};

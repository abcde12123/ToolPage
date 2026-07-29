// 夏夜工具集 - Base64 编解码工具 (ES5)

window.initBase64 = function(container) {

    var debounceTimer = null;

    // --- 构建 UI ---
    container.innerHTML =
        '<div class="b64-container">' +
            '<div class="b64-row">' +
                '<div class="b64-col">' +
                    '<label for="b64Input">&#x1F4DD; 原文</label>' +
                    '<textarea class="b64-textarea" id="b64Input" placeholder="输入要编码的文本..." spellcheck="false"></textarea>' +
                '</div>' +
                '<div class="b64-col">' +
                    '<label for="b64Output">Base64</label>' +
                    '<textarea class="b64-textarea" id="b64Output" placeholder="Base64 编码结果..." spellcheck="false"></textarea>' +
                '</div>' +
            '</div>' +
            '<div class="b64-btn-group">' +
                '<button class="b64-btn b64-btn-primary" id="b64Encode">编码 &#x2192;</button>' +
                '<button class="b64-btn b64-btn-primary" id="b64Decode">&#x2190; 解码</button>' +
                '<button class="b64-btn" id="b64Copy">&#x1F4CB; 复制结果</button>' +
                '<button class="b64-btn" id="b64Clear">&#x1F5D1; 清空</button>' +
            '</div>' +
        '</div>';

    var input = document.getElementById('b64Input');
    var output = document.getElementById('b64Output');
    var btnEncode = document.getElementById('b64Encode');
    var btnDecode = document.getElementById('b64Decode');
    var btnCopy = document.getElementById('b64Copy');
    var btnClear = document.getElementById('b64Clear');

    // --- 核心逻辑 ---
    function encode() {
        var text = input.value;
        if (!text) { output.value = ''; return; }
        try {
            var encoder = new TextEncoder();
            var bytes = encoder.encode(text);
            var binary = '';
            for (var i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            output.value = btoa(binary);
        } catch (e) {
            output.value = '编码错误: ' + e.message;
        }
    }

    function decode() {
        var text = output.value;
        if (!text) { input.value = ''; return; }
        // 先尝试用户可能在 output 区输入了原文
        // 一般 decode 是将 output 区的 base64 解码到 input 区
        try {
            var binary = atob(text);
            var bytes = new Uint8Array(binary.length);
            for (var i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            var decoder = new TextDecoder();
            input.value = decoder.decode(bytes);
        } catch (e) {
            input.value = '解码错误: 无效的 Base64 字符串';
        }
    }

    function copyResult() {
        var text = output.value;
        if (!text) return;
        copyToClipboard(text);
    }

    function clearAll() {
        input.value = '';
        output.value = '';
    }

    // 实时转换（防抖）
    function onInputChange() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function() {
            // 自动编码（原文变化时）
            if (input.value) {
                encode();
            }
        }, 300);
    }

    // --- 事件绑定 ---
    btnEncode.addEventListener('click', encode);
    btnDecode.addEventListener('click', decode);
    btnCopy.addEventListener('click', copyResult);
    btnClear.addEventListener('click', clearAll);
    input.addEventListener('input', function() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(encode, 300);
    });
    output.addEventListener('input', function() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(decode, 300);
    });
};

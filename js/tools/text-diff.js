// 夏夜工具集 - 文本差异对比 (ES5)

window.initTextDiff = function(container) {

    var diffReady = false;

    // --- 构建 UI ---
    container.innerHTML =
        '<div class="df-container">' +
            '<div class="df-textarea-row">' +
                '<div class="df-col">' +
                    '<label for="dfOriginal">📄 原文</label>' +
                    '<textarea class="df-textarea" id="dfOriginal" placeholder="输入原文..." spellcheck="false"></textarea>' +
                '</div>' +
                '<div class="df-col">' +
                    '<label for="dfModified">📝 新文本</label>' +
                    '<textarea class="df-textarea" id="dfModified" placeholder="输入新文本..." spellcheck="false"></textarea>' +
                '</div>' +
            '</div>' +
            '<div class="df-btn-group">' +
                '<button class="df-btn df-btn-primary" id="dfCompare">🔍 对比</button>' +
                '<button class="df-btn" id="dfClear">🗑️ 清空</button>' +
            '</div>' +
            '<div class="df-result" id="dfResult">' +
                '<span style="color:#A8A29E;">👆 输入两段文本后点击对比</span>' +
            '</div>' +
        '</div>';

    var originalEl = document.getElementById('dfOriginal');
    var modifiedEl = document.getElementById('dfModified');
    var resultEl = document.getElementById('dfResult');
    var btnCompare = document.getElementById('dfCompare');
    var btnClear = document.getElementById('dfClear');

    // --- 动态加载 diff 库 ---
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/diff/dist/diff.min.js';
    script.onload = function() {
        diffReady = true;
    };
    script.onerror = function() {
        resultEl.innerHTML = '<div class="df-cdn-error">⚠️ diff 库加载失败，请检查网络连接后刷新页面重试</div>';
    };
    document.head.appendChild(script);

    // If diff is already available (preloaded, cached, or test mock), use it immediately
    if (typeof diff !== 'undefined') {
        diffReady = true;
    }

    // --- 核心逻辑 ---
    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function doCompare() {
        if (!diffReady) {
            resultEl.innerHTML = '<span style="color:#A8A29E;">diff 库加载中，请稍候...</span>';
            return;
        }
        var text1 = originalEl.value;
        var text2 = modifiedEl.value;

        if (!text1 && !text2) {
            resultEl.innerHTML = '<span style="color:#A8A29E;">请至少输入一段文本</span>';
            return;
        }
        if (text1 === text2) {
            resultEl.innerHTML = '<div class="df-identical">✅ 文本内容完全一致</div>';
            return;
        }

        try {
            var changes = diff.diffWords(text1, text2);
            var html = '';
            for (var i = 0; i < changes.length; i++) {
                var part = changes[i];
                var escaped = escapeHtml(part.value);
                if (part.added) {
                    html += '<span class="df-added">' + escaped + '</span>';
                } else if (part.removed) {
                    html += '<span class="df-removed">' + escaped + '</span>';
                } else {
                    html += '<span class="df-unchanged">' + escaped + '</span>';
                }
            }
            resultEl.innerHTML = html;
        } catch (e) {
            resultEl.innerHTML = '<span style="color:#DC2626;">对比出错: ' + escapeHtml(e.message) + '</span>';
        }
    }

    function clearAll() {
        originalEl.value = '';
        modifiedEl.value = '';
        resultEl.innerHTML = '<span style="color:#A8A29E;">👆 输入两段文本后点击对比</span>';
    }

    // --- 事件绑定 ---
    btnCompare.addEventListener('click', doCompare);
    btnClear.addEventListener('click', clearAll);
};

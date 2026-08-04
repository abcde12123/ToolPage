// 夏夜工具集 - Markdown 编辑器 (ES5)

window.initMarkdown = function(container) {

    var debounceTimer = null;
    var markedReady = false;

    // --- 先渲染基础 UI ---
    container.innerHTML =
        '<div class="md-container">' +
            '<div class="md-editor-row">' +
                '<div class="md-pane">' +
                    '<label for="mdEditor">📝 编辑</label>' +
                    '<textarea class="md-textarea" id="mdEditor" placeholder="在这里写 Markdown..." spellcheck="false"></textarea>' +
                '</div>' +
                '<div class="md-pane">' +
                    '<label>👁️ 预览</label>' +
                    '<div class="md-preview" id="mdPreview"></div>' +
                '</div>' +
            '</div>' +
            '<div class="md-toolbar">' +
                '<button class="md-btn md-btn-primary" id="mdExport">📥 导出 HTML</button>' +
                '<button class="md-btn" id="mdClear">🗑️ 清空</button>' +
            '</div>' +
        '</div>';

    var editor = document.getElementById('mdEditor');
    var preview = document.getElementById('mdPreview');
    var btnExport = document.getElementById('mdExport');
    var btnClear = document.getElementById('mdClear');

    // --- 动态加载 marked ---
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
    script.onload = function() {
        // marked 4.x uses { breaks: true, gfm: true } — configure globally
        if (typeof marked !== 'undefined' && marked.setOptions) {
            marked.setOptions({ breaks: true, gfm: true });
        }
        markedReady = true;
        renderPreview();
    };
    script.onerror = function() {
        preview.innerHTML = '<div class="md-cdn-error">⚠️ marked 库加载失败，请检查网络连接后刷新页面重试</div>';
    };
    document.head.appendChild(script);

    // If marked is already available (CDN cached, preloaded, or test mock), use it immediately
    if (typeof marked !== 'undefined') {
        if (typeof marked.setOptions === 'function') {
            marked.setOptions({ breaks: true, gfm: true });
        }
        markedReady = true;
        renderPreview();
    }

    // --- 简易 HTML 消毒（去除 script 标签和 on* 事件属性）---
    function sanitizeHTML(html) {
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
            .replace(/\son\w+\s*=\s*'[^']*'/gi, '');
    }

    // --- 核心逻辑 ---
    function renderPreview() {
        var text = editor.value;
        if (!text) {
            preview.innerHTML = '';
            return;
        }
        if (!markedReady) {
            preview.innerHTML = '';
            return;
        }
        try {
            // marked 4.x global marked.parse()
            var html = typeof marked.parse === 'function'
                ? marked.parse(text)
                : marked(text);
            preview.innerHTML = sanitizeHTML(html);
        } catch (e) {
            preview.textContent = '渲染错误: ' + e.message;
        }
    }

    function exportHTML() {
        var text = editor.value;
        if (!text) {
            showToast('没有内容可导出');
            return;
        }
        if (!markedReady) {
            showToast('marked 库尚未加载完成');
            return;
        }
        try {
            var bodyHTML = typeof marked.parse === 'function'
                ? marked.parse(text)
                : marked(text);
            bodyHTML = sanitizeHTML(bodyHTML);
            var fullHTML = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n' +
                '<meta charset="UTF-8">\n' +
                '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
                '<title>Markdown Export</title>\n' +
                '<style>\n' +
                'body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; ' +
                'max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.8; color: #1E293B; }\n' +
                'pre { background: #f5f5f5; padding: 12px 16px; border-radius: 8px; overflow-x: auto; }\n' +
                'code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; }\n' +
                'blockquote { border-left: 3px solid #a78bfa; padding-left: 12px; color: #78716C; }\n' +
                'table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 8px; } ' +
                'th { background: #fafafa; }\n' +
                'img { max-width: 100%; }\n' +
                '</style>\n</head>\n<body>\n' +
                bodyHTML + '\n</body>\n</html>';
            var blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'markdown-export.html';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('HTML 文件已导出');
        } catch (e) {
            showToast('导出失败: ' + e.message);
        }
    }

    function clearAll() {
        editor.value = '';
        preview.innerHTML = '';
    }

    // --- 事件绑定 ---
    editor.addEventListener('input', function() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(renderPreview, 300);
    });

    btnExport.addEventListener('click', exportHTML);
    btnClear.addEventListener('click', clearAll);

    // 初始渲染（如果 marked 已经加载）
    if (markedReady) {
        renderPreview();
    }
};

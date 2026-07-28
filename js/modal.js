// 夏夜工具集 - 弹窗管理器 (ES5)

// --- 全局工具函数 ---
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function() {
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
    } catch (e) {
        // 静默失败
    }
    document.body.removeChild(ta);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    var units = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(1024));
    if (i >= units.length) i = units.length - 1;
    return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

var ModalManager = (function() {

    var overlay = null;
    var panel = null;
    var titleEl = null;
    var bodyEl = null;
    var closeBtn = null;
    var isOpen = false;
    var escHandler = null;
    var closeTimer = null;

    function init() {
        overlay = document.getElementById('toolModal');
        panel = overlay.querySelector('.modal-panel');
        titleEl = document.getElementById('modalTitle');
        bodyEl = document.getElementById('modalBody');
        closeBtn = document.getElementById('modalClose');

        // 关闭按钮
        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            close();
        });

        // 点击 backdrop 关闭
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                close();
            }
        });
    }

    function open(title, contentHtml) {
        if (!overlay) { init(); }

        // 清除旧的关闭定时器（防止快速开/关的竞态）
        if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
        }

        // 如果已打开，先关掉
        if (isOpen) {
            closeImmediate();
        }

        titleEl.textContent = title;
        bodyEl.innerHTML = contentHtml;

        // 显示 overlay
        overlay.style.display = 'flex';
        overlay.style.opacity = '0';
        panel.style.opacity = '0';
        panel.style.transform = 'translateY(0) scale(0.9)';

        // 强制回流后触发动画
        overlay.offsetHeight;

        overlay.style.opacity = '1';
        overlay.classList.add('open');
        panel.style.opacity = '1';
        panel.style.transform = 'translateY(0) scale(1)';

        // 锁定 body 滚动
        document.body.classList.add('modal-open');

        isOpen = true;

        // ESC 关闭
        escHandler = function(e) {
            if (e.key === 'Escape') {
                close();
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    function close() {
        if (!isOpen) { return; }

        // 播放关闭动画
        overlay.style.opacity = '0';
        panel.style.opacity = '0';
        panel.style.transform = 'translateY(0) scale(0.9)';
        overlay.classList.remove('open');

        // 动画结束后隐藏
        closeTimer = setTimeout(function() {
            overlay.style.display = 'none';
            document.body.classList.remove('modal-open');
            closeTimer = null;
        }, 350);

        isOpen = false;

        if (escHandler) {
            document.removeEventListener('keydown', escHandler);
            escHandler = null;
        }
    }

    function closeImmediate() {
        if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
        }
        overlay.style.display = 'none';
        overlay.style.opacity = '0';
        overlay.classList.remove('open');
        document.body.classList.remove('modal-open');
        isOpen = false;
        if (escHandler) {
            document.removeEventListener('keydown', escHandler);
            escHandler = null;
        }
    }

    // 暴露公共 API
    return {
        open: open,
        close: close
    };
})();

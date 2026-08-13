// 夏夜工具集 - 联系方式：邮箱防抓取（运行时拼接）+ 点击邮箱/按钮一键复制（纯前端，无依赖）
(function () {
  'use strict';

  var mailEl = document.getElementById('contactEmail');
  var copyBtn = document.getElementById('contactCopy');
  if (!mailEl) return;

  // 邮箱分片拼接，HTML 里不出现完整地址，防普通爬虫抓取
  var addr = ['xiaye', '121', '23', '@', 'qq', '.', 'com'].join('');

  mailEl.textContent = addr;

  function copyText(text) {
    // 优先 Clipboard API，失败降级隐藏 textarea + execCommand
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(function () { /* 静默 */ });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) { /* 静默 */ }
      document.body.removeChild(ta);
    }
  }

  function showCopied() {
    if (!copyBtn) return;
    copyBtn.textContent = '✅ 已复制';
    copyBtn.classList.add('about__copy--done');
    setTimeout(function () {
      copyBtn.textContent = '📋 复制';
      copyBtn.classList.remove('about__copy--done');
    }, 1600);
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      copyText(addr);
      showCopied();
    });
  }
  // 点击低调的邮箱文本同样复制（比 mailto 更实用，点击即有反馈）
  mailEl.addEventListener('click', function () {
    copyText(addr);
    showCopied();
  });
})();

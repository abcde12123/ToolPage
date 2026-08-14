// 夏夜工具集 - 反馈浮窗（右上角气泡按钮 → 小浮窗 + 全屏模糊遮罩）
(function () {
  'use strict';

  // ===== DOM =====
  var btn = document.getElementById('btnFeedback');
  var overlay = document.getElementById('feedbackOverlay');
  var closeBtn = document.getElementById('feedbackClose');
  var form = document.getElementById('feedbackForm');
  var nameInput = document.getElementById('feedbackName');
  var contactInput = document.getElementById('feedbackContact');
  var contentInput = document.getElementById('feedbackContent');
  var honeypot = document.getElementById('feedbackHoneypot');
  var submitBtn = document.getElementById('feedbackSubmit');
  var msgEl = document.getElementById('feedbackMsg');

  if (!btn || !overlay || !form) return;   // 页面缺结构时静默退出

  var isOpen = false;
  var closeTimer = null;
  var escHandler = null;

  // 测量滚动条宽度（缓存），锁定 body 滚动时补偿 padding，防止背景位移
  var scrollbarWidth = null;
  function getScrollbarWidth() {
    if (scrollbarWidth !== null) return scrollbarWidth;
    scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    return scrollbarWidth;
  }

  function setMsg(text, type) {
    msgEl.textContent = text;
    msgEl.className = 'feedback__msg feedback__msg--' + (type || 'error');
    msgEl.hidden = false;
  }
  function clearMsg() {
    msgEl.hidden = true;
    msgEl.textContent = '';
  }

  // ===== 打开 / 关闭 =====
  function open() {
    if (isOpen) return;
    isOpen = true;
    clearMsg();

    overlay.style.display = 'flex';
    overlay.style.opacity = '0';
    overlay.offsetHeight;                 // 强制回流后触发入场动画
    overlay.style.opacity = '1';
    overlay.classList.add('open');

    document.body.style.paddingRight = getScrollbarWidth() + 'px';
    document.body.classList.add('modal-open');

    escHandler = function (e) {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', escHandler);

    setTimeout(function () { contentInput.focus(); }, 120);   // 打开即聚焦反馈框
  }

  function close() {
    if (!isOpen) return;
    overlay.classList.remove('open');
    overlay.style.opacity = '0';

    closeTimer = setTimeout(function () {
      overlay.style.display = 'none';
      document.body.style.paddingRight = '';
      document.body.classList.remove('modal-open');
      closeTimer = null;
      isOpen = false;
    }, 350);

    if (escHandler) {
      document.removeEventListener('keydown', escHandler);
      escHandler = null;
    }
  }

  // ===== 提交 =====
  function handleSubmit(e) {
    e.preventDefault();
    if (submitBtn.disabled) return;

    var content = contentInput.value.trim();
    if (!content) {
      setMsg('请写下你的反馈内容～');
      contentInput.focus();
      return;
    }

    var name = nameInput.value.trim();
    var contact = contactInput.value.trim();
    // 蜜罐字段随表单一起传；后端检测到非空即判定为机器人，静默丢弃
    var website = honeypot ? honeypot.value.trim() : '';

    submitBtn.disabled = true;
    submitBtn.textContent = '提交中…';
    clearMsg();

    fetch('/downloads/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, contact: contact, content: content, website: website })
    })
      .then(function (resp) {
        return resp.json().then(function (data) {
          return { ok: resp.ok, data: data };
        });
      })
      .then(function (r) {
        if (!r.ok) {
          throw { msg: r.data && r.data.error ? r.data.error : '提交失败，请稍后再试' };
        }
        // 成功：清空表单，提示后关闭
        nameInput.value = '';
        contactInput.value = '';
        contentInput.value = '';
        submitBtn.textContent = '提交反馈 ✨';
        setMsg('已收到，感谢你的反馈～ 💜', 'ok');
        setTimeout(close, 1400);
      })
      .catch(function (err) {
        submitBtn.textContent = '提交反馈 ✨';
        setMsg(err && err.msg ? err.msg : '网络开小差了，请稍后再试');
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  }

  // ===== 事件绑定 =====
  btn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  form.addEventListener('submit', handleSubmit);

  // 点击遮罩空白处关闭：仅当按下起点也在遮罩上才算「直点背景」，否则拖选文本拖到遮罩松开会误关
  var downOnBackdrop = false;
  overlay.addEventListener('mousedown', function (e) {
    downOnBackdrop = (e.target === overlay);
  });
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay && downOnBackdrop) close();
  });
})();

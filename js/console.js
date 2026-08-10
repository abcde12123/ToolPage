// 夏夜工具集 - 后台控制台（登录 + 跳转枢纽）
// 签到系统本体托管在 xiayevfx.cn（公司二维码入口，不可改动），
// 这里只做统一入口：登录校验密码 → 跳转到 xiayevfx.cn 的签到登记/管理页。
(function () {
  'use strict';

  // ===== 配置 =====
  var CHECKIN_API = 'https://xiayevfx.cn/api/admin/stats';  // 仅用于密码校验（只读，不传数据）
  var REGISTER_URL = 'https://xiayevfx.cn/register';        // 签到登记（公司二维码固定入口）
  var ADMIN_URL = 'https://xiayevfx.cn/admin';              // 签到后台管理
  var SESSION_KEY = 'console_admin_password';               // 会话内记住已登录（页面刷新不丢）

  // ===== DOM =====
  var overlay = document.getElementById('consoleOverlay');
  var loginView = document.getElementById('consoleLogin');
  var mainView = document.getElementById('consoleMain');
  var loginForm = document.getElementById('consoleLoginForm');
  var passwordInput = document.getElementById('consolePassword');
  var loginBtn = document.getElementById('consoleLoginBtn');
  var loginMsg = document.getElementById('consoleLoginMsg');
  var loginClose = document.getElementById('consoleLoginClose');
  var mainClose = document.getElementById('consoleClose');
  var logoutBtn = document.getElementById('consoleLogout');
  var btnConsole = document.getElementById('btnConsole');
  var cardCheckin = document.getElementById('consoleCardCheckin');
  var cardAdmin = document.getElementById('consoleCardAdmin');

  var password = null;
  var isOpen = false;
  var closeTimer = null;
  var escHandler = null;

  // ===== 视图切换 =====
  function setMsg(text, type) {
    loginMsg.textContent = text;
    loginMsg.className = 'console__msg console__msg--' + (type || 'error');
    loginMsg.hidden = false;
  }

  function clearMsg() {
    loginMsg.hidden = true;
    loginMsg.textContent = '';
  }

  function showView(el) {
    loginView.hidden = (el !== loginView);
    mainView.hidden = (el !== mainView);
    // 重放入场动画
    el.classList.remove('console-panel--entering');
    void el.offsetWidth;
    el.classList.add('console-panel--entering');
    // 新面板聚焦
    if (el === loginView) {
      setTimeout(function () { passwordInput.focus(); }, 250);
    }
  }

  function showLoginView() {
    clearMsg();
    passwordInput.value = '';
    showView(loginView);
  }

  function showMainView() {
    showView(mainView);
  }

  // 打开时决定显示哪一屏：会话内已登录 → 直接进控制台
  function decideView() {
    if (password) { showMainView(); return; }
    var saved = null;
    try { saved = sessionStorage.getItem(SESSION_KEY); } catch (e) { /* 忽略 */ }
    if (saved) {
      password = saved;
      showMainView();
    } else {
      showLoginView();
    }
  }

  // ===== 打开 / 关闭 =====
  function open() {
    if (isOpen) return;
    isOpen = true;

    overlay.style.display = 'flex';
    overlay.style.opacity = '0';
    loginView.style.opacity = '0';
    mainView.style.opacity = '0';
    loginView.style.transform = 'translateY(0) scale(0.9)';
    mainView.style.transform = 'translateY(0) scale(0.9)';

    // 强制回流后触发入场动画
    overlay.offsetHeight;
    overlay.style.opacity = '1';
    overlay.classList.add('open');
    loginView.style.opacity = '1';
    mainView.style.opacity = '1';
    loginView.style.transform = 'translateY(0) scale(1)';
    mainView.style.transform = 'translateY(0) scale(1)';

    document.body.classList.add('modal-open');

    decideView();

    escHandler = function (e) {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', escHandler);
  }

  function close() {
    if (!isOpen) return;

    overlay.style.opacity = '0';
    loginView.style.opacity = '0';
    mainView.style.opacity = '0';
    loginView.style.transform = 'translateY(0) scale(0.9)';
    mainView.style.transform = 'translateY(0) scale(0.9)';
    overlay.classList.remove('open');

    closeTimer = setTimeout(function () {
      overlay.style.display = 'none';
      document.body.classList.remove('modal-open');
      closeTimer = null;
      isOpen = false;
    }, 350);

    if (escHandler) {
      document.removeEventListener('keydown', escHandler);
      escHandler = null;
    }
  }

  // ===== 登录 =====
  function handleLogin(e) {
    e.preventDefault();
    if (loginBtn.disabled) return;

    var val = passwordInput.value.trim();
    if (!val) {
      setMsg('请输入管理密码');
      shakeInput();
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = '登录中...';
    clearMsg();

    // 用签到后台同一套密码校验（X-Admin-Password 头，跨域 fetch，CORS 已开放）
    fetch(CHECKIN_API, {
      headers: { 'X-Admin-Password': val }
    })
      .then(function (resp) {
        if (resp.status === 401) throw { msg: '密码错误' };
        if (resp.status === 429) throw { msg: '尝试次数过多，请稍后再试' };
        if (!resp.ok) throw { msg: '服务器开小差了，请稍后再试' };
        return resp.json();
      })
      .then(function () {
        password = val;
        try { sessionStorage.setItem(SESSION_KEY, val); } catch (err) { /* 忽略 */ }
        showMainView();
      })
      .catch(function (err) {
        password = null;
        setMsg(err && err.msg ? err.msg : '网络连接失败，请检查网络');
        shakeInput();
      })
      .finally(function () {
        loginBtn.disabled = false;
        loginBtn.textContent = '✓ 登录';
      });
  }

  function shakeInput() {
    passwordInput.classList.remove('shake');
    void passwordInput.offsetWidth;
    passwordInput.classList.add('shake');
    setTimeout(function () { passwordInput.classList.remove('shake'); }, 500);
  }

  // ===== 事件绑定 =====
  btnConsole.addEventListener('click', open);
  loginClose.addEventListener('click', close);
  mainClose.addEventListener('click', close);
  loginForm.addEventListener('submit', handleLogin);

  logoutBtn.addEventListener('click', function () {
    password = null;
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* 忽略 */ }
    showLoginView();
  });

  // 签到登记 → 新标签跳 xiayevfx.cn/register（公司二维码固定入口）
  cardCheckin.addEventListener('click', function () {
    window.open(REGISTER_URL, '_blank', 'noopener');
  });

  // 签到管理 → 新标签跳 xiayevfx.cn/admin（密码不落地，在管理页自行输入）
  cardAdmin.addEventListener('click', function () {
    window.open(ADMIN_URL, '_blank', 'noopener');
  });

  // 点击遮罩空白处关闭
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });
})();

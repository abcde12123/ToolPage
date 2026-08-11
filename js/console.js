// 夏夜工具集 - 后台控制台（登录 + 全屏集成页）
// 签到系统本体托管在 xiayevfx.cn（公司二维码入口，不可改动），
// 控制台只做统一入口卡片；服务器状态实时探测 3 台机器（主站/Oulu/CloudCone）。
(function () {
  'use strict';

  // ===== 配置 =====
  var CHECKIN_API = 'https://xiayevfx.cn/api/admin/stats';  // 仅用于密码校验（只读，不传数据）
  var REGISTER_URL = 'https://xiayevfx.cn/register';        // 签到登记（公司二维码固定入口）
  var ADMIN_URL = 'https://xiayevfx.cn/admin';              // 签到后台管理
  var SESSION_KEY = 'console_admin_password';               // 会话内记住已登录（页面刷新不丢）

  // 服务器状态探测：checkUrl 相对/绝对均可（面板走同源相对路径，避免 CORS）
  var SERVERS = [
    {
      id: 'aliyun',
      cardId: 'serverAliyun',
      checkUrl: 'https://xiayevfx.cn/health',   // 主站健康检查（register-web，CORS 已开放）
      entryUrl: 'https://xiaye.xyz/',           // 主站入口
      entryLabel: '打开站点'
    },
    {
      id: 'oulu',
      cardId: 'serverOulu',
      checkUrl: '/oulu/',                       // 面板网关（同源，Basic Auth 401 = 通）
      entryUrl: 'https://xiaye.xyz/oulu/',
      entryLabel: '打开面板'
    },
    {
      id: 'cc',
      cardId: 'serverCC',
      checkUrl: '/cc/',
      entryUrl: 'https://xiaye.xyz/cc/',
      entryLabel: '打开面板'
    }
  ];
  var CHECK_TIMEOUT = 8000;                     // 单台探测超时（毫秒）

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
  var refreshBtn = document.getElementById('consoleRefreshStatus');

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
    checkAllServers();   // 每次进入控制台都刷新服务器状态
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

  // ===== 服务器状态探测 =====
  function setServerStatus(cardId, state, text) {
    var card = document.getElementById(cardId);
    if (!card) return;
    var statusEl = card.querySelector('.server-card__status');
    if (!statusEl) return;
    statusEl.className = 'server-card__status server-card__status--' + state;
    var txt = statusEl.querySelector('.server-text');
    if (txt) txt.textContent = text;
  }

  // 带超时的 fetch（AbortController 不可用时退化为普通 fetch）
  function fetchWithTimeout(url, ms) {
    var controller = null;
    // credentials:'omit' 很关键：面板网关带 Basic Auth，默认 same-origin fetch 会触发
    // 浏览器原生认证弹窗并挂起（永不返回）；omit 后跳过认证入口，401 直接返回 JS，用于判活
    var opts = { cache: 'no-store', redirect: 'follow', credentials: 'omit' };
    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();
      opts.signal = controller.signal;
      setTimeout(function () { try { controller.abort(); } catch (e) { /* 忽略 */ } }, ms);
    }
    return fetch(url, opts);
  }

  function checkServer(server, done) {
    var started = Date.now();
    setServerStatus(server.cardId, 'checking', '检测中...');

    fetchWithTimeout(server.checkUrl, CHECK_TIMEOUT)
      .then(function (resp) {
        var ms = Date.now() - started;
        var s = resp.status;
        // 200=正常；面板是 Basic Auth 保护，401 说明隧道+面板都活着，也算在线
        if (s === 200 || s === 401) {
          setServerStatus(server.cardId, 'ok', '在线 · ' + ms + 'ms');
        } else if (s >= 500) {
          setServerStatus(server.cardId, 'warn', '服务异常 ' + s);
        } else {
          setServerStatus(server.cardId, 'warn', '状态异常 ' + s);
        }
      })
      .catch(function () {
        var ms = Date.now() - started;
        setServerStatus(server.cardId, 'down', ms >= CHECK_TIMEOUT - 100 ? '超时 · 无法连接' : '离线');
      })
      .then(function () {
        if (typeof done === 'function') done();
      });
  }

  function checkAllServers() {
    if (!refreshBtn) return;
    var pending = SERVERS.length;
    refreshBtn.disabled = true;
    for (var i = 0; i < SERVERS.length; i++) {
      checkServer(SERVERS[i], function () {
        pending--;
        if (pending <= 0) refreshBtn.disabled = false;
      });
    }
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

  // 服务器入口 → 新标签打开对应站点/面板
  document.querySelectorAll('.server-card__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-entry');
      for (var i = 0; i < SERVERS.length; i++) {
        if (SERVERS[i].id === key) {
          window.open(SERVERS[i].entryUrl, '_blank', 'noopener');
          return;
        }
      }
    });
  });

  // 手动刷新服务器状态
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      checkAllServers();
    });
  }

  // 点击遮罩空白处关闭
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });
})();

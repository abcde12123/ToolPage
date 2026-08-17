// 夏夜工具集 - 后台控制台（登录 + 全屏集成页）
// 签到系统本体托管在 xiayevfx.cn（公司二维码入口，不可改动），
// 控制台只做统一入口卡片；服务器状态实时探测 3 台机器（主站/Oulu/CloudCone）。
(function () {
  'use strict';

  // ===== 配置 =====
  var CHECKIN_API = 'https://xiayevfx.cn/api/admin/stats';  // 仅用于密码校验（只读，不传数据）
  var REGISTER_URL = 'https://xiayevfx.cn/register';        // 签到登记（公司二维码固定入口）
  var ADMIN_URL = 'https://xiayevfx.cn/admin';              // 签到后台管理
  var DOWNLOAD_URL = 'https://xiaye.xyz/downloads/';        // 私人下载站（登录控制台后自动放行）
  var SESSION_URL = '/downloads/api/session';               // 换下载站访问 cookie（控制台密码静默换取）
  var LOGOUT_URL = '/downloads/api/logout';                 // 登出时清下载站 cookie
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
  var cardDownload = document.getElementById('consoleCardDownload');
  var cardToolOrder = document.getElementById('consoleCardToolOrder');
  var refreshBtn = document.getElementById('consoleRefreshStatus');

  var password = null;
  var isOpen = false;
  var closeTimer = null;
  var escHandler = null;
  var scrollbarWidth = null;

  // 工具顺序弹窗相关
  var toolOrderModal = document.getElementById('toolOrderModal');
  var toolOrderClose = document.getElementById('toolOrderClose');
  var toolOrderCancel = document.getElementById('toolOrderCancel');
  var toolOrderSave = document.getElementById('toolOrderSave');
  var toolOrderReset = document.getElementById('toolOrderReset');
  var toolOrderList = document.getElementById('toolOrderList');
  var toolOrderMsg = document.getElementById('toolOrderMsg');
  var currentToolOrder = [];
  var draggedItem = null;

  // 测量滚动条宽度（缓存），锁定 body 滚动时用它补偿 padding，防止背景位移
  function getScrollbarWidth() {
    if (scrollbarWidth !== null) return scrollbarWidth;
    scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    return scrollbarWidth;
  }

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

    // 锁定 body 滚动，补偿滚动条宽度防止背景位移
    document.body.style.paddingRight = getScrollbarWidth() + 'px';
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
        obtainDownloadAccess();   // 静默换下载站 cookie（失败不阻塞控制台登录）
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
  }

  function shakeInput() {
    passwordInput.classList.remove('shake');
    void passwordInput.offsetWidth;
    passwordInput.classList.add('shake');
    setTimeout(function () { passwordInput.classList.remove('shake'); }, 500);
  }

  // 换取下载站访问 cookie（用已登录的管理密码，用户无感；失败静默不影响控制台）
  function obtainDownloadAccess() {
    if (!password) return Promise.resolve(false);
    return fetch(SESSION_URL, {
      method: 'POST',
      headers: { 'X-Admin-Password': password }
    }).then(function (r) { return r.ok; }).catch(function () { return false; });
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
    fetch(LOGOUT_URL, { method: 'POST' }).catch(function () { /* 忽略 */ });  // 清下载站 cookie
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

  // 下载站 → 先静默续 cookie 再当前标签页跳转（光知道 URL 进不来，靠控制台登录态放行）
  if (cardDownload) {
    cardDownload.addEventListener('click', function () {
      obtainDownloadAccess().finally(function () {
        location.href = DOWNLOAD_URL;
      });
    });
  }

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

  // 点击遮罩空白处关闭：仅当按下起点也在遮罩上才算「直点背景」，否则拖选文本拖到遮罩松开会误关
  var downOnBackdrop = false;
  overlay.addEventListener('mousedown', function (e) {
    downOnBackdrop = (e.target === overlay);
  });
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay && downOnBackdrop) close();
  });

  // ===== 工具顺序管理 =====
  function getToolKey(tool) { return tool.file || tool.url || tool.name; }

  function openToolOrderModal() {
    if (!password) {
      setMsg('请先登录');
      return;
    }

    // 加载当前顺序
    fetch('/downloads/api/tool-order', { cache: 'no-store' })
      .then(function(resp) {
        if (resp.status === 404) {
          // 没有自定义顺序，使用默认
          currentToolOrder = window.TOOLS_DEFAULT ? window.TOOLS_DEFAULT.slice() : [];
        } else if (resp.ok) {
          return resp.json().then(function(data) {
            if (data && Array.isArray(data.order)) {
              // 根据 order 重排工具
              var keyMap = {};
              var defaults = window.TOOLS_DEFAULT || [];
              for (var i = 0; i < defaults.length; i++) {
                keyMap[getToolKey(defaults[i])] = defaults[i];
              }
              currentToolOrder = [];
              for (var i = 0; i < data.order.length; i++) {
                var tool = keyMap[data.order[i]];
                if (tool) currentToolOrder.push(tool);
              }
              // 补上新增的工具
              for (var i = 0; i < defaults.length; i++) {
                if (currentToolOrder.indexOf(defaults[i]) === -1) {
                  currentToolOrder.push(defaults[i]);
                }
              }
            } else {
              currentToolOrder = window.TOOLS_DEFAULT ? window.TOOLS_DEFAULT.slice() : [];
            }
          });
        } else {
          throw new Error('加载失败');
        }
      })
      .then(function() {
        renderToolOrderList();
        showToolOrderModal();
      })
      .catch(function() {
        currentToolOrder = window.TOOLS_DEFAULT ? window.TOOLS_DEFAULT.slice() : [];
        renderToolOrderList();
        showToolOrderModal();
      });
  }

  function showToolOrderModal() {
    toolOrderModal.style.display = 'flex';
    toolOrderModal.style.opacity = '0';
    setTimeout(function() {
      toolOrderModal.style.opacity = '1';
      toolOrderModal.classList.add('open');
    }, 10);
    document.body.style.paddingRight = getScrollbarWidth() + 'px';
    document.body.classList.add('modal-open');
    clearToolOrderMsg();
  }

  function closeToolOrderModal() {
    toolOrderModal.style.opacity = '0';
    toolOrderModal.classList.remove('open');
    setTimeout(function() {
      toolOrderModal.style.display = 'none';
      document.body.style.paddingRight = '';
      document.body.classList.remove('modal-open');
    }, 300);
  }

  function setToolOrderMsg(text, type) {
    toolOrderMsg.textContent = text;
    toolOrderMsg.className = 'tool-order__msg tool-order__msg--' + (type || 'error');
    toolOrderMsg.hidden = false;
  }

  function clearToolOrderMsg() {
    toolOrderMsg.hidden = true;
    toolOrderMsg.textContent = '';
  }

  function renderToolOrderList() {
    toolOrderList.innerHTML = '';
    for (var i = 0; i < currentToolOrder.length; i++) {
      var tool = currentToolOrder[i];
      var item = document.createElement('div');
      item.className = 'tool-order-item';
      item.draggable = true;
      item.dataset.index = i;
      item.innerHTML =
        '<span class="tool-order-item__handle">☰</span>' +
        '<span class="tool-order-item__icon">' + tool.icon + '</span>' +
        '<div class="tool-order-item__text">' +
        '<div class="tool-order-item__name">' + tool.name + '</div>' +
        '<div class="tool-order-item__desc">' + tool.desc + '</div>' +
        '</div>';

      // 拖拽事件
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragend', handleDragEnd);
      item.addEventListener('dragover', handleDragOver);
      item.addEventListener('drop', handleDrop);
      item.addEventListener('dragenter', function() {
        if (draggedItem && this !== draggedItem) {
          this.classList.add('drag-over');
        }
      });
      item.addEventListener('dragleave', function() {
        this.classList.remove('drag-over');
      });

      toolOrderList.appendChild(item);
    }

    // 监听鼠标移动更新幽灵元素位置
    document.addEventListener('dragover', function(e) {
      if (ghostElement) {
        ghostElement.style.left = e.clientX - ghostElement.offsetWidth / 2 + 'px';
        ghostElement.style.top = e.clientY - 20 + 'px';
      }
    });

    // 拖动时允许鼠标滚轮滚动列表
    if (toolOrderList) {
      // 监听滚轮事件，拖动时手动滚动
      toolOrderList.addEventListener('wheel', function(e) {
        if (draggedItem) {
          // 阻止默认行为，手动滚动
          e.preventDefault();
          e.stopPropagation();
          // 手动滚动列表
          this.scrollTop += e.deltaY;
        }
      }, { passive: false });
    }
  }

  var ghostElement = null;
  var lastTarget = null; // 记录上次的目标元素，避免重复触发
  var lastTargetTime = 0; // 记录上次触发时间，用于防抖

  function handleDragStart(e) {
    draggedItem = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);

    // 重置上次目标
    lastTarget = null;
    lastTargetTime = 0;

    // 震动反馈
    if (navigator.vibrate) navigator.vibrate(10);

    // 创建跟随鼠标的幽灵元素
    ghostElement = this.cloneNode(true);
    ghostElement.classList.remove('dragging');
    ghostElement.classList.add('drag-ghost');
    ghostElement.style.position = 'fixed';
    ghostElement.style.pointerEvents = 'none';
    ghostElement.style.zIndex = '9999';
    ghostElement.style.width = this.offsetWidth + 'px';
    ghostElement.style.left = e.clientX - this.offsetWidth / 2 + 'px';
    ghostElement.style.top = e.clientY - 20 + 'px';
    document.body.appendChild(ghostElement);

    // 设置透明的拖拽图像（隐藏默认幽灵）
    var emptyImg = document.createElement('img');
    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(emptyImg, 0, 0);
  }

  function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedItem = null;
    lastTarget = null; // 清理上次目标
    lastTargetTime = 0; // 清理时间戳

    // 震动反馈
    if (navigator.vibrate) navigator.vibrate(15);

    // 移除幽灵元素
    if (ghostElement && ghostElement.parentNode) {
      ghostElement.parentNode.removeChild(ghostElement);
      ghostElement = null;
    }

    // 清理所有卡片的 transform（避免残留）
    var items = toolOrderList.querySelectorAll('.tool-order-item');
    for (var i = 0; i < items.length; i++) {
      items[i].style.transform = '';
      items[i].style.transition = '';
    }
  }

  function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedItem && this !== draggedItem) {
      // 计算鼠标在目标元素中的相对位置
      var rect = this.getBoundingClientRect();
      var mouseY = e.clientY;
      var elementTop = rect.top;
      var elementHeight = rect.height;
      var relativeY = mouseY - elementTop;
      var ratio = relativeY / elementHeight;

      // 三区域判断：上40%、中20%、下40%
      var insertBefore = false;
      var insertAfter = false;

      if (ratio < 0.4) {
        // 鼠标在上部 → 插入到目标前面
        insertBefore = true;
      } else if (ratio > 0.6) {
        // 鼠标在下部 → 插入到目标后面
        insertAfter = true;
      } else {
        // 鼠标在中部 → 不移动
        return false;
      }

      var items = toolOrderList.querySelectorAll('.tool-order-item');
      var draggedIndex = Array.prototype.indexOf.call(items, draggedItem);
      var targetIndex = Array.prototype.indexOf.call(items, this);

      // 根据区域判断是否需要移动
      var needMove = false;
      if (insertBefore && draggedIndex !== targetIndex - 1) {
        // 要插入到目标前面，且当前不是已经在目标前面
        needMove = true;
      } else if (insertAfter && draggedIndex !== targetIndex + 1) {
        // 要插入到目标后面，且当前不是已经在目标后面
        needMove = true;
      }

      if (!needMove) {
        return false;
      }

      // 清除所有 drag-over 类
      for (var i = 0; i < items.length; i++) {
        items[i].classList.remove('drag-over');
      }

      // 添加避让动画：记录所有卡片当前位置
      var positions = [];
      for (var i = 0; i < items.length; i++) {
        if (items[i] !== draggedItem) {
          positions.push({
            element: items[i],
            top: items[i].offsetTop
          });
        }
      }

      // 执行 DOM 重排
      if (insertBefore) {
        this.parentNode.insertBefore(draggedItem, this);
      } else if (insertAfter) {
        this.parentNode.insertBefore(draggedItem, this.nextSibling);
      }

      // 计算新位置并应用平滑过渡
      for (var i = 0; i < positions.length; i++) {
        var item = positions[i].element;
        var oldTop = positions[i].top;
        var newTop = item.offsetTop;
        var delta = oldTop - newTop;

        if (delta !== 0) {
          // 瞬间移回旧位置
          item.style.transform = 'translateY(' + delta + 'px)';
          item.style.transition = 'none';

          // 强制重排
          item.offsetHeight;

          // 平滑过渡到新位置
          item.style.transition = 'transform 0.25s cubic-bezier(0.23, 1, 0.32, 1)';
          item.style.transform = 'translateY(0)';
        }
      }
    }

    return false;
  }

  function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    return false;
  }

  function saveToolOrder() {
    if (!password) {
      setToolOrderMsg('未登录');
      return;
    }

    // 读取当前列表顺序
    var items = toolOrderList.querySelectorAll('.tool-order-item');
    var newOrder = [];
    for (var i = 0; i < items.length; i++) {
      var idx = parseInt(items[i].dataset.index);
      newOrder.push(currentToolOrder[idx]);
    }
    currentToolOrder = newOrder;

    // 保存到服务器
    var orderKeys = [];
    for (var i = 0; i < currentToolOrder.length; i++) {
      orderKeys.push(getToolKey(currentToolOrder[i]));
    }

    toolOrderSave.disabled = true;
    toolOrderSave.textContent = '保存中...';
    clearToolOrderMsg();

    fetch('/downloads/api/tool-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': password
      },
      body: JSON.stringify({ order: orderKeys })
    })
      .then(function(resp) {
        if (resp.status === 401) throw { msg: '密码错误' };
        if (!resp.ok) throw { msg: '保存失败' };
        return resp.json();
      })
      .then(function() {
        setToolOrderMsg('保存成功！刷新页面生效', 'success');
        setTimeout(function() {
          closeToolOrderModal();
          if (typeof showToast === 'function') {
            showToast('工具顺序已保存');
          }
        }, 1500);
      })
      .catch(function(err) {
        setToolOrderMsg(err && err.msg ? err.msg : '网络连接失败');
      })
      .finally(function() {
        toolOrderSave.disabled = false;
        toolOrderSave.textContent = '保存';
      });
  }

  function resetToolOrder() {
    if (!password) {
      setToolOrderMsg('未登录');
      return;
    }

    if (!confirm('确定要恢复默认顺序吗？')) return;

    toolOrderReset.disabled = true;
    toolOrderReset.textContent = '恢复中...';
    clearToolOrderMsg();

    fetch('/downloads/api/tool-order', {
      method: 'DELETE',
      headers: { 'X-Admin-Password': password }
    })
      .then(function(resp) {
        if (resp.status === 401) throw { msg: '密码错误' };
        if (!resp.ok) throw { msg: '恢复失败' };
        return resp.json();
      })
      .then(function() {
        setToolOrderMsg('已恢复默认顺序！刷新页面生效', 'success');
        currentToolOrder = window.TOOLS_DEFAULT ? window.TOOLS_DEFAULT.slice() : [];
        renderToolOrderList();
        setTimeout(function() {
          closeToolOrderModal();
          if (typeof showToast === 'function') {
            showToast('已恢复默认顺序');
          }
        }, 1500);
      })
      .catch(function(err) {
        setToolOrderMsg(err && err.msg ? err.msg : '网络连接失败');
      })
      .finally(function() {
        toolOrderReset.disabled = false;
        toolOrderReset.textContent = '恢复默认顺序';
      });
  }

  // 工具顺序管理事件绑定
  if (cardToolOrder) {
    cardToolOrder.addEventListener('click', openToolOrderModal);
  }
  if (toolOrderClose) {
    toolOrderClose.addEventListener('click', closeToolOrderModal);
  }
  if (toolOrderCancel) {
    toolOrderCancel.addEventListener('click', closeToolOrderModal);
  }
  if (toolOrderSave) {
    toolOrderSave.addEventListener('click', saveToolOrder);
  }
  if (toolOrderReset) {
    toolOrderReset.addEventListener('click', resetToolOrder);
  }
})();

// 夏夜工具集 - 节日彩蛋：公历节日当天首页自动飘落对应 emoji（纯前端，无依赖）
(function () {
  'use strict';

  // 公历节日表（区间型用 from/to，单日型用 month/day）；圣诞节给一个前奏区间让彩蛋多挂几天
  var FESTIVALS = [
    { id: 'newyear',   emoji: '🎉', label: '元旦',   month: 1,  day: 1 },
    { id: 'birthday',  emoji: '🎂', label: '生日',   month: 1,  day: 21 },
    { id: 'valentine', emoji: '💗', label: '情人节', month: 2,  day: 14 },
    { id: 'womensday', emoji: '🌷', label: '妇女节', month: 3,  day: 8 },
    { id: 'laborday',  emoji: '🎊', label: '劳动节', month: 5,  day: 1 },
    { id: 'childday',  emoji: '🍭', label: '儿童节', month: 6,  day: 1 },
    { id: 'national',  emoji: '🎆', label: '国庆节', month: 10, day: 1 },
    { id: 'christmas', emoji: '❄️', label: '圣诞节', from: { month: 12, day: 20 }, to: { month: 12, day: 28 } }
  ];

  var FEST_MAX_FALLS = 24;      // 画面内最多同时飘落的数量（用户：数量多一点，上限提到 24）

  var festivalLayer = null;
  var fallTimer = null;
  var currentFestival = null;
  var currentEmoji = '';

  // ---- 纯函数：给定日期返回命中的节日（无则 null），便于注入日期测试 ----
  function getFestival(date) {
    if (!date || isNaN(date.getTime())) return null;
    var m = date.getMonth() + 1;
    var d = date.getDate();
    for (var i = 0; i < FESTIVALS.length; i++) {
      var f = FESTIVALS[i];
      if (f.from) {
        var cur = m * 100 + d;
        var lo = f.from.month * 100 + f.from.day;
        var hi = f.to.month * 100 + f.to.day;
        if (cur >= lo && cur <= hi) return { id: f.id, emoji: f.emoji, label: f.label };
      } else if (f.month === m && f.day === d) {
        return { id: f.id, emoji: f.emoji, label: f.label };
      }
    }
    return null;
  }

  // ---- 清理 body 上的旧 festival-* class（保留 night 等其他 class） ----
  function removeFestivalClass() {
    if (!document.body) return;
    document.body.className = document.body.className
      .replace(/(^|\s)festival-[^\s]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function createLayer() {
    var layer = document.createElement('div');
    layer.className = 'festival-layer';
    layer.setAttribute('aria-hidden', 'true');   // 装饰层，不读屏
    document.body.appendChild(layer);
    return layer;
  }

  function removeNode(el) {
    if (el.parentNode) el.parentNode.removeChild(el);
  }

  function vw(pixels) {
    var W = window.innerWidth || document.documentElement.clientWidth || 375;
    return pixels / W * 100;
  }

  // 撒一个飘落元素：WAAPI 下落 + 正弦横移 + 旋转，播完移除；无 WAAPI 降级为 CSS 动画
  function spawnFall() {
    if (!festivalLayer) return;
    if (festivalLayer.querySelectorAll('.festival-fall').length >= FEST_MAX_FALLS) return;

    var el = document.createElement('div');
    el.className = 'festival-fall';
    el.textContent = currentEmoji;

    var leftVw = Math.random() * 100;
    var dur = 6 + Math.random() * 6;            // 6-12s 落完
    var swayAmp = 10 + Math.random() * 20;      // 正弦横移幅度 px（用户：幅度太大，减半为 10-30）
    var rot = 90 + Math.random() * 180;         // 总旋转角度（用户：旋转太多，减半为 90-270）
    var rotStart = Math.random() * 360;         // 初始随机朝向（每个飘落元素起始角度不同，更自然）
    el.style.fontSize = (14 + Math.random() * 14) + 'px';
    festivalLayer.appendChild(el);

    if (typeof el.animate === 'function') {
      // 40 段关键帧：正弦横移(幅度渐弱) + 重力加速下落 + 旋转缓动，轨迹柔和自然
      var kf = [], steps = 40;
      for (var s = 0; s <= steps; s++) {
        var p = s / steps;
        kf.push({
          left: (leftVw + Math.sin(p * Math.PI * 5) * vw(swayAmp) * (1 - 0.5 * p)) + 'vw',
          transform: 'translateY(' + (-10 + p * p * 115) + 'vh) rotate(' + (rotStart + p * p * rot) + 'deg)',
          opacity: p === 0 ? 0 : (p === 1 ? 0.9 : 1),
          offset: p
        });
      }
      var anim = el.animate(kf, { duration: dur * 1000, easing: 'linear', fill: 'forwards' });
      anim.onfinish = function () { removeNode(el); };
    } else {
      // 老浏览器兜底：CSS @keyframes 一次下落，到时移除
      el.style.left = leftVw + 'vw';
      el.style.animation = 'festivalFallCss ' + dur + 's linear forwards';
      setTimeout(function () { removeNode(el); }, dur * 1000);
    }
  }

  function startFall() {
    if (festivalLayer) removeNode(festivalLayer);
    festivalLayer = createLayer();
    // 进入页面即撒一批（16-20 个），一次落完自然停止，不再持续补新
    var batch = 16 + Math.floor(Math.random() * 5);
    for (var i = 0; i < batch; i++) spawnFall();
  }

  function stopFall() {
    if (fallTimer) { clearInterval(fallTimer); fallTimer = null; }
    if (festivalLayer) {
      removeNode(festivalLayer);
      festivalLayer = null;
    }
  }

  // ---- 应用节日：命中→挂 class + 飘落；未命中→清旧 + 停止 ----
  function applyFestival(date) {
    var f = getFestival(date);
    removeFestivalClass();
    stopFall();
    if (!f) {
      currentFestival = null;
      return null;
    }
    currentFestival = f;
    currentEmoji = f.emoji;
    if (document.body) {
      document.body.className = (document.body.className + ' festival-' + f.id).replace(/\s+/g, ' ').trim();
    }
    startFall();
    return f;
  }

  // ---- 浏览器专属：暂停/恢复 + 首页节日检测 + 探针（node/Jest 环境自动跳过） ----
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // 切后台暂停飘落动画（省电），回前台继续
    document.addEventListener('visibilitychange', function () {
      if (!festivalLayer) return;
      var falls = festivalLayer.querySelectorAll('.festival-fall');
      if (document.hidden) {
        falls.forEach(function (el) {
          if (el.getAnimations) el.getAnimations().forEach(function (a) { a.pause(); });
        });
      } else {
        falls.forEach(function (el) {
          if (el.getAnimations) el.getAnimations().forEach(function (a) { a.play(); });
        });
      }
    });

    // 首页加载即检测今天是否节日
    if (document.body) {
      var today = new Date();
      var current = getFestival(today);
      if (current) applyFestival(today);
    }

    // 测试探针
    window.getFestival = getFestival;
    window.__festival = {
      getFestival: getFestival,
      apply: applyFestival
    };
  }

  // 导出供 Jest 单元测试
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FESTIVALS: FESTIVALS, getFestival: getFestival };
  }
})();

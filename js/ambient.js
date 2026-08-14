// 夏夜工具集 - 氛围小助手：每日一言 + 深夜好眠提醒（纯前端，无依赖）
(function () {
  'use strict';

  // ---- 时段问候：按一天的时刻换文案（随刷新变化） ----
  var GREETINGS = [
    { min: 5, max: 8, text: '清晨好，新的一天从一杯温水开始 🌅' },
    { min: 8, max: 11, text: '早上好，今天也要元气满满鸭～ ☀️' },
    { min: 11, max: 13, text: '中午好，记得按时吃饭哦 🍚' },
    { min: 13, max: 18, text: '下午好，忙里也要偷个闲 ✨' },
    { min: 18, max: 22, text: '晚上好，夜色温柔宜放松 🌆' },
    { min: 22, max: 24, text: '夜深了，早点休息呀 🌙' },
    { min: 0, max: 5, text: '凌晨了，别熬夜啦，做个好梦 🌙' }
  ];

  function greetingFor(d) {
    var h = d.getHours();
    for (var i = 0; i < GREETINGS.length; i++) {
      var g = GREETINGS[i];
      if (h >= g.min && h < g.max) return g.text;
    }
    return '';
  }

  function setGreeting(d) {
    var el = document.getElementById('heroGreeting');
    if (!el) return;
    el.textContent = greetingFor(d || new Date());
  }

  // ---- 深夜好眠：22:00-06:00 首次访问弹一次 toast，当天不重复 ----
  var GOODNIGHT_KEY = 'goodnight_date';

  function dateKey(d) {
    return '' + d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function isLateNight(h) { return h >= 22 || h < 6; }

  function showToast(text) {
    var c = document.querySelector('.toast-container');
    if (!c) {
      c = document.createElement('div');
      c.className = 'toast-container';
      document.body.appendChild(c);
    }
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = text;
    c.appendChild(toast);
    setTimeout(function () {
      toast.classList.add('removing');
      toast.addEventListener('animationend', function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      });
    }, 4000);
  }

  // 注入日期便于测试：返回 'shown' / 'skipped-today' / 'not-late' / 'bad-date'
  function tryGoodnight(d) {
    if (!d || isNaN(d.getTime())) return 'bad-date';
    var h = d.getHours();
    if (!isLateNight(h)) return 'not-late';
    var k = dateKey(d);
    try {
      if (localStorage.getItem(GOODNIGHT_KEY) === k) return 'skipped-today';
      localStorage.setItem(GOODNIGHT_KEY, k);
    } catch (e) {}
    showToast('🌙 夏夜好眠，做个好梦～');
    return 'shown';
  }

  // ---- 滚动视差：hero 内容随滚动缓慢上移（远景感）+ 淡出 ----
  var HERO_RATE = 0.4;                       // 慢于滚动的速率（0-1，越小越"远"）
  var heroEl = document.getElementById('heroParallax');
  var ticking = false;
  function onScroll() {
    if (ticking) return;                     // rAF 节流，避免滚动高频触发
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      if (heroEl) {
        heroEl.style.transform = 'translateY(' + (y * HERO_RATE) + 'px)';
        heroEl.style.opacity = '' + Math.max(0, 1 - y / 600);   // 滚 600px 完全淡出
      }
      ticking = false;
    });
  }
  if (heroEl) {
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  setGreeting(new Date());

  // 深夜首次访问才提醒：等页面稳定后弹出（1.2s），真实时间判定
  if (document.body) {
    var today = new Date();
    setTimeout(function () { tryGoodnight(today); }, 1200);
  }

  // 测试探针
  window.__ambient = {
    greetingFor: greetingFor,
    setGreeting: setGreeting,
    tryGoodnight: tryGoodnight
  };
})();

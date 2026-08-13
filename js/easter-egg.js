// 夏夜工具集 - 彩蛋：连点 Logo 5 次，飘落樱花花瓣（纯前端，无依赖）
(function () {
  'use strict';

  var TRIGGER_CLICKS = 5;      // 连点次数
  var RESET_MS = 1500;         // 超过此间隔视为断连，计数重置
  var PETAL_COUNT = 55;        // 每波花瓣数量
  var COOLDOWN_MS = 6000;      // 触发冷却，防止连点轰炸
  var layer = null;

  // 监听整个 brand 区域（logo + 文字），手指点偏也能触发
  var logo = document.querySelector('.navbar__brand') || document.querySelector('.navbar__logo');
  if (!logo) return;           // 页面缺结构时静默退出

  var clickCount = 0;
  var lastClick = 0;
  var lastTrigger = 0;

  function petalColor() {
    var colors = ['#FFB7C5', '#FFC0CB', '#FFD1DC', '#FF9EB5', '#FFE1E8', '#F8C8DC'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  function spawnPetal() {
    var p = document.createElement('div');
    p.className = 'petal';
    var w = 8 + Math.random() * 10;          // 宽 8~18px
    var h = w * (1.15 + Math.random() * 0.4); // 高略大于宽，椭圆花瓣
    p.style.width = w.toFixed(1) + 'px';
    p.style.height = h.toFixed(1) + 'px';
    p.style.left = (Math.random() * 100).toFixed(2) + 'vw';
    p.style.background = petalColor();
    p.style.animationDelay = (Math.random() * 4).toFixed(2) + 's';
    p.style.animationDuration = (5 + Math.random() * 5).toFixed(2) + 's';
    layer.appendChild(p);
    // 动画结束后移除该花瓣，避免 DOM 无限堆积
    p.addEventListener('animationend', function () {
      if (p.parentNode) p.parentNode.removeChild(p);
    });
  }

  // 触发后浮现一句淡淡的提示，增加仪式感
  function showToast() {
    var old = document.getElementById('petalToast');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var t = document.createElement('div');
    t.id = 'petalToast';
    t.className = 'petal-toast';
    t.textContent = '🌸 樱花落，好运来～';
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 600);
    }, 2200);
  }

  function trigger() {
    if (!layer || !layer.parentNode) {
      layer = document.createElement('div');
      layer.className = 'petal-layer';
      document.body.appendChild(layer);
    }
    while (layer.firstChild) layer.removeChild(layer.firstChild);  // 清掉上一波残留
    for (var i = 0; i < PETAL_COUNT; i++) spawnPetal();
    showToast();
    lastTrigger = Date.now();
  }

  logo.addEventListener('click', function () {
    var now = Date.now();
    if (now - lastClick > RESET_MS) clickCount = 0;
    lastClick = now;
    clickCount++;
    if (clickCount >= TRIGGER_CLICKS) {
      clickCount = 0;
      if (now - lastTrigger >= COOLDOWN_MS) trigger();
    }
  });
})();

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
    layer.appendChild(p);

    // 旋转：总旋转量 360~720 度随机，方向正负随机（正=顺时针，负=逆时针）
    // 左右摇摆：一个完整正弦周期，幅度 1~3vw 适中；相位随机 → 初始横向速度方向随机
    // 用 WAAPI 生成 21 个采样点（每 5%），引擎在关键帧间自动 lerp，轨迹平滑无转折
    var turn = (360 + Math.random() * 360) * (Math.random() < 0.5 ? -1 : 1);
    var amp = 1 + Math.random() * 2;
    var ph = Math.random() * 2 * Math.PI;
    var dur = 5000 + Math.random() * 5000;   // 5~10s，随机下落速度
    var delay = Math.random() * 4000;        // 0~4s 随机起步，错落自然

    var keyframes = [];
    for (var k = 0; k <= 20; k++) {
      var t = k / 20;
      var y = -6 + 112 * t;                                   // 匀速下落
      var sx = Math.sin(ph + 2 * Math.PI * t) * amp;          // 正弦左右摆动
      var r = -45 + turn * t;                                 // 匀速旋转
      var op = k === 0 ? 0 : (0.95 - 0.1 * t);                // 快速淡入后缓降
      keyframes.push({
        transform: 'translateY(' + y.toFixed(1) + 'vh) translateX(' + sx.toFixed(2) + 'vw) rotate(' + r.toFixed(1) + 'deg)',
        opacity: op.toFixed(3)
      });
    }

    var anim = p.animate(keyframes, { duration: dur, delay: delay, easing: 'linear', fill: 'forwards' });
    // 动画结束后移除该花瓣，避免 DOM 无限堆积
    anim.onfinish = function () {
      if (p.parentNode) p.parentNode.removeChild(p);
    };
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

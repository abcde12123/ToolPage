// 夏夜工具集 - 鼠标互动：星光拖尾 + 点击涟漪（纯前端，无依赖）
(function () {
  'use strict';

  var cvs = document.createElement('canvas');
  cvs.className = 'mouse-fx';
  document.body.appendChild(cvs);
  var ctx = cvs.getContext('2d');
  var DPR = Math.min(window.devicePixelRatio || 1, 2);   // 高分屏锐化，上限2x防过度
  var W = 0, H = 0;

  var parts = [];           // 星光/星屑粒子
  var rings = [];           // 点击涟漪圆环
  var MAX_PARTS = 140;      // 粒子池上限，超出淘汰最老的
  var rafId = null;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    cvs.width = W * DPR;
    cvs.height = H * DPR;
    cvs.style.width = W + 'px';
    cvs.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // 金色系(42/46/50) + 樱粉系(340/350/355)，与 logo ✧ 和樱花主题呼应
  var HUES = [42, 46, 50, 340, 350, 355];

  function starColor() {
    var h = HUES[Math.floor(Math.random() * HUES.length)];
    return 'hsla(' + h + ', 85%, 72%, 1)';
  }

  function kick() {
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  // 主循环：粒子移动渐隐 + 涟漪扩散；粒子清空后自动停帧省电
  function loop() {
    rafId = null;
    ctx.clearRect(0, 0, W, H);

    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.x += p.vx; p.y += p.vy;
      p.vx *= p.drag; p.vy *= p.drag;
      p.life -= p.decay;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      var a = Math.max(0, Math.min(1, p.life));
      var r = p.size * (0.4 + 0.6 * p.life);
      ctx.fillStyle = p.color;
      // 外层辉光 + 内层实心点，比 shadowBlur 便宜且更柔和
      ctx.globalAlpha = a * p.alpha * 0.35;
      ctx.beginPath(); ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = a * p.alpha;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    }

    for (var j = rings.length - 1; j >= 0; j--) {
      var rg = rings[j];
      rg.r += rg.v;
      rg.life -= rg.decay;
      if (rg.life <= 0) { rings.splice(j, 1); continue; }
      ctx.globalAlpha = Math.max(0, rg.life) * 0.5;
      ctx.strokeStyle = rg.color;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (parts.length || rings.length) kick();
  }

  // 在 (x,y) 生成 n 颗散开的星屑
  function spawnTail(x, y, n) {
    for (var i = 0; i < n; i++) {
      if (parts.length >= MAX_PARTS) parts.shift();
      var ang = Math.random() * Math.PI * 2;
      var spd = 0.3 + Math.random() * 0.8;
      parts.push({
        x: x, y: y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        drag: 0.94,
        life: 1,
        decay: 0.022 + Math.random() * 0.024,   // 消散略慢：寿命约 22~45 帧（≈0.4~0.75s）
        size: 1 + Math.random() * 2.2,
        alpha: 0.5 + Math.random() * 0.4,
        color: starColor()
      });
    }
    kick();
  }

  // 鼠标移动 → 拖尾星光（移动快→粒子略多，但最多 3 颗/事件）
  var lastX = 0, lastY = 0, moved = false;
  window.addEventListener('mousemove', function (e) {
    var x = e.clientX, y = e.clientY;
    var n = 1;
    if (moved) {
      var dx = x - lastX, dy = y - lastY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) n = Math.min(3, Math.floor(dist / 6) + 1);
    } else {
      moved = true;
    }
    lastX = x; lastY = y;
    spawnTail(x, y, n);
  });

  // 触摸移动 → 同样生成星光（passive 不禁滚，页面照常滚动）
  var lastTouchT = 0;
  window.addEventListener('touchmove', function (e) {
    var now = Date.now();
    if (now - lastTouchT < 50) return;   // 节流，避免满屏
    lastTouchT = now;
    var t = e.touches[0];
    if (!t) return;
    spawnTail(t.clientX, t.clientY, 1);
  }, { passive: true });

  // 点击/触摸 → 荡起涟漪 + 迸溅 8 颗星屑
  window.addEventListener('pointerdown', function (e) {
    var x = e.clientX, y = e.clientY;
    rings.push({
      x: x, y: y, r: 4, v: 2.4,
      life: 1, decay: 0.042,
      color: 'hsla(340, 80%, 74%, 1)'
    });
    if (rings.length > 8) rings.shift();
    spawnTail(x, y, 8);
  });

  // 切后台时清空粒子（省电；下一帧粒子为空会自动停帧）
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { parts.length = 0; rings.length = 0; }
  });
})();

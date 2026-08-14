// 夏夜工具集 - 背景星尘：全屏星点闪烁 + 慢漂移（纯前端，无依赖）
(function () {
  'use strict';

  var cvs = document.createElement('canvas');
  cvs.className = 'starfield';
  document.body.appendChild(cvs);
  var ctx = cvs.getContext('2d');
  var DPR = Math.min(window.devicePixelRatio || 1, 2);   // 高分屏锐化，上限2x防过度
  var W = 0, H = 0;

  var stars = [];
  var rafId = null;
  var lastT = 0;

  function rand(min, max) { return Math.random() * (max - min) + min; }

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

  // 滚动位置（星星视差用）：scroll 事件更新，loop 直接读，避免每帧触发 layout
  var scrollY = 0;
  window.addEventListener('scroll', function () {
    scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
  }, { passive: true });

  // 每颗星一组「白天/夜间」固定色（夜间更亮更明显），避免每帧随机换色闪烁
  function makeColors() {
    if (Math.random() < 0.6) {
      return { day: 'hsla(45, 30%, 78%, ', night: 'hsla(210, 20%, 92%, ' };   // 淡金 ↔ 亮白偏蓝
    }
    return { day: 'hsla(270, 30%, 82%, ', night: 'hsla(230, 35%, 85%, ' };    // 淡紫 ↔ 淡蓝
  }

  // 60-90 颗星点：坐标归一化（resize 不重撒），慢速漂移回绕，正弦呼吸闪烁
  var count = 60 + Math.floor(Math.random() * 31);
  for (var i = 0; i < count; i++) {
    stars.push({
      ux: Math.random(),
      uy: Math.random(),
      r: rand(0.5, 1.5),
      base: rand(0.3, 0.8),      // 基础不透明度
      tw: rand(0.4, 1.6),        // 闪烁速度 rad/s
      ph: rand(0, Math.PI * 2),
      vx: rand(-2, 2),           // px/s 慢漂移（渲染时换算成归一化增量）
      vy: rand(-1.5, 1.5),
      depth: Math.random(),      // 视差深度 0-1：滚动时近层移得快
      colors: makeColors()
    });
  }

  // ---- 萤火虫（仅夜间：屏幕下方 6-9 只，黄绿荧光三层光晕，替代夜间隐藏的光球） ----
  var fireflies = [];
  var FF_COUNT = 6 + Math.floor(Math.random() * 4);   // 6-9
  for (var f = 0; f < FF_COUNT; f++) {
    fireflies.push({
      ux: Math.random(),
      uy: 0.45 + Math.random() * 0.47,  // 屏幕下半部散开（0.45-0.92）
      r: 1 + Math.random() * 1.2,
      base: 0.5 + Math.random() * 0.35,
      tw: 1.1 + Math.random() * 1.3,    // 呼吸周期约 3-5.7s（一明一暗更明显）
      ph: Math.random() * Math.PI * 2,
      vx: rand(-16, 16),                // px/s 当前速度
      vy: rand(-8, 8),
      tvx: rand(-18, 18),               // 目标速度（每几秒随机换向，平滑趋近）
      tvy: rand(-9, 9),
      nextTurn: 1 + Math.random() * 3,  // 首次转向倒计时
      glow: 0.8 + Math.random() * 0.35, // 发光强度
      hue: 70 + Math.random() * 15      // 黄绿荧光 70-85
    });
  }

  // ---- 流星（仅夜间：偶尔划过，18-35s 一颗，第一颗 3-8s 先出现） ----
  var meteors = [];
  var nextMeteorIn = 3 + Math.random() * 5;

  function drawFireflies(t, dt, night) {
    if (!night) return;
    for (var i = 0; i < fireflies.length; i++) {
      var fl = fireflies[i];
      // 随机游走：每 2-6s 换一个目标方向，速度平滑趋近（弧线转向，不再一条直线死板飞）
      fl.nextTurn -= dt;
      if (fl.nextTurn <= 0) {
        fl.tvx = rand(-18, 18);
        fl.tvy = rand(-9, 9);
        fl.nextTurn = 2 + Math.random() * 4;
      }
      fl.vx += (fl.tvx - fl.vx) * Math.min(1, dt * 1.6);
      fl.vy += (fl.tvy - fl.vy) * Math.min(1, dt * 1.6);
      // 按时间慢漂移（曾直接累加未乘 dt，60fps 下每秒横穿整个屏幕 → 乱跳，已修）
      fl.ux += fl.vx / W * dt;
      fl.uy += fl.vy / H * dt;
      if (fl.ux < 0.02 || fl.ux > 0.98) fl.vx *= -1;   // 撞界柔和反弹
      if (fl.uy < 0.42 || fl.uy > 0.95) fl.vy *= -1;
      var a = fl.base * (0.55 + 0.45 * Math.sin((t / 1000) * fl.tw + fl.ph));
      var x = fl.ux * W;
      var y = fl.uy * H + scrollY * 0.02;   // 萤火虫慢速视差（比星星更慢，像远处的柔光）
      // 三层光：外晕 → 柔光 → 亮核，模拟萤火虫腹部发光（比 shadowBlur 便宜）
      ctx.fillStyle = 'hsla(' + fl.hue + ', 90%, 62%, ' + (a * 0.26 * fl.glow) + ')';
      ctx.beginPath(); ctx.arc(x, y, fl.r * 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'hsla(' + fl.hue + ', 95%, 70%, ' + (a * 0.5 * fl.glow) + ')';
      ctx.beginPath(); ctx.arc(x, y, fl.r * 1.9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'hsla(' + fl.hue + ', 100%, 78%, ' + (a * fl.glow) + ')';
      ctx.beginPath(); ctx.arc(x, y, fl.r * 0.9, 0, Math.PI * 2); ctx.fill();
    }
  }

  function spawnMeteor() {
    var ang = Math.PI / 12 + Math.random() * (Math.PI / 6);  // 平缓斜下 15-45°，更接近横向
    meteors.push({
      x: Math.random() * W,
      y: -20,                        // 从屏幕顶上方进入
      dx: Math.cos(ang) * rand(550, 900),   // px/s
      dy: Math.sin(ang) * rand(550, 900),
      len: rand(90, 170),            // 尾迹长度 px
      life: 1.2,
      decay: 0.85                    // 每秒淡出速率
    });
  }

  function updateMeteors(dt, night) {
    if (!night) { meteors.length = 0; return; }
    nextMeteorIn -= dt;
    if (nextMeteorIn <= 0) {
      spawnMeteor();
      nextMeteorIn = 12 + Math.random() * 10;   // 12-22s 一颗（用户：频率稍微高一点）
    }
    for (var i = meteors.length - 1; i >= 0; i--) {
      var m = meteors[i];
      m.x += m.dx * dt;
      m.y += m.dy * dt;
      m.life -= m.decay * dt;
      if (m.life <= 0 || m.y > H + 40 || m.x < -60 || m.x > W + 60) { meteors.splice(i, 1); continue; }
      // 头亮尾淡的渐变尾迹
      var spd = Math.sqrt(m.dx * m.dx + m.dy * m.dy);
      var tx = m.x - (m.dx / spd) * m.len;
      var ty = m.y - (m.dy / spd) * m.len;
      var grad = ctx.createLinearGradient(m.x, m.y, tx, ty);
      grad.addColorStop(0, 'rgba(255,255,255,' + Math.max(0, m.life) * 0.9 + ')');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(m.x, m.y); ctx.stroke();
      // 头部亮点
      ctx.fillStyle = 'rgba(255,255,255,' + Math.max(0, m.life) * 0.95 + ')';
      ctx.beginPath(); ctx.arc(m.x, m.y, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  }

  function loop(t) {
    rafId = null;
    // 主题实时读取：切换 body.night 后下一帧即换色，无需监听事件
    var night = !!(document.body && document.body.classList.contains('night'));
    var dt = (t - lastT) / 1000;
    lastT = t;

    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      st.ux += st.vx / W * dt;
      st.uy += st.vy / H * dt;
      if (st.ux > 1) st.ux -= 1; else if (st.ux < 0) st.ux += 1;
      if (st.uy > 1) st.uy -= 1; else if (st.uy < 0) st.uy += 1;

      // alpha = base * (0.5 + 0.5*sin)，明暗呼吸；主题只改颜色不改形态
      var a = st.base * (0.5 + 0.5 * Math.sin((t / 1000) * st.tw + st.ph));
      ctx.fillStyle = (night ? st.colors.night : st.colors.day) + a + ')';
      // 滚动视差：星星随滚动慢移，深度大(近层)移得多，模 H 回绕（用户：0.05-0.2 太快，降至 0.03-0.1）
      var sy = st.uy * H + scrollY * (0.03 + st.depth * 0.07);
      sy = ((sy % H) + H) % H;
      ctx.beginPath();
      ctx.arc(st.ux * W, sy, st.r, 0, Math.PI * 2);
      ctx.fill();
    }

    drawFireflies(t, dt, night);
    updateMeteors(dt, night);

    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (!rafId) {
      lastT = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  }
  function stop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  // 切后台暂停（省电），回前台恢复
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else start();
  });

  start();

  // 测试探针
  window.__starfield = {
    getCount: function () { return stars.length; },
    getFireflies: function () { return fireflies.length; },
    getMeteors: function () { return meteors.length; },
    isRunning: function () { return !!rafId; },
    diag: function () { return { nextMeteorIn: nextMeteorIn, meteors: meteors.length, fireflies: fireflies.length, stars: stars.length, scrollY: scrollY, sampleDepth: stars.length ? +stars[0].depth.toFixed(2) : null, ffV: fireflies.map(function (f) { return { vx: +f.vx.toFixed(1), vy: +f.vy.toFixed(1), tvx: +f.tvx.toFixed(1), turn: +f.nextTurn.toFixed(1) }; }) }; }
  };
})();

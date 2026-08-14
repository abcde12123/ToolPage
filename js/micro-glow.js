/* 微光交互 v1 —— 工具卡片光标微光跟随
   把光标在卡片内的百分比喂给 CSS 变量 --gx/--gy，驱动 .glass-card::after 的 radial-gradient
   rAF 节流：一帧最多一次 getBoundingClientRect，避免 mousemove 高频布局 */
(function () {
    'use strict';
    var grid = document.getElementById('toolsGrid');
    if (!grid) return;

    var raf = 0;
    grid.addEventListener('mousemove', function (e) {
        var card = e.target.closest('.glass-card');
        if (!card) return;
        var cx = e.clientX, cy = e.clientY;
        if (raf) return;
        raf = requestAnimationFrame(function () {
            raf = 0;
            var r = card.getBoundingClientRect();
            if (!r.width) return;
            card.style.setProperty('--gx', ((cx - r.left) / r.width * 100).toFixed(1) + '%');
            card.style.setProperty('--gy', ((cy - r.top) / r.height * 100).toFixed(1) + '%');
        });
    });
})();

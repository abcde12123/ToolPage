/* 四季流转 v1 —— 按月份自动切换季节氛围：春樱 / 夏叶 / 秋叶 / 冬雪，柔和缓慢飘落
   只在白天飘，夜晚交给 starfield（流星/萤火虫），避免双层氛围叠在一起糊掉。
   探针：window.__season = { season, force(name), particles, canvas, diag() }
   测试注入：__season.force('winter') 任意切换季节 */
(function () {
    'use strict';

    function seasonOf(month) {  // month: 1-12
        if (month >= 3 && month <= 5) return 'spring';
        if (month >= 6 && month <= 8) return 'summer';
        if (month >= 9 && month <= 11) return 'autumn';
        return 'winter';
    }

    var CONFIG = {
        spring: { label: '春', count: 14, type: 'petal', color: '#FFB8D4', size: [10, 16], speedY: [18, 34], sway: [12, 22], swayFreq: [0.4, 0.9], rotSpeed: [0.4, 1.2], alpha: 0.85 },
        summer: { label: '夏', count: 10, type: 'leaf', color: '#9BD19B', size: [11, 17], speedY: [14, 26], sway: [8, 16], swayFreq: [0.3, 0.7], rotSpeed: [0.3, 0.9], alpha: 0.75 },
        autumn: { label: '秋', count: 12, type: 'leaf', color: '#F0B261', size: [11, 18], speedY: [20, 36], sway: [14, 26], swayFreq: [0.4, 0.9], rotSpeed: [0.5, 1.4], alpha: 0.85 },
        winter: { label: '冬', count: 18, type: 'snow', color: '#FFFFFF', size: [3, 6], speedY: [10, 20], sway: [6, 12], swayFreq: [0.3, 0.7], rotSpeed: 0, alpha: 0.8 }
    };

    var body = document.body;
    if (!body) return;
    var season = seasonOf(new Date().getMonth() + 1);
    body.classList.add('season-' + season);

    var canvas = document.createElement('canvas');
    canvas.id = 'seasonCanvas';
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.zIndex = '0';
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var particles = [];
    var W = 0, H = 0, DPR = 1;

    function resize() {
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = Math.round(W * DPR);
        canvas.height = Math.round(H * DPR);
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function rnd(a, b) { return a + Math.random() * (b - a); }

    function makeParticle(cfg) {
        return {
            x: Math.random() * W,
            y: Math.random() * H,
            size: rnd(cfg.size[0], cfg.size[1]),
            speedY: rnd(cfg.speedY[0], cfg.speedY[1]),
            sway: rnd(cfg.sway[0], cfg.sway[1]),
            swayFreq: rnd(cfg.swayFreq[0], cfg.swayFreq[1]),
            phase: Math.random() * Math.PI * 2,
            rot: Math.random() * Math.PI * 2,
            rotSpeed: rnd(cfg.rotSpeed[0], cfg.rotSpeed[1]),
            type: cfg.type,
            color: cfg.color,
            alpha: cfg.alpha
        };
    }

    function spawn() {
        particles = [];
        var cfg = CONFIG[season];
        if (!cfg) return;
        for (var i = 0; i < cfg.count; i++) {
            particles.push(makeParticle(cfg));
        }
    }

    function drawPetal(p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawLeaf(p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // 叶脉
        ctx.globalAlpha = p.alpha * 0.55;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-p.size * 0.8, 0);
        ctx.lineTo(p.size * 0.8, 0);
        ctx.stroke();
        ctx.restore();
    }

    function drawSnow(p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    var last = 0;

    function frame(ts) {
        requestAnimationFrame(frame);
        if (!last) { last = ts; return; }
        var dt = Math.min((ts - last) / 1000, 0.1);  // 防切后台回来 dt 爆炸
        last = ts;

        ctx.clearRect(0, 0, W, H);
        var isNight = body.classList.contains('night');
        if (isNight || document.hidden) return;  // 夜晚/后台清空，白天才画

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            p.y += p.speedY * dt;
            p.x += Math.sin(ts / 1000 * p.swayFreq + p.phase) * p.sway * dt;
            p.rot += p.rotSpeed * dt;
            if (p.y > H + 30) {
                p.y = -30;
                p.x = Math.random() * W;
            }
            if (p.type === 'petal') drawPetal(p);
            else if (p.type === 'leaf') drawLeaf(p);
            else drawSnow(p);
        }
    }

    window.addEventListener('resize', function () { resize(); spawn(); });
    resize();
    spawn();
    requestAnimationFrame(frame);

    window.__season = {
        season: season,
        force: function (name) {
            if (!CONFIG[name]) return season;
            season = name;
            body.classList.remove('season-spring', 'season-summer', 'season-autumn', 'season-winter');
            body.classList.add('season-' + name);
            spawn();
            return season;
        },
        particles: particles,
        canvas: canvas,
        diag: function () {
            return { season: season, count: particles.length, night: body.classList.contains('night'), hidden: document.hidden, w: W, h: H };
        }
    };
})();

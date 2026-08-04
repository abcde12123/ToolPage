// 夏夜工具集 - Cron 表达式解析 (ES5)

window.initCronParser = function(container) {

    var cronstrueReady = false;

    // --- 构建 UI ---
    container.innerHTML =
        '<div class="cr-container">' +
            '<div class="cr-input-row">' +
                '<input class="cr-input" id="crInput" type="text" placeholder="输入 cron 表达式，如 * * * * *" spellcheck="false" />' +
                '<button class="cr-preset" data-cron="* * * * *">每分钟</button>' +
            '</div>' +
            '<div class="cr-presets">' +
                '<button class="cr-preset" data-cron="* * * * *">* * * * *</button>' +
                '<button class="cr-preset" data-cron="0 * * * *">0 * * * *</button>' +
                '<button class="cr-preset" data-cron="0 0 * * *">0 0 * * *</button>' +
                '<button class="cr-preset" data-cron="0 0 * * 0">0 0 * * 0</button>' +
                '<button class="cr-preset" data-cron="30 9 * * 1-5">30 9 * * 1-5</button>' +
            '</div>' +
            '<div class="cr-description" id="crDescription">' +
                '<div class="cr-description-label">📖 人类可读描述</div>' +
                '<span style="color:#A8A29E;">输入 cron 表达式查看解释</span>' +
            '</div>' +
            '<div class="cr-schedule">' +
                '<div class="cr-schedule-label">⏰ 接下来 5 次执行时间</div>' +
                '<div id="crSchedule"></div>' +
            '</div>' +
            '<div class="cr-error" id="crError" style="display:none;"></div>' +
        '</div>';

    var inputEl = document.getElementById('crInput');
    var descriptionEl = document.getElementById('crDescription');
    var scheduleEl = document.getElementById('crSchedule');
    var errorEl = document.getElementById('crError');

    // --- 动态加载 cronstrue ---
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/cronstrue/dist/cronstrue.min.js';
    script.onload = function() {
        cronstrueReady = true;
        // 如果有初始 cron 值就解析
        if (inputEl.value.trim()) {
            updateCron();
        }
    };
    script.onerror = function() {
        descriptionEl.innerHTML = '<div class="cr-cdn-error">⚠️ cronstrue 库加载失败，请检查网络连接后刷新页面重试</div>';
    };
    document.head.appendChild(script);

    // If cronstrue is already available (preloaded, cached, or test mock), use it immediately
    if (typeof cronstrue !== 'undefined') {
        cronstrueReady = true;
        if (inputEl.value.trim()) {
            updateCron();
        }
    }

    // --- Cron 字段匹配工具 (5 字段: 分 时 日 月 周) ---
    function matchesField(value, fieldVal) {
        // fieldVal: 0-59(min), 0-23(hour), 1-31(day), 1-12(month), 0-6(dow)
        // Supports *, single value, range (a-b), step (*/n), list (a,b,c)
        var parts = fieldVal.split(',');
        for (var i = 0; i < parts.length; i++) {
            if (matchesPart(value, parts[i])) {
                return true;
            }
        }
        return false;
    }

    function matchesPart(value, part) {
        part = part.trim();
        if (part === '*') return true;
        // Step: */n or a-b/n
        var stepIdx = part.indexOf('/');
        var step = 1;
        var base = '*';
        if (stepIdx !== -1) {
            step = parseInt(part.substring(stepIdx + 1), 10);
            base = part.substring(0, stepIdx);
        }
        if (base === '*') {
            return (value % step) === 0;
        }
        // Range: a-b or a-b/n
        var rangeIdx = base.indexOf('-');
        var min, max;
        if (rangeIdx !== -1) {
            min = parseInt(base.substring(0, rangeIdx), 10);
            max = parseInt(base.substring(rangeIdx + 1), 10);
        } else {
            min = parseInt(base, 10);
            max = min;
        }
        if (isNaN(min) || isNaN(max)) return false;
        if (stepIdx !== -1) {
            return value >= min && value <= max && ((value - min) % step) === 0;
        }
        return value >= min && value <= max;
    }

    function isValidCron(parts) {
        if (parts.length !== 5) return false;
        // 简单的有效性检查：数字、*、范围、步长、列表
        var limits = [
            { min: 0, max: 59 },   // minute
            { min: 0, max: 23 },   // hour
            { min: 1, max: 31 },   // day of month
            { min: 1, max: 12 },   // month
            { min: 0, max: 6 }     // day of week
        ];
        for (var i = 0; i < 5; i++) {
            var p = parts[i].trim();
            if (p === '' || p === undefined) return false;
            if (p === '*') continue;
            // Allow all common cron patterns
            var tokens = p.split(',');
            for (var j = 0; j < tokens.length; j++) {
                var token = tokens[j].trim();
                // Remove step part
                var stepIdx2 = token.indexOf('/');
                var base2 = stepIdx2 !== -1 ? token.substring(0, stepIdx2) : token;
                if (base2 === '*') {
                    // Check step value: reject step=0 (would cause division by zero)
                    var stepVal = stepIdx2 !== -1 ? parseInt(token.substring(stepIdx2 + 1), 10) : 1;
                    if (stepVal === 0) return false;
                    continue;
                }
                var rangeIdx2 = base2.indexOf('-');
                var minStr = rangeIdx2 !== -1 ? base2.substring(0, rangeIdx2) : base2;
                var maxStr = rangeIdx2 !== -1 ? base2.substring(rangeIdx2 + 1) : base2;
                var numMin = parseInt(minStr, 10);
                var numMax = parseInt(maxStr, 10);
                if (isNaN(numMin)) return false;
                if (rangeIdx2 !== -1 && isNaN(numMax)) return false;
                if (rangeIdx2 !== -1 && numMin > numMax) return false;
                if (numMin < limits[i].min || numMin > limits[i].max) return false;
                if (rangeIdx2 !== -1 && (numMax < limits[i].min || numMax > limits[i].max)) return false;
            }
        }
        return true;
    }

    function getNextExecutions(cronExpr, count) {
        count = count || 5;
        var parts = cronExpr.trim().split(/\s+/);
        if (!isValidCron(parts)) return [];
        var results = [];
        var now = new Date();
        // Start from next minute
        now.setSeconds(0, 0);
        now.setMinutes(now.getMinutes() + 1);

        var maxIterations = 525600; // 1 year worth of minutes
        var iterations = 0;
        while (results.length < count && iterations < maxIterations) {
            iterations++;
            var minute = now.getMinutes();
            var hour = now.getHours();
            var day = now.getDate();
            var month = now.getMonth() + 1; // 1-based
            var dow = now.getDay(); // 0 = Sunday

            if (matchesField(minute, parts[0]) &&
                matchesField(hour, parts[1]) &&
                matchesField(day, parts[2]) &&
                matchesField(month, parts[3]) &&
                matchesField(dow, parts[4])) {
                results.push(new Date(now.getTime()));
            }
            now.setMinutes(now.getMinutes() + 1);
        }
        return results;
    }

    function formatDateTime(dt) {
        var y = dt.getFullYear();
        var mo = pad(dt.getMonth() + 1);
        var d = pad(dt.getDate());
        var h = pad(dt.getHours());
        var mi = pad(dt.getMinutes());
        var weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        var wd = weekdays[dt.getDay()];
        return y + '-' + mo + '-' + d + ' ' + h + ':' + mi + ' 周' + wd;
    }

    function pad(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    // --- 更新解析结果 ---
    function updateCron() {
        var expr = inputEl.value.trim();
        errorEl.style.display = 'none';

        if (!expr) {
            descriptionEl.innerHTML = '<div class="cr-description-label">📖 人类可读描述</div><span style="color:#A8A29E;">输入 cron 表达式查看解释</span>';
            scheduleEl.innerHTML = '';
            return;
        }

        var parts = expr.split(/\s+/);
        if (!isValidCron(parts)) {
            errorEl.textContent = '❌ 无效的 cron 表达式（需要5个字段: 分 时 日 月 周）';
            errorEl.style.display = 'block';
            descriptionEl.innerHTML = '<div class="cr-description-label">📖 人类可读描述</div><span style="color:#DC2626;">表达式无效</span>';
            scheduleEl.innerHTML = '';
            return;
        }

        // Human readable via cronstrue
        if (cronstrueReady && typeof cronstrue !== 'undefined' && cronstrue.toString) {
            try {
                var desc = cronstrue.toString(expr);
                descriptionEl.innerHTML = '<div class="cr-description-label">📖 人类可读描述</div>' + desc;
            } catch (e) {
                descriptionEl.innerHTML = '<div class="cr-description-label">📖 人类可读描述</div><span style="color:#DC2626;">解析失败</span>';
            }
        } else {
            descriptionEl.innerHTML = '<div class="cr-description-label">📖 人类可读描述</div><span style="color:#A8A29E;">' + expr + '</span>';
        }

        // Next 5 executions
        var times = getNextExecutions(expr, 5);
        var html = '';
        if (times.length === 0) {
            html = '<div class="cr-schedule-item">未找到未来执行时间</div>';
        } else {
            for (var i = 0; i < times.length; i++) {
                html += '<div class="cr-schedule-item">' + (i + 1) + '. ' + formatDateTime(times[i]) + '</div>';
            }
        }
        scheduleEl.innerHTML = html;
    }

    // --- 事件绑定（300ms 防抖，避免每次按键都同步执行大循环）---
    var cronDebounce = null;
    inputEl.addEventListener('input', function() {
        if (cronDebounce) clearTimeout(cronDebounce);
        cronDebounce = setTimeout(updateCron, 300);
    });

    var presets = container.querySelectorAll('.cr-preset');
    for (var i = 0; i < presets.length; i++) {
        presets[i].addEventListener('click', function() {
            inputEl.value = this.getAttribute('data-cron');
            updateCron();
        });
    }
};

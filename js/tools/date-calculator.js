// 夏夜工具集 - 日期计算器 (ES5)
// 三个模式：日期差 / 日期加减推算（含跨月边界钳制）/ 倒计时；每项都带星期 + 农历（复用 lunar.js solar2lunar）

window.initDateCalculator = function(container) {

    var currentMode = 1;

    var WEEK_CN = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

    container.innerHTML =
        '<div class="dc-container">' +
            '<div class="dc-toggle">' +
                '<button class="dc-toggle-btn active" id="dcMode1">&#x1F4C5; 日期差</button>' +
                '<button class="dc-toggle-btn" id="dcMode2">&#x2795; 日期推算</button>' +
                '<button class="dc-toggle-btn" id="dcMode3">&#x23F3; 倒计时</button>' +
            '</div>' +
            '<div id="dcContent"></div>' +
        '</div>';

    var toggle1 = document.getElementById('dcMode1');
    var toggle2 = document.getElementById('dcMode2');
    var toggle3 = document.getElementById('dcMode3');
    var content = document.getElementById('dcContent');

    // --- 公用 helper ---
    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    // 本地时区安全解析 yyyy-mm-dd（ISO 无时间字符串会被解析为 UTC，东八区会偏一天）
    function parseDate(str) {
        if (!str) return null;
        var p = str.split('-');
        if (p.length !== 3) return null;
        var y = parseInt(p[0], 10), m = parseInt(p[1], 10), d = parseInt(p[2], 10);
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d);
    }

    function toInputValue(date) {
        return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
    }

    // UTC 归一化到当天 0 点，避免夏令时导致差一天
    function toUtcMidnight(date) {
        return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    }
    function diffDays(a, b) {
        return Math.round((toUtcMidnight(b) - toUtcMidnight(a)) / 86400000);
    }

    function addDays(date, n) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
    }
    // 加 N 月：跨月边界钳制到月末（1月31日+1月 → 2月28/29日）
    function addMonths(date, n) {
        var y = date.getFullYear(), m = date.getMonth() + n, d = date.getDate();
        var newY = y + Math.floor(m / 12);
        var newM = ((m % 12) + 12) % 12;
        var lastDay = new Date(newY, newM + 1, 0).getDate();
        return new Date(newY, newM, Math.min(d, lastDay));
    }
    // 加 N 年：闰年 2/29 钳制到 2/28
    function addYears(date, n) {
        var y = date.getFullYear() + n, m = date.getMonth(), d = date.getDate();
        var lastDay = new Date(y, m + 1, 0).getDate();
        return new Date(y, m, Math.min(d, lastDay));
    }

    // 某日期农历文本：农历X月X日 · 丙午年属马（节气当天带节气名）
    function lunarText(date) {
        if (!date) return '';
        var L = window.__lunar;
        if (!L || typeof L.solar2lunar !== 'function') return '';
        var r = L.solar2lunar(date.getFullYear(), date.getMonth() + 1, date.getDate());
        if (!r) return '';
        var t = '农历' + r.monthCn + r.dayCn;
        if (r.isTerm) t += '（今日' + r.term + '）';
        return t + ' · ' + r.gzYear + '年属' + r.animal;
    }

    // 某日期完整行：yyyy-mm-dd 星期 · 农历
    function infoLine(date) {
        if (!date) return '';
        return toInputValue(date) + ' ' + WEEK_CN[date.getDay()] + ' · ' + lunarText(date);
    }

    // --- Mode 1: 日期差 ---
    function renderMode1() {
        var today = new Date();
        content.innerHTML =
            '<div class="dc-field-row">' +
                '<label>开始日期</label>' +
                '<input class="dc-input" type="date" id="dc1Start" />' +
                '<button class="dc-btn" id="dc1StartToday">今天</button>' +
                '<label>结束日期</label>' +
                '<input class="dc-input" type="date" id="dc1End" />' +
                '<button class="dc-btn" id="dc1EndToday">今天</button>' +
            '</div>' +
            '<div class="dc-result">' +
                '<div class="dc-big" id="dc1Diff">请选择开始和结束日期</div>' +
                '<div class="dc-lunar" id="dc1StartInfo"></div>' +
                '<div class="dc-lunar" id="dc1EndInfo"></div>' +
            '</div>' +
            '<div class="dc-copy-row"><button class="dc-btn dc-copy-btn" id="dc1Copy">&#x1F4C4; 复制结果</button></div>';

        var startInput = document.getElementById('dc1Start');
        var endInput = document.getElementById('dc1End');

        function update() {
            var s = parseDate(startInput.value);
            var e = parseDate(endInput.value);
            document.getElementById('dc1StartInfo').textContent = s ? infoLine(s) : '';
            document.getElementById('dc1EndInfo').textContent = e ? infoLine(e) : '';
            var diffEl = document.getElementById('dc1Diff');
            if (!s || !e) { diffEl.textContent = '请选择开始和结束日期'; return; }
            var days = diffDays(s, e);
            var abs = Math.abs(days);
            if (abs === 0) { diffEl.textContent = '同一天'; return; }
            var extra = '';
            if (abs >= 30) { extra = '（约 ' + Math.round(abs / 30) + ' 个月）'; }
            else if (abs >= 7) { extra = '（' + Math.floor(abs / 7) + ' 周 ' + (abs % 7) + ' 天）'; }
            diffEl.textContent = '相差 ' + abs + ' 天' + extra + (days < 0 ? '（结束日期在前）' : '');
        }

        startInput.addEventListener('input', update);
        endInput.addEventListener('input', update);
        document.getElementById('dc1StartToday').addEventListener('click', function() {
            startInput.value = toInputValue(new Date());
            update();
        });
        document.getElementById('dc1EndToday').addEventListener('click', function() {
            endInput.value = toInputValue(new Date());
            update();
        });
        document.getElementById('dc1Copy').addEventListener('click', function() {
            var s = parseDate(startInput.value);
            var e = parseDate(endInput.value);
            if (!s || !e) { showToast('请先选择日期'); return; }
            var days = diffDays(s, e);
            copyToClipboard('开始：' + infoLine(s) + '\n结束：' + infoLine(e) + '\n相差：' + Math.abs(days) + ' 天');
            showToast('已复制');
        });

        startInput.value = toInputValue(today);
        update();
    }

    // --- Mode 2: 日期推算 ---
    function renderMode2() {
        content.innerHTML =
            '<div class="dc-field-row">' +
                '<label>起始日期</label>' +
                '<input class="dc-input" type="date" id="dc2Start" />' +
                '<input class="dc-input dc-input-num" type="number" id="dc2Num" value="1" min="-99999" max="99999" title="负数表示往前推算" />' +
                '<select class="dc-input" id="dc2Unit">' +
                    '<option value="d" selected>天</option>' +
                    '<option value="m">月</option>' +
                    '<option value="y">年</option>' +
                '</select>' +
            '</div>' +
            '<div class="dc-hint">数值可填负数往前推算；加月自动处理边界，如 2026-01-31 + 1月 = 2026-02-28</div>' +
            '<div class="dc-result">' +
                '<div class="dc-big" id="dc2Result">-</div>' +
                '<div class="dc-lunar" id="dc2Info"></div>' +
            '</div>' +
            '<div class="dc-copy-row"><button class="dc-btn dc-copy-btn" id="dc2Copy">&#x1F4C4; 复制结果</button></div>';

        var startInput = document.getElementById('dc2Start');
        var numInput = document.getElementById('dc2Num');
        var unitSel = document.getElementById('dc2Unit');

        function calc() {
            var base = parseDate(startInput.value);
            var n = parseInt(numInput.value, 10);
            if (!base) return null;
            if (isNaN(n)) return null;
            var unit = unitSel.value;
            if (unit === 'd') return addDays(base, n);
            if (unit === 'm') return addMonths(base, n);
            return addYears(base, n);
        }

        function update() {
            var base = parseDate(startInput.value);
            var resEl = document.getElementById('dc2Result');
            var infoEl = document.getElementById('dc2Info');
            if (!base) { resEl.textContent = '请选择起始日期'; infoEl.textContent = ''; return; }
            if (isNaN(parseInt(numInput.value, 10))) { resEl.textContent = '请输入加减数值'; infoEl.textContent = ''; return; }
            var result = calc();
            resEl.textContent = toInputValue(result) + ' ' + WEEK_CN[result.getDay()];
            infoEl.textContent = lunarText(result);
        }

        startInput.addEventListener('input', update);
        numInput.addEventListener('input', update);
        unitSel.addEventListener('change', update);
        document.getElementById('dc2Copy').addEventListener('click', function() {
            var base = parseDate(startInput.value);
            var n = parseInt(numInput.value, 10);
            var unit = unitSel.value;
            if (!base || isNaN(n)) { showToast('请先填好日期和数值'); return; }
            var unitCn = unit === 'd' ? '天' : unit === 'm' ? '月' : '年';
            copyToClipboard(infoLine(base) + '\n' + (n >= 0 ? '往后 ' : '往前 ') + Math.abs(n) + ' ' + unitCn + ' →\n' + infoLine(calc()));
            showToast('已复制');
        });

        startInput.value = toInputValue(new Date());
        update();
    }

    // --- Mode 3: 倒计时 ---
    function renderMode3() {
        content.innerHTML =
            '<div class="dc-field-row">' +
                '<label>目标日期</label>' +
                '<input class="dc-input" type="date" id="dc3Target" />' +
                '<button class="dc-btn" id="dc3Today">今天</button>' +
            '</div>' +
            '<div class="dc-result">' +
                '<div class="dc-big" id="dc3Diff">请选择目标日期</div>' +
                '<div class="dc-lunar" id="dc3TodayInfo"></div>' +
                '<div class="dc-lunar" id="dc3TargetInfo"></div>' +
            '</div>';

        var targetInput = document.getElementById('dc3Target');

        function update() {
            var now = new Date();
            var todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            var target = parseDate(targetInput.value);
            document.getElementById('dc3TodayInfo').textContent = '今天 ' + infoLine(todayMid);
            var diffEl = document.getElementById('dc3Diff');
            var targetInfo = document.getElementById('dc3TargetInfo');
            if (!target) { diffEl.textContent = '请选择目标日期'; targetInfo.textContent = ''; return; }
            targetInfo.textContent = '目标 ' + infoLine(target);
            var days = diffDays(todayMid, target);
            if (days === 0) diffEl.textContent = '就是今天！🎉';
            else if (days > 0) diffEl.textContent = '还有 ' + days + ' 天';
            else diffEl.textContent = '已过去 ' + (-days) + ' 天';
        }

        targetInput.addEventListener('input', update);
        document.getElementById('dc3Today').addEventListener('click', function() {
            targetInput.value = toInputValue(new Date());
            update();
        });

        targetInput.value = toInputValue(new Date());
        update();
    }

    // --- Mode 切换 ---
    function switchMode(mode) {
        currentMode = mode;
        toggle1.classList.toggle('active', mode === 1);
        toggle2.classList.toggle('active', mode === 2);
        toggle3.classList.toggle('active', mode === 3);
        if (mode === 1) renderMode1();
        else if (mode === 2) renderMode2();
        else renderMode3();
    }

    toggle1.addEventListener('click', function() { switchMode(1); });
    toggle2.addEventListener('click', function() { switchMode(2); });
    toggle3.addEventListener('click', function() { switchMode(3); });

    renderMode1();
};

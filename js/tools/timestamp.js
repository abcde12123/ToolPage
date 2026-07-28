// 夏夜工具集 - 时间戳转换工具 (ES5)

window.initTimestamp = function(container) {

    var currentMode = 1; // 1: 时间戳→日期, 2: 日期→时间戳
    var tsTimer = null;

    // --- 构建 UI ---
    container.innerHTML =
        '<div class="ts-container">' +
            '<div class="ts-toggle">' +
                '<button class="ts-toggle-btn active" id="tsMode1">&#x1F550; 时间戳 &#x2192; 日期</button>' +
                '<button class="ts-toggle-btn" id="tsMode2">&#x1F4C5; 日期 &#x2192; 时间戳</button>' +
            '</div>' +
            '<div id="tsContent"></div>' +
        '</div>';

    var toggle1 = document.getElementById('tsMode1');
    var toggle2 = document.getElementById('tsMode2');
    var content = document.getElementById('tsContent');

    // --- 渲染 Mode 1: 时间戳 → 日期 ---
    function renderMode1() {
        content.innerHTML =
            '<div class="ts-input-group">' +
                '<input class="ts-input" id="tsInput1" type="text" placeholder="输入时间戳（秒或毫秒）..." style="flex:1;" />' +
                '<button class="ts-btn" id="tsNow1">&#x1F550; 当前时间</button>' +
            '</div>' +
            '<div class="ts-result" id="tsResult1">' +
                '<div class="ts-field"><label>ISO 8601</label><span id="tsIso">-</span><button class="ts-copy-btn" data-copy="tsIso">复制</button></div>' +
                '<div class="ts-field"><label>本地格式</label><span id="tsLocal">-</span><button class="ts-copy-btn" data-copy="tsLocal">复制</button></div>' +
                '<div class="ts-field"><label>UTC 格式</label><span id="tsUtc">-</span><button class="ts-copy-btn" data-copy="tsUtc">复制</button></div>' +
                '<div class="ts-field"><label>相对时间</label><span id="tsRelative">-</span></div>' +
                '<div class="ts-field"><label>时间戳(秒)</label><span id="tsSec">-</span><button class="ts-copy-btn" data-copy="tsSec">复制</button></div>' +
                '<div class="ts-field"><label>时间戳(毫秒)</label><span id="tsMs">-</span><button class="ts-copy-btn" data-copy="tsMs">复制</button></div>' +
            '</div>';

        var input = document.getElementById('tsInput1');
        var nowBtn = document.getElementById('tsNow1');

        function updateFromTimestamp() {
            var raw = input.value.trim();
            if (!raw) {
                document.querySelectorAll('#tsResult1 .ts-field span:not([class])').forEach(function(el) {
                    if (el.id) el.textContent = '-';
                });
                return;
            }
            var ts = parseInt(raw, 10);
            if (isNaN(ts) || ts < 0) {
                document.querySelectorAll('#tsResult1 .ts-field span:not([class])').forEach(function(el) {
                    if (el.id) el.textContent = '无效时间戳';
                });
                return;
            }
            // 使用数字位数自动检测秒/毫秒
            var len = raw.length;
            var ambiguous = false;

            if (len === 10) {
                // 10位 = 秒（标准 Unix 时间戳）
                ts = ts * 1000;
            } else if (len === 12 || len === 13) {
                // 12位或13位 = 毫秒，无需转换
            } else if (len === 11) {
                // 11位 = 有歧义，作为秒或毫秒均可，按毫秒处理并显示两种解释
                ambiguous = true;
            } else if (len <= 9) {
                // 9位或更少 = 秒
                ts = ts * 1000;
            }
            // len > 13: 毫秒或更大，按毫秒处理

            var date = new Date(ts);
            if (isNaN(date.getTime())) {
                document.querySelectorAll('#tsResult1 .ts-field span:not([class])').forEach(function(el) {
                    if (el.id) el.textContent = '无效日期';
                });
                return;
            }

            document.getElementById('tsIso').textContent = date.toISOString();
            document.getElementById('tsLocal').textContent = date.toLocaleString();
            document.getElementById('tsUtc').textContent = date.toUTCString();
            document.getElementById('tsRelative').textContent = getRelativeTime(date);
            document.getElementById('tsSec').textContent = '' + Math.floor(date.getTime() / 1000);
            document.getElementById('tsMs').textContent = '' + date.getTime();

            // 11位有歧义时，同时显示作为秒的解释
            if (ambiguous) {
                var altDate = new Date(ts * 1000);
                if (!isNaN(altDate.getTime())) {
                    document.getElementById('tsRelative').textContent =
                        document.getElementById('tsRelative').textContent +
                        ' | 作为秒: ' + altDate.toLocaleString();
                }
            }
        }

        input.addEventListener('input', function() {
            if (tsTimer) clearTimeout(tsTimer);
            tsTimer = setTimeout(updateFromTimestamp, 200);
        });

        nowBtn.addEventListener('click', function() {
            input.value = '' + Date.now();
            updateFromTimestamp();
        });

        // 复制按钮
        content.querySelectorAll('.ts-copy-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var targetId = btn.getAttribute('data-copy');
                var target = document.getElementById(targetId);
                if (target) copyToClipboard(target.textContent);
            });
        });

        // 初始填入当前时间
        input.value = '' + Date.now();
        updateFromTimestamp();
    }

    // --- 渲染 Mode 2: 日期 → 时间戳 ---
    function renderMode2() {
        var now = new Date();
        var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
        var defaultDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T' + pad(now.getHours()) + ':' + pad(now.getMinutes());

        content.innerHTML =
            '<div class="ts-input-group">' +
                '<input class="ts-input" id="tsInput2" type="datetime-local" value="' + defaultDate + '" style="flex:1;" />' +
                '<button class="ts-btn" id="tsNow2">&#x1F550; 当前时间</button>' +
            '</div>' +
            '<div class="ts-result">' +
                '<div class="ts-field"><label>时间戳(秒)</label><span id="ts2Sec">-</span><button class="ts-copy-btn" data-copy="ts2Sec">复制</button></div>' +
                '<div class="ts-field"><label>时间戳(毫秒)</label><span id="ts2Ms">-</span><button class="ts-copy-btn" data-copy="ts2Ms">复制</button></div>' +
                '<div class="ts-field"><label>ISO 8601</label><span id="ts2Iso">-</span><button class="ts-copy-btn" data-copy="ts2Iso">复制</button></div>' +
            '</div>';

        var input = document.getElementById('tsInput2');
        var nowBtn = document.getElementById('tsNow2');

        function updateFromDate() {
            var val = input.value;
            if (!val) return;
            var date = new Date(val);
            if (isNaN(date.getTime())) {
                document.getElementById('ts2Sec').textContent = '无效日期';
                document.getElementById('ts2Ms').textContent = '无效日期';
                document.getElementById('ts2Iso').textContent = '无效日期';
                return;
            }
            document.getElementById('ts2Sec').textContent = '' + Math.floor(date.getTime() / 1000);
            document.getElementById('ts2Ms').textContent = '' + date.getTime();
            document.getElementById('ts2Iso').textContent = date.toISOString();
        }

        input.addEventListener('input', updateFromDate);
        nowBtn.addEventListener('click', function() {
            var n = new Date();
            var pad2 = function(x) { return x < 10 ? '0' + x : '' + x; };
            input.value = n.getFullYear() + '-' + pad2(n.getMonth() + 1) + '-' + pad2(n.getDate()) + 'T' + pad2(n.getHours()) + ':' + pad2(n.getMinutes());
            updateFromDate();
        });

        // 复制按钮
        content.querySelectorAll('.ts-copy-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var targetId = btn.getAttribute('data-copy');
                var target = document.getElementById(targetId);
                if (target) copyToClipboard(target.textContent);
            });
        });

        updateFromDate();
    }

    // --- Mode 切换 ---
    function switchMode(mode) {
        currentMode = mode;
        toggle1.classList.toggle('active', mode === 1);
        toggle2.classList.toggle('active', mode === 2);
        if (mode === 1) {
            renderMode1();
        } else {
            renderMode2();
        }
    }

    toggle1.addEventListener('click', function() { switchMode(1); });
    toggle2.addEventListener('click', function() { switchMode(2); });

    // --- 相对时间辅助 ---
    function getRelativeTime(date) {
        var now = new Date();
        var diff = date.getTime() - now.getTime();
        var absDiff = Math.abs(diff);
        var direction = diff >= 0 ? '后' : '前';

        var seconds = Math.floor(absDiff / 1000);
        if (seconds < 60) return seconds + ' 秒' + direction;
        var minutes = Math.floor(seconds / 60);
        if (minutes < 60) return minutes + ' 分钟' + direction;
        var hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + ' 小时' + direction;
        var days = Math.floor(hours / 24);
        if (days < 30) return days + ' 天' + direction;
        var months = Math.floor(days / 30);
        if (months < 12) return months + ' 个月' + direction;
        var years = Math.floor(months / 12);
        return years + ' 年' + direction;
    }

    // 默认显示 Mode 1
    renderMode1();
};

// 夏夜工具集 - 随机数生成器 (ES5)

window.initRandomGen = function(container) {

    // --- 构建 UI ---
    container.innerHTML =
        '<div class="rn-container">' +
            // UUID v4 区
            '<div class="rn-section">' +
                '<div class="rn-section-title">🆔 UUID v4</div>' +
                '<div class="rn-batch-row">' +
                    '<label for="rnBatchUUID">生成数量</label>' +
                    '<input type="number" class="rn-input" id="rnBatchUUID" value="5" min="1" max="50" />' +
                '</div>' +
                '<button class="rn-btn rn-btn-primary" id="rnGenUUID">🎲 生成 UUID</button>' +
                '<div class="rn-display" id="rnUUIDResults"></div>' +
            '</div>' +
            // 随机整数区
            '<div class="rn-section">' +
                '<div class="rn-section-title">🔢 随机整数</div>' +
                '<div class="rn-input-row">' +
                    '<label for="rnIntMin">最小值</label>' +
                    '<input type="number" class="rn-input" id="rnIntMin" value="1" />' +
                    '<label for="rnIntMax">最大值</label>' +
                    '<input type="number" class="rn-input" id="rnIntMax" value="100" />' +
                    '<label for="rnBatchInt">数量</label>' +
                    '<input type="number" class="rn-input" id="rnBatchInt" value="5" min="1" max="50" />' +
                '</div>' +
                '<button class="rn-btn rn-btn-primary" id="rnGenInt">🎲 生成整数</button>' +
                '<div class="rn-display" id="rnIntResults"></div>' +
            '</div>' +
            // 随机小数区
            '<div class="rn-section">' +
                '<div class="rn-section-title">🔣 随机小数</div>' +
                '<div class="rn-input-row">' +
                    '<label for="rnDecMin">最小值</label>' +
                    '<input type="number" class="rn-input" id="rnDecMin" value="0" step="any" />' +
                    '<label for="rnDecMax">最大值</label>' +
                    '<input type="number" class="rn-input" id="rnDecMax" value="1" step="any" />' +
                    '<label for="rnDecPlaces">小数位</label>' +
                    '<input type="number" class="rn-input" id="rnDecPlaces" value="4" min="1" max="10" style="width:60px;" />' +
                    '<label for="rnBatchDec">数量</label>' +
                    '<input type="number" class="rn-input" id="rnBatchDec" value="5" min="1" max="50" />' +
                '</div>' +
                '<button class="rn-btn rn-btn-primary" id="rnGenDec">🎲 生成小数</button>' +
                '<div class="rn-display" id="rnDecResults"></div>' +
            '</div>' +
        '</div>';

    // --- 获取 DOM ---
    var uuidResults = document.getElementById('rnUUIDResults');
    var intResults = document.getElementById('rnIntResults');
    var decResults = document.getElementById('rnDecResults');

    var batchUUID = document.getElementById('rnBatchUUID');
    var intMin = document.getElementById('rnIntMin');
    var intMax = document.getElementById('rnIntMax');
    var batchInt = document.getElementById('rnBatchInt');
    var decMin = document.getElementById('rnDecMin');
    var decMax = document.getElementById('rnDecMax');
    var decPlaces = document.getElementById('rnDecPlaces');
    var batchDec = document.getElementById('rnBatchDec');

    // --- 生成 UUID v4 ---
    function generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // fallback: manual uuid v4
        var hex = '0123456789abcdef';
        var uuid = '';
        for (var i = 0; i < 36; i++) {
            if (i === 8 || i === 13 || i === 18 || i === 23) {
                uuid += '-';
            } else if (i === 14) {
                uuid += '4';
            } else if (i === 19) {
                uuid += hex[(Math.random() * 4 | 0) + 8];
            } else {
                uuid += hex[Math.random() * 16 | 0];
            }
        }
        return uuid;
    }

    function renderResults(containerEl, results) {
        var html = '';
        for (var i = 0; i < results.length; i++) {
            html += '<div class="rn-result-item">' +
                '<span>' + results[i] + '</span>' +
                '<button class="rn-copy-btn rn-copy-' + i + '">📋 复制</button>' +
                '</div>';
        }
        containerEl.innerHTML = html;

        // 绑定每个复制按钮
        for (var j = 0; j < results.length; j++) {
            (function(idx, val) {
                var btn = containerEl.querySelector('.rn-copy-' + idx);
                if (btn) {
                    btn.addEventListener('click', function() {
                        copyToClipboard(String(val));
                        showToast('已复制: ' + val);
                    });
                }
            })(j, results[j]);
        }
    }

    // --- 生成 UUID ---
    function genUUIDs() {
        var count = parseInt(batchUUID.value, 10) || 5;
        if (count < 1) count = 1;
        if (count > 50) count = 50;
        batchUUID.value = count;
        var results = [];
        for (var i = 0; i < count; i++) {
            results.push(generateUUID());
        }
        renderResults(uuidResults, results);
    }

    // --- 生成随机整数 ---
    function genInts() {
        var min = parseInt(intMin.value, 10);
        var max = parseInt(intMax.value, 10);
        if (isNaN(min) || isNaN(max)) {
            showToast('请输入有效的最小值和最大值');
            return;
        }
        if (min > max) {
            showToast('最小值不能大于最大值');
            return;
        }
        var count = parseInt(batchInt.value, 10) || 5;
        if (count < 1) count = 1;
        if (count > 50) count = 50;
        batchInt.value = count;
        var results = [];
        for (var i = 0; i < count; i++) {
            var val = Math.floor(Math.random() * (max - min + 1)) + min;
            results.push(val);
        }
        renderResults(intResults, results);
    }

    // --- 生成随机小数 ---
    function genDecimals() {
        var min = parseFloat(decMin.value);
        var max = parseFloat(decMax.value);
        if (isNaN(min) || isNaN(max)) {
            showToast('请输入有效的最小值和最大值');
            return;
        }
        if (min > max) {
            showToast('最小值不能大于最大值');
            return;
        }
        var places = parseInt(decPlaces.value, 10) || 4;
        if (places < 1) places = 1;
        if (places > 10) places = 10;
        decPlaces.value = places;
        var count = parseInt(batchDec.value, 10) || 5;
        if (count < 1) count = 1;
        if (count > 50) count = 50;
        batchDec.value = count;
        var results = [];
        for (var i = 0; i < count; i++) {
            var val = Math.random() * (max - min) + min;
            results.push(parseFloat(val.toFixed(places)));
        }
        renderResults(decResults, results);
    }

    // --- 事件绑定 ---
    document.getElementById('rnGenUUID').addEventListener('click', genUUIDs);
    document.getElementById('rnGenInt').addEventListener('click', genInts);
    document.getElementById('rnGenDec').addEventListener('click', genDecimals);
};

// 夏夜工具集 - 密码生成器 (ES5)

window.initPassword = function(container) {

    var UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var LOWER = 'abcdefghijklmnopqrstuvwxyz';
    var DIGITS = '0123456789';
    var SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    // --- 构建 UI ---
    container.innerHTML =
        '<div class="pw-container">' +
            '<div class="pw-display-row">' +
                '<div class="pw-display" id="pwDisplay">点击生成</div>' +
                '<button class="pw-copy-btn" id="pwCopy">📋 复制</button>' +
            '</div>' +
            '<div class="pw-slider-row">' +
                '<label for="pwLength">长度</label>' +
                '<input type="range" class="pw-slider" id="pwLength" min="4" max="64" value="16" />' +
                '<span class="pw-slider-val" id="pwLengthVal">16</span>' +
            '</div>' +
            '<div class="pw-options">' +
                '<label class="pw-option"><input type="checkbox" id="pwUpper" checked /> 大写 (A-Z)</label>' +
                '<label class="pw-option"><input type="checkbox" id="pwLower" checked /> 小写 (a-z)</label>' +
                '<label class="pw-option"><input type="checkbox" id="pwDigits" checked /> 数字 (0-9)</label>' +
                '<label class="pw-option"><input type="checkbox" id="pwSymbols" /> 符号 (!@#$...)</label>' +
            '</div>' +
            '<div class="pw-strength" id="pwStrength"></div>' +
            '<button class="pw-btn" id="pwGenerate">🎲 生成密码</button>' +
        '</div>';

    var displayEl = document.getElementById('pwDisplay');
    var sliderEl = document.getElementById('pwLength');
    var sliderValEl = document.getElementById('pwLengthVal');
    var upperCb = document.getElementById('pwUpper');
    var lowerCb = document.getElementById('pwLower');
    var digitsCb = document.getElementById('pwDigits');
    var symbolsCb = document.getElementById('pwSymbols');
    var strengthEl = document.getElementById('pwStrength');
    var btnCopy = document.getElementById('pwCopy');
    var btnGenerate = document.getElementById('pwGenerate');

    // --- 核心逻辑 ---
    function getCharPool() {
        var pool = '';
        if (upperCb.checked) pool += UPPER;
        if (lowerCb.checked) pool += LOWER;
        if (digitsCb.checked) pool += DIGITS;
        if (symbolsCb.checked) pool += SYMBOLS;
        return pool;
    }

    function countCharTypes() {
        var count = 0;
        if (upperCb.checked) count++;
        if (lowerCb.checked) count++;
        if (digitsCb.checked) count++;
        if (symbolsCb.checked) count++;
        return count;
    }

    function getStrengthClass(len, types) {
        var level;
        if (len < 8) {
            level = 0; // weak
        } else if (len < 12) {
            level = 1; // medium
        } else if (len < 16) {
            level = 2; // strong
        } else {
            level = 3; // very strong
        }
        // 单一字符类型降一级
        if (types === 1 && level > 0) {
            level--;
        }
        return level;
    }

    function renderStrength() {
        var len = parseInt(sliderEl.value, 10) || 16;
        var types = countCharTypes();
        var level = getStrengthClass(len, types);
        var text = '';
        var cls = '';
        switch (level) {
            case 0: text = '强度: 弱 🔴'; cls = 'pw-weak'; break;
            case 1: text = '强度: 中 🟡'; cls = 'pw-medium'; break;
            case 2: text = '强度: 强 🟢'; cls = 'pw-strong'; break;
            case 3: text = '强度: 极强 🟣'; cls = 'pw-very-strong'; break;
        }
        strengthEl.textContent = text;
        strengthEl.className = 'pw-strength ' + cls;
    }

    function generatePassword() {
        var pool = getCharPool();
        if (pool.length === 0) {
            showToast('请至少选择一种字符类型');
            return;
        }
        var length = parseInt(sliderEl.value, 10) || 16;
        var result = '';
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            var array = new Uint32Array(length);
            crypto.getRandomValues(array);
            for (var i = 0; i < length; i++) {
                result += pool[array[i] % pool.length];
            }
        } else {
            // Fallback: Math.random (非加密安全，降级方案)
            for (var i = 0; i < length; i++) {
                result += pool[Math.floor(Math.random() * pool.length)];
            }
        }
        displayEl.textContent = result;
    }

    function copyPassword() {
        var text = displayEl.textContent;
        if (!text || text === '点击生成') {
            showToast('请先生成密码');
            return;
        }
        copyToClipboard(text);
        showToast('已复制到剪贴板');
    }

    // --- 事件绑定 ---
    btnGenerate.addEventListener('click', function() {
        generatePassword();
        renderStrength();
    });

    btnCopy.addEventListener('click', copyPassword);

    sliderEl.addEventListener('input', function() {
        sliderValEl.textContent = sliderEl.value;
        renderStrength();
    });

    upperCb.addEventListener('change', renderStrength);
    lowerCb.addEventListener('change', renderStrength);
    digitsCb.addEventListener('change', renderStrength);
    symbolsCb.addEventListener('change', renderStrength);

    // 初始强度
    renderStrength();
};

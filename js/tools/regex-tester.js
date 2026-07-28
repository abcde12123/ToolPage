// 夏夜工具集 - 正则测试器 (ES5)

window.initRegexTester = function(container) {

    var flagState = { g: true, i: false, m: false, s: false, u: false };

    // --- 构建 UI ---
    container.innerHTML =
        '<div class="rx-container">' +
            '<div class="rx-row">' +
                '<div class="rx-col" style="flex:2;">' +
                    '<label for="rxPattern">正则表达式</label>' +
                    '<input class="rx-input" id="rxPattern" type="text" placeholder="输入正则表达式，如 \\d+" spellcheck="false" />' +
                '</div>' +
                '<div class="rx-col">' +
                    '<label>选项</label>' +
                    '<div class="rx-flags" id="rxFlags">' +
                        '<span class="rx-flag active" data-flag="g">g</span>' +
                        '<span class="rx-flag" data-flag="i">i</span>' +
                        '<span class="rx-flag" data-flag="m">m</span>' +
                        '<span class="rx-flag" data-flag="s">s</span>' +
                        '<span class="rx-flag" data-flag="u">u</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div>' +
                '<label for="rxTestText">测试文本</label>' +
                '<textarea class="rx-textarea" id="rxTestText" placeholder="输入要匹配的文本..." spellcheck="false"></textarea>' +
            '</div>' +
            '<div class="rx-chips" id="rxChips">' +
                '<span class="rx-chip" data-pattern="^[\\w.-]+@[\\w.-]+\\.\\w+$">&#x2709; Email</span>' +
                '<span class="rx-chip" data-pattern="https?://[\\w./?-]+">&#x1F310; URL</span>' +
                '<span class="rx-chip" data-pattern="1[3-9]\\d{9}">&#x1F4F1; 手机号</span>' +
                '<span class="rx-chip" data-pattern="\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}">&#x1F310; IP</span>' +
                '<span class="rx-chip" data-pattern="^[\\u4e00-\\u9fa5]+$">&#x1F1E8; 中文</span>' +
            '</div>' +
            '<div id="rxModeGroup">' +
                '<div class="ts-toggle" style="display:inline-flex;">' +
                    '<button class="ts-toggle-btn active" id="rxModeMatch">&#x1F50D; 匹配</button>' +
                    '<button class="ts-toggle-btn" id="rxModeReplace">&#x1F504; 替换</button>' +
                '</div>' +
            '</div>' +
            '<div class="rx-sub-mode" id="rxReplaceRow" style="display:none;">' +
                '<label>替换为:</label>' +
                '<input class="rx-sub-input" id="rxReplaceInput" type="text" placeholder="$1, $&amp;, 等反向引用..." />' +
            '</div>' +
            '<div class="rx-result" id="rxResult">' +
                '<span style="color:#A8A29E;">&#x1F447; 输入正则和测试文本看看匹配结果</span>' +
            '</div>' +
            '<div class="rx-count" id="rxCount"></div>' +
        '</div>';

    var patternInput = document.getElementById('rxPattern');
    var testText = document.getElementById('rxTestText');
    var resultDiv = document.getElementById('rxResult');
    var countDiv = document.getElementById('rxCount');
    var replaceRow = document.getElementById('rxReplaceRow');
    var replaceInput = document.getElementById('rxReplaceInput');
    var modeMatch = document.getElementById('rxModeMatch');
    var modeReplace = document.getElementById('rxModeReplace');
    var isReplaceMode = false;

    // --- Flag 切换 ---
    var flagEls = document.querySelectorAll('.rx-flag');
    flagEls.forEach(function(el) {
        el.addEventListener('click', function() {
            var flag = el.getAttribute('data-flag');
            flagState[flag] = !flagState[flag];
            el.classList.toggle('active');
            updateTest();
        });
    });

    // --- 模式切换 ---
    modeMatch.addEventListener('click', function() {
        isReplaceMode = false;
        modeMatch.classList.add('active');
        modeReplace.classList.remove('active');
        replaceRow.style.display = 'none';
        updateTest();
    });

    modeReplace.addEventListener('click', function() {
        isReplaceMode = true;
        modeReplace.classList.add('active');
        modeMatch.classList.remove('active');
        replaceRow.style.display = 'flex';
        updateTest();
    });

    // --- 常用正则小标签 ---
    var chips = document.querySelectorAll('.rx-chip');
    chips.forEach(function(chip) {
        chip.addEventListener('click', function() {
            patternInput.value = chip.getAttribute('data-pattern');
            updateTest();
        });
    });

    // --- 核心逻辑 ---
    function buildFlags() {
        var flags = '';
        if (flagState.g) flags += 'g';
        if (flagState.i) flags += 'i';
        if (flagState.m) flags += 'm';
        if (flagState.s) flags += 's';
        if (flagState.u) flags += 'u';
        return flags;
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function updateTest() {
        var pattern = patternInput.value;
        var text = testText.value;
        var flags = buildFlags();

        if (!pattern) {
            resultDiv.innerHTML = '<span style="color:#A8A29E;">&#x1F447; 输入正则表达式</span>';
            resultDiv.classList.remove('rx-error');
            countDiv.textContent = '';
            return;
        }

        if (!text) {
            resultDiv.innerHTML = '<span style="color:#A8A29E;">&#x1F447; 输入测试文本</span>';
            resultDiv.classList.remove('rx-error');
            countDiv.textContent = '';
            return;
        }

        var regex;
        try {
            regex = new RegExp(pattern, flags);
        } catch (e) {
            resultDiv.innerHTML = '<span>&#x26A0;&#xFE0F; ' + escapeHtml(e.message) + '</span>';
            resultDiv.classList.add('rx-error');
            countDiv.textContent = '';
            return;
        }

        resultDiv.classList.remove('rx-error');

        if (isReplaceMode) {
            // 替换模式
            var replacement = replaceInput.value;
            var replaced;
            try {
                // 确保有 g 标志用于替换
                var replaceFlags = flags;
                if (replaceFlags.indexOf('g') === -1) replaceFlags += 'g';
                var replaceRegex = new RegExp(pattern, replaceFlags);
                replaced = text.replace(replaceRegex, replacement);
            } catch (e) {
                resultDiv.innerHTML = '<span>&#x26A0;&#xFE0F; 替换错误: ' + escapeHtml(e.message) + '</span>';
                resultDiv.classList.add('rx-error');
                countDiv.textContent = '';
                return;
            }
            var diffCount = countDifferences(text, replaced);
            resultDiv.innerHTML = escapeHtml(replaced);
            countDiv.textContent = '替换了 ' + diffCount + ' 处';
        } else {
            // 匹配模式
            var matches = [];
            var match;
            var hasGlobal = flags.indexOf('g') !== -1;

            // 如果没有 g 标志，使用 RegExp.exec 可能会无限循环，直接用 match
            if (hasGlobal) {
                regex.lastIndex = 0;
                while ((match = regex.exec(text)) !== null) {
                    matches.push({
                        index: match.index,
                        length: match[0].length,
                        value: match[0]
                    });
                    if (match.index === regex.lastIndex) regex.lastIndex++;
                    if (matches.length > 1000) break; // 安全限制
                }
            } else {
                match = regex.exec(text);
                if (match) {
                    matches.push({
                        index: match.index,
                        length: match[0].length,
                        value: match[0]
                    });
                }
            }

            if (matches.length === 0) {
                resultDiv.innerHTML = escapeHtml(text);
                countDiv.textContent = '无匹配';
                return;
            }

            // 高亮渲染
            var html = '';
            var pos = 0;
            matches.forEach(function(m) {
                if (m.index < pos) return; // 防止重叠
                html += escapeHtml(text.substring(pos, m.index));
                html += '<mark>' + escapeHtml(text.substring(m.index, m.index + m.length)) + '</mark>';
                pos = m.index + m.length;
            });
            html += escapeHtml(text.substring(pos));
            resultDiv.innerHTML = html;
            countDiv.textContent = '找到 ' + matches.length + ' 处匹配';
        }
    }

    function countDifferences(original, modified) {
        if (original === modified) return 0;
        // 简单估算：计算被替换的段数
        var count = 0;
        var minLen = Math.min(original.length, modified.length);
        var i = 0;
        while (i < minLen) {
            if (original[i] !== modified[i]) {
                count++;
                while (i < minLen && original[i] !== modified[i]) {
                    i++;
                }
            } else {
                i++;
            }
        }
        if (original.length !== modified.length) count++;
        return count;
    }

    // --- 事件绑定 ---
    patternInput.addEventListener('input', updateTest);
    testText.addEventListener('input', updateTest);
    replaceInput.addEventListener('input', updateTest);

    // 初始更新
    updateTest();
};

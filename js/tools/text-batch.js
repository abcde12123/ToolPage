// 夏夜工具集 - 文本批量处理 (ES5)
// 多行列表一键处理：去重/排序/反转/大小写/首字母大写/加前后缀/替换(正则)/清理/行号
// 操作累积模型：输入为源头，操作作用于当前文本并支持链式组合；改输入即从头来

window.initTextBatch = function(container) {

    var current = '';          // 当前处理中文本
    var steps = 0;             // 已应用操作步数
    var history = [];          // 撤销栈

    container.innerHTML =
        '<div class="bt-wrap">' +
            '<textarea class="bt-input" id="btInput" placeholder="每行一条数据，粘贴你的列表…" spellcheck="false"></textarea>' +
            '<div class="bt-ops">' +
                '<div class="bt-ops-label">行操作</div>' +
                '<div class="bt-row">' +
                    '<button class="bt-btn" data-op="dedupe1" title="重复行只保留第一处">&#x1F9F9; 去重·首次</button>' +
                    '<button class="bt-btn" data-op="dedupeLast" title="重复行保留最后一处">&#x1F9F9; 去重·末次</button>' +
                    '<button class="bt-btn" data-op="sortAsc" title="按字典序升序">&#x2B06; 升序</button>' +
                    '<button class="bt-btn" data-op="sortDesc" title="按字典序降序">&#x2B07; 降序</button>' +
                    '<button class="bt-btn" data-op="sortNum" title="按数字大小排序">&#x1F522; 数值</button>' +
                    '<button class="bt-btn" data-op="sortLen" title="按字符数排序">&#x1F4CF; 长度</button>' +
                    '<button class="bt-btn" data-op="reverse" title="行序倒转">&#x1F504; 反转</button>' +
                '</div>' +
                '<div class="bt-ops-label">文本操作</div>' +
                '<div class="bt-row">' +
                    '<button class="bt-btn" data-op="upper" title="整段转大写">&#x1F170;&#xFE0F; 大写</button>' +
                    '<button class="bt-btn" data-op="lower" title="整段转小写">&#x1F1F6; 小写</button>' +
                    '<button class="bt-btn" data-op="capLine" title="每行首字母大写">&#x1F524; 首字母大写</button>' +
                    '<button class="bt-btn" data-op="trim" title="每行去首尾空格">&#x2702;&#xFE0F; 去首尾空格</button>' +
                    '<button class="bt-btn" data-op="collapse" title="行内连续空格合并为单个">&#x2B1B; 合并空格</button>' +
                    '<button class="bt-btn" data-op="dropEmpty" title="删除空白行">&#x2796; 去空行</button>' +
                    '<button class="bt-btn" data-op="number" title="每行加序号">&#xFE0F;&#x20E3; 加行号</button>' +
                '</div>' +
                '<div class="bt-ops-label">工具</div>' +
                '<div class="bt-row">' +
                    '<button class="bt-btn" data-op="prefix">&#x2795; 加前缀</button>' +
                    '<button class="bt-btn" data-op="suffix">&#x2795; 加后缀</button>' +
                    '<button class="bt-btn" data-op="replace">&#x1F501; 替换</button>' +
                '</div>' +
            '</div>' +
            '<div class="bt-ext" id="btExt" style="display:none"></div>' +
            '<div class="bt-output-wrap">' +
                '<div class="bt-output-head">' +
                    '<span class="bt-status" id="btStatus">0 行</span>' +
                    '<span class="bt-sub" id="btSteps"></span>' +
                '</div>' +
                '<textarea class="bt-input" id="btOutput" readonly spellcheck="false" placeholder="处理结果将实时显示在这里"></textarea>' +
            '</div>' +
            '<div class="bt-actions">' +
                '<button class="bt-btn" id="btUndo">&#x21A9;&#xFE0F; 撤销</button>' +
                '<button class="bt-btn" id="btReset">&#x21BA;&#xFE0F; 重置</button>' +
                '<button class="bt-btn bt-btn-primary" id="btCopy">&#x1F4C4; 复制结果</button>' +
            '</div>' +
        '</div>';

    var inputEl = document.getElementById('btInput');
    var outputEl = document.getElementById('btOutput');
    var extEl = document.getElementById('btExt');
    var statusEl = document.getElementById('btStatus');
    var stepsEl = document.getElementById('btSteps');

    // --- 文本操作核心 ---
    function lines(t) { return t.split('\n'); }
    function join(arr) { return arr.join('\n'); }

    function dedupeFirst(arr) {
        var seen = {}, out = [];
        for (var i = 0; i < arr.length; i++) {
            if (!Object.prototype.hasOwnProperty.call(seen, arr[i])) { seen[arr[i]] = 1; out.push(arr[i]); }
        }
        return out;
    }
    function dedupeLast(arr) { return dedupeFirst(arr.slice().reverse()).reverse(); }
    function sortAsc(arr) { return arr.slice().sort(function(a, b) { return a < b ? -1 : a > b ? 1 : 0; }); }
    function sortDesc(arr) { return arr.slice().sort(function(a, b) { return a > b ? -1 : a < b ? 1 : 0; }); }
    function sortNum(arr) {
        return arr.slice().sort(function(a, b) {
            var x = parseFloat(a), y = parseFloat(b);
            var xn = isNaN(x), yn = isNaN(y);
            if (xn && yn) return 0;
            if (xn) return 1;   // 非数字放末尾
            if (yn) return -1;
            return x - y;
        });
    }
    function sortLen(arr) { return arr.slice().sort(function(a, b) { return a.length - b.length; }); }
    function capLine(arr) {
        return arr.map(function(l) { return l.length ? l.charAt(0).toUpperCase() + l.slice(1) : l; });
    }
    function collapse(arr) {
        return arr.map(function(l) { return l.replace(/\s+/g, ' ').trim(); });
    }
    function number(arr) {
        var out = [];
        for (var i = 0; i < arr.length; i++) out.push((i + 1) + '. ' + arr[i]);
        return out;
    }

    var OPS = {
        dedupe1: function(t) { return join(dedupeFirst(lines(t))); },
        dedupeLast: function(t) { return join(dedupeLast(lines(t))); },
        sortAsc: function(t) { return join(sortAsc(lines(t))); },
        sortDesc: function(t) { return join(sortDesc(lines(t))); },
        sortNum: function(t) { return join(sortNum(lines(t))); },
        sortLen: function(t) { return join(sortLen(lines(t))); },
        reverse: function(t) { return join(lines(t).reverse()); },
        upper: function(t) { return t.toUpperCase(); },
        lower: function(t) { return t.toLowerCase(); },
        capLine: function(t) { return join(capLine(lines(t))); },
        trim: function(t) { return join(lines(t).map(function(l) { return l.trim(); })); },
        collapse: function(t) { return join(collapse(lines(t))); },
        dropEmpty: function(t) { return join(lines(t).filter(function(l) { return l.trim() !== ''; })); },
        number: function(t) { return join(number(lines(t))); },
        prefix: function(t, p) { return join(lines(t).map(function(l) { return (p || '') + l; })); },
        suffix: function(t, s) { return join(lines(t).map(function(l) { return l + (s || ''); })); },
        replace: function(t, find, rep, useRegex) {
            if (!find) return t;
            if (useRegex) {
                var re;
                try { re = new RegExp(find, 'g'); }
                catch (e) { showToast('正则表达式有误：' + e.message); return current; }
                return t.split(re).join(rep);
            }
            return t.split(find).join(rep);
        }
    };

    // --- 状态同步 ---
    function syncOutput() {
        outputEl.value = current;
        statusEl.textContent = (current === '' ? 0 : current.split('\n').length) + ' 行';
        stepsEl.textContent = steps > 0 ? '已应用 ' + steps + ' 步操作' : '';
        outputEl.scrollTop = outputEl.scrollHeight;
    }

    // 应用一步操作（带撤销历史）
    function applyOp(name, arg1, arg2, arg3) {
        history.push(current);
        if (history.length > 30) history.shift();
        var result;
        try { result = OPS[name](current, arg1, arg2, arg3); }
        catch (e) { showToast('操作出错了：' + e.message); return; }
        current = result;
        steps++;
        extEl.style.display = 'none';
        syncOutput();
        showToast('已执行：' + name);
    }

    function doUndo() {
        if (!history.length) { showToast('没有可撤销的步骤'); return; }
        current = history.pop();
        steps = Math.max(0, steps - 1);
        syncOutput();
    }

    function doReset() {
        current = inputEl.value;
        steps = 0;
        history = [];
        extEl.style.display = 'none';
        syncOutput();
    }

    // --- 输入为源头：改动即重置所有操作 ---
    inputEl.addEventListener('input', doReset);

    // --- 操作按钮分发 ---
    var opBtns = container.querySelectorAll('[data-op]');
    function showExt(html) {
        extEl.innerHTML = html;
        extEl.style.display = 'block';
    }

    for (var i = 0; i < opBtns.length; i++) {
        opBtns[i].addEventListener('click', function() {
            var op = this.getAttribute('data-op');
            if (op === 'prefix' || op === 'suffix') {
                var isPrefix = op === 'prefix';
                showExt(
                    '<div class="bt-ext-row">' +
                        '<input class="bt-input bt-input-inline" id="btExtVal" placeholder="' + (isPrefix ? '输入前缀，如 # ' : '输入后缀，如 ;') + '" spellcheck="false" />' +
                        '<button class="bt-btn" id="btExtGo">' + (isPrefix ? '加前缀' : '加后缀') + '</button>' +
                        '<button class="bt-btn bt-btn-plain" id="btExtCancel">取消</button>' +
                    '</div>'
                );
                var valEl = document.getElementById('btExtVal');
                document.getElementById('btExtGo').addEventListener('click', function() {
                    applyOp(isPrefix ? 'prefix' : 'suffix', valEl.value);
                });
                document.getElementById('btExtCancel').addEventListener('click', function() { extEl.style.display = 'none'; });
                valEl.focus();
                valEl.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') applyOp(isPrefix ? 'prefix' : 'suffix', valEl.value);
                });
                return;
            }
            if (op === 'replace') {
                showExt(
                    '<div class="bt-ext-row">' +
                        '<input class="bt-input bt-input-inline" id="btExtFind" placeholder="查找内容" spellcheck="false" />' +
                        '<input class="bt-input bt-input-inline" id="btExtRep" placeholder="替换为（留空=删除）" spellcheck="false" />' +
                        '<label class="bt-chk"><input type="checkbox" id="btExtRegex" /> 正则</label>' +
                        '<button class="bt-btn" id="btExtGo">替换</button>' +
                        '<button class="bt-btn bt-btn-plain" id="btExtCancel">取消</button>' +
                    '</div>'
                );
                var findEl = document.getElementById('btExtFind');
                var repEl = document.getElementById('btExtRep');
                var regexEl = document.getElementById('btExtRegex');
                function go() {
                    applyOp('replace', findEl.value, repEl.value, regexEl.checked);
                }
                document.getElementById('btExtGo').addEventListener('click', go);
                document.getElementById('btExtCancel').addEventListener('click', function() { extEl.style.display = 'none'; });
                findEl.focus();
                findEl.addEventListener('keydown', function(e) { if (e.key === 'Enter') go(); });
                return;
            }
            applyOp(op);
        });
    }

    document.getElementById('btUndo').addEventListener('click', doUndo);
    document.getElementById('btReset').addEventListener('click', doReset);
    document.getElementById('btCopy').addEventListener('click', function() {
        if (!current) { showToast('还没有可复制的文本'); return; }
        copyToClipboard(current);
        showToast('已复制 ' + outputEl.value.split('\n').length + ' 行');
    });

    // 初始示例
    inputEl.value = '上海\n北京\n深圳\n北京\n广州\n上海\n杭州';
    doReset();
};

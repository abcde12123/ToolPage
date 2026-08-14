// 夏夜工具集 - 文字统计工具 (ES5)
// 实时统计字数/中英文/数字/标点/行段数/阅读时长 + Top N 高频词条形图
// 口径：总字数 = 中文词块 + 英文单词 + 数字串；中文词 = 被标点/空格/英文/数字分隔的连续汉字段

window.initTextStats = function(container) {

    var stTimer = null;
    var currentStats = null;

    // 中英文标点字符集（显式列出，避免把 emoji 误判成标点）
    var PUNCT_RE = /[，。！？；：、·…—～（）《》〈〉「」『』【】〔〕“”‘’‘’!,.;:?()[\]{}<>\/\\|@#$%^&*_+=\-~`]/g;

    // --- 统计卡片配置 ---
    var STAT_CARDS = [
        { key: 'words',       label: '总字数' },
        { key: 'cjkBlocks',   label: '中文词' },
        { key: 'cjkChars',    label: '汉字' },
        { key: 'enWords',     label: '英文单词' },
        { key: 'digits',      label: '数字' },
        { key: 'punct',       label: '标点' },
        { key: 'chars',       label: '字符数（含空格）' },
        { key: 'charsNoSpace',label: '字符数（不含空格）' },
        { key: 'lines',       label: '行数' },
        { key: 'paras',       label: '段落数' },
        { key: 'readTime',    label: '预计阅读' }
    ];

    // --- 构建 UI ---
    container.innerHTML =
        '<div class="st-container">' +
            '<textarea class="st-textarea" id="stInput" placeholder="在这里粘贴或输入文本，实时统计～" spellcheck="false"></textarea>' +
            '<div class="st-toolbar">' +
                '<button class="st-btn" id="stSample">&#x1F4CB; 示例文本</button>' +
                '<button class="st-btn st-btn-danger" id="stClear">&#x1F9F9; 清空</button>' +
                '<span class="st-note">总字数 = 中文词 + 英文单词 + 数字串</span>' +
                '<span class="st-spacer"></span>' +
                '<label class="st-topn">高频词 Top' +
                    '<select id="stTopN">' +
                        '<option value="5">5</option>' +
                        '<option value="10" selected>10</option>' +
                        '<option value="20">20</option>' +
                    '</select>' +
                '</label>' +
                '<button class="st-btn" id="stCopy">&#x1F4C4; 复制统计</button>' +
            '</div>' +
            '<div class="st-grid" id="stGrid"></div>' +
            '<div class="st-freq">' +
                '<div class="st-freq-head">' +
                    '<span>&#x1F4CA; 高频词词频</span>' +
                    '<span class="st-freq-tip">中文按相邻两字组合统计，结果仅供参考</span>' +
                '</div>' +
                '<div class="st-freq-list" id="stFreqList"><div class="st-empty">输入文本后自动生成词频条形图</div></div>' +
            '</div>' +
        '</div>';

    var input = document.getElementById('stInput');
    var gridEl = document.getElementById('stGrid');
    var listEl = document.getElementById('stFreqList');
    var topNEl = document.getElementById('stTopN');
    var sampleBtn = document.getElementById('stSample');
    var clearBtn = document.getElementById('stClear');
    var copyBtn = document.getElementById('stCopy');

    // --- 渲染统计卡片骨架 ---
    function renderGrid() {
        var html = '';
        for (var i = 0; i < STAT_CARDS.length; i++) {
            var c = STAT_CARDS[i];
            html += '<div class="st-stat"><label>' + c.label + '</label><b id="stVal' + c.key + '">-</b></div>';
        }
        gridEl.innerHTML = html;
    }

    function setVal(key, v) {
        var el = document.getElementById('stVal' + key);
        if (el) el.textContent = '' + v;
    }

    // --- 阅读时长：按 300 字/分钟（以汉字字符数 + 英文单词 + 数字串为有效字数） ---
    function formatReadTime(readWords) {
        if (readWords <= 0) return '0 秒';
        var mins = readWords / 300;
        if (mins < 1) {
            var secs = Math.max(1, Math.round(readWords / 5));
            return '约 ' + secs + ' 秒';
        }
        if (mins < 60) {
            var m = mins < 10 ? Math.round(mins * 10) / 10 : Math.round(mins);
            return '约 ' + m + ' 分钟';
        }
        var h = Math.round(mins / 60 * 10) / 10;
        return '约 ' + h + ' 小时';
    }

    // --- 词频：英文按单词（忽略大小写），中文连续段 ≥2 字做双字滑窗，单字按单字 ---
    function getFreq(text) {
        var map = {};
        var re = /[a-zA-Z]+|[一-龥]+/g;
        var m;
        while ((m = re.exec(text)) !== null) {
            var t = m[0];
            if (/^[a-zA-Z]+$/.test(t)) {
                var w = t.toLowerCase();
                map[w] = (map[w] || 0) + 1;
            } else if (t.length >= 2) {
                for (var i = 0; i < t.length - 1; i++) {
                    var w2 = t.substr(i, 2);
                    map[w2] = (map[w2] || 0) + 1;
                }
            } else {
                map[t] = (map[t] || 0) + 1;
            }
        }
        var arr = [];
        for (var k in map) arr.push({ w: k, c: map[k] });
        arr.sort(function(a, b) { return b.c - a.c || (a.w < b.w ? -1 : 1); });
        return arr;
    }

    // --- 核心统计 ---
    function analyze(text) {
        if (text === '') {
            return {
                words: 0, cjkBlocks: 0, cjkChars: 0, enWords: 0,
                digits: 0, punct: 0, chars: 0, charsNoSpace: 0,
                lines: 0, paras: 0, readTime: '0 秒', freq: []
            };
        }

        var cjkBlocks = (text.match(/[一-龥]+/g) || []).length;
        var cjkChars = (text.match(/[一-龥]/g) || []).length;
        var enWords = (text.match(/[a-zA-Z]+/g) || []).length;
        var numTokens = (text.match(/[0-9]+/g) || []).length;
        var digits = (text.match(/[0-9]/g) || []).length;
        var punct = (text.match(PUNCT_RE) || []).length;

        // 字符数：emoji（代理对）归一为 1 个字符
        var norm = text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '·');
        var chars = norm.length;
        var charsNoSpace = norm.replace(/[\s　]/g, '').length;

        // 行数：末尾空行不算；空文本为 0
        var lines = text.split('\n');
        if (lines[lines.length - 1] === '') lines.pop();
        var lineCount = lines.length;

        // 段落数：按空行（含空白行）分隔
        var paras = 0;
        var trimmed = text.trim();
        if (trimmed !== '') {
            paras = trimmed.split(/\n[ \t]*\n/).filter(function(p) { return p.trim() !== ''; }).length;
        }

        var words = cjkBlocks + enWords + numTokens;
        var readWords = cjkChars + enWords + numTokens;

        return {
            words: words,
            cjkBlocks: cjkBlocks,
            cjkChars: cjkChars,
            enWords: enWords,
            digits: digits,
            punct: punct,
            chars: chars,
            charsNoSpace: charsNoSpace,
            lines: lineCount,
            paras: paras,
            readTime: formatReadTime(readWords),
            freq: getFreq(text)
        };
    }

    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // --- 词频条形图 ---
    function renderFreq(arr, n) {
        var top = arr.slice(0, n);
        if (!top.length) {
            listEl.innerHTML = '<div class="st-empty">暂无词条</div>';
            return;
        }
        var max = top[0].c;
        var html = '';
        for (var i = 0; i < top.length; i++) {
            var pct = max > 0 ? Math.round(top[i].c / max * 100) : 0;
            html +=
                '<div class="st-freq-row">' +
                    '<span class="st-freq-word" title="' + esc(top[i].w) + '">' + esc(top[i].w) + '</span>' +
                    '<div class="st-freq-track"><div class="st-freq-bar" style="width:' + pct + '%"></div></div>' +
                    '<span class="st-freq-count">' + top[i].c + '</span>' +
                '</div>';
        }
        listEl.innerHTML = html;
    }

    // --- 刷新全部统计 ---
    function run() {
        var text = input.value;
        currentStats = analyze(text);
        var s = currentStats;
        for (var i = 0; i < STAT_CARDS.length; i++) {
            var c = STAT_CARDS[i];
            setVal(c.key, c.key === 'readTime' ? s.readTime : s[c.key]);
        }
        renderFreq(s.freq, parseInt(topNEl.value, 10));
    }

    // --- 生成复制文本 ---
    function buildCopyText(s) {
        var txt =
            '总字数：' + s.words + '\n' +
            '中文词：' + s.cjkBlocks + '\n' +
            '汉字：' + s.cjkChars + '\n' +
            '英文单词：' + s.enWords + '\n' +
            '数字：' + s.digits + '\n' +
            '标点：' + s.punct + '\n' +
            '字符数（含空格）：' + s.chars + '\n' +
            '字符数（不含空格）：' + s.charsNoSpace + '\n' +
            '行数：' + s.lines + '\n' +
            '段落数：' + s.paras + '\n' +
            '预计阅读：' + s.readTime;
        if (s.freq && s.freq.length) {
            var n = parseInt(topNEl.value, 10);
            txt += '\n\n高频词 Top ' + n + '：\n';
            s.freq.slice(0, n).forEach(function(f) {
                txt += f.w + '  ' + f.c + '\n';
            });
        }
        return txt;
    }

    // --- 事件绑定 ---
    input.addEventListener('input', function() {
        if (stTimer) clearTimeout(stTimer);
        stTimer = setTimeout(run, 200);   // 防抖：大文本不卡输入
    });

    sampleBtn.addEventListener('click', function() {
        input.value =
            '你好，世界！Hello World! 今天是 2026 年 8 月 14 日，夏夜工具集的文字统计工具上线啦。\n\n' +
            '樱花在月光下轻轻飘落，夜风穿过长街。此刻的宁静，属于每一个用心生活的人。\n\n' +
            'The quick brown fox jumps over the lazy dog. 1234567890.';
        run();
    });

    clearBtn.addEventListener('click', function() {
        input.value = '';
        run();
        input.focus();
    });

    topNEl.addEventListener('change', function() {
        if (currentStats) renderFreq(currentStats.freq, parseInt(topNEl.value, 10));
    });

    copyBtn.addEventListener('click', function() {
        var s = currentStats || analyze('');
        copyToClipboard(buildCopyText(s));
        showToast('统计结果已复制');
    });

    // --- 初始化 ---
    renderGrid();
    run();   // 空文本全 0
};

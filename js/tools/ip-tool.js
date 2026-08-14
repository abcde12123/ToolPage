// 夏夜工具集 - IP 地址工具 (ES5)
// 三个模式：我的 IP（内网+公网）/ 子网计算 / 地址校验
// 公网 IP 优先走本站 /api/ip（nginx $remote_addr，国内直连真实 IP），ipinfo/ipify 作出口兜底
// 内网 IP 用 WebRTC 收集，现代浏览器 mDNS 混淆下拿不到真实值则诚实降级提示

window.initIpTool = function(container) {

    var currentMode = 1;

    container.innerHTML =
        '<div class="ip-container">' +
            '<div class="ip-toggle">' +
                '<button class="ip-toggle-btn active" id="ipMode1">&#x1F30D; 我的 IP</button>' +
                '<button class="ip-toggle-btn" id="ipMode2">&#x1F9EE; 子网计算</button>' +
                '<button class="ip-toggle-btn" id="ipMode3">&#x2705; 地址校验</button>' +
            '</div>' +
            '<div id="ipContent"></div>' +
        '</div>';

    var toggle1 = document.getElementById('ipMode1');
    var toggle2 = document.getElementById('ipMode2');
    var toggle3 = document.getElementById('ipMode3');
    var content = document.getElementById('ipContent');

    // --- 公用 helper ---

    // fetch 带超时（AbortController）
    function fetchWithTimeout(url, ms) {
        var ctrl = new AbortController();
        var timer = setTimeout(function() { ctrl.abort(); }, ms);
        return fetch(url, { signal: ctrl.signal }).then(function(r) {
            clearTimeout(timer);
            return r;
        }, function(e) {
            clearTimeout(timer);
            throw e;
        });
    }

    // IPv4 字符串 → 无符号 32 位整数（失败返回 -1）
    function ipToInt(str) {
        var p = str.split('.');
        if (p.length !== 4) return -1;
        var n = 0;
        for (var i = 0; i < 4; i++) {
            var seg = p[i];
            if (!/^\d{1,3}$/.test(seg)) return -1;
            var v = parseInt(seg, 10);
            if (v > 255) return -1;
            n = n * 256 + v;
        }
        return n >>> 0;
    }

    function intToIp(n) {
        n = n >>> 0;
        return ((n >>> 24) & 255) + '.' + ((n >>> 16) & 255) + '.' + ((n >>> 8) & 255) + '.' + (n & 255);
    }

    // 收集本机内网 IP：WebRTC host candidate（现代浏览器 mDNS 混淆，真实值往往拿不到）
    function collectLocalIps(onDone) {
        var ips = [];
        var done = false;
        var timer = setTimeout(function() { finish(); }, 5000);
        function finish() {
            if (done) return;
            done = true;
            clearTimeout(timer);
            try { if (pc) pc.close(); } catch (e) {}
            onDone(ips);
        }
        var pc = null;
        try {
            pc = new RTCPeerConnection({ iceServers: [] });
            pc.createDataChannel('ip');
            pc.onicecandidate = function(e) {
                if (!e.candidate) { finish(); return; }
                var p = e.candidate.candidate.split(' ');
                if (p.length < 5 || !p[4]) return;
                var addr = p[4];
                if (addr.indexOf('.local') >= 0) return;      // mDNS 混淆地址，无意义
                if (addr === '0.0.0.0' || addr === '::') return;
                if (ips.indexOf(addr) < 0) ips.push(addr);
            };
            pc.createOffer().then(function(o) { return pc.setLocalDescription(o); }).catch(function() { finish(); });
        } catch (e) { finish(); }
    }

    // 获取公网 IP：本站 /api/ip（nginx $remote_addr，仅 https 部署存在）→ ipinfo（带位置）→ ipify（纯 IP）
    function fetchPublicIp() {
        var useSelfApi = location.protocol === 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
        var first = useSelfApi
            ? fetchWithTimeout('/api/ip', 3000)
                .then(function(r) { if (!r.ok) throw new Error('self-ip'); return r.json(); })
                .then(function(j) {
                    if (!j || !j.ip) throw new Error('self-ip-empty');
                    return { ip: j.ip, source: 'self' };
                })
            : Promise.reject('no-self-api');
        return first.catch(function() {
                return fetchWithTimeout('https://ipinfo.io/json', 4000)
                    .then(function(r) { if (!r.ok) throw new Error('ipinfo'); return r.json(); })
                    .then(function(j) { return { ip: j.ip, city: j.city, region: j.region, country: j.country, org: j.org, source: 'ipinfo' }; })
                    .catch(function() {
                        return fetchWithTimeout('https://api.ipify.org?format=json', 4000)
                            .then(function(r) { if (!r.ok) throw new Error('ipify'); return r.json(); })
                            .then(function(j) { if (!j.ip) throw new Error('ipify-empty'); return { ip: j.ip, source: 'ipify' }; });
                    });
            });
    }

    // 公网 IP 是 IPv6 时转纯文本（去掉作用域 %）
    function cleanIpText(ip) {
        var i = ip.indexOf('%');
        return i >= 0 ? ip.slice(0, i) : ip;
    }

    // --- Mode 1: 我的 IP ---
    function renderMode1() {
        content.innerHTML =
            '<div class="ip-grid2">' +
                '<div class="ip-card">' +
                    '<div class="ip-card-title">&#x1F310; 公网 IP</div>' +
                    '<div class="ip-big" id="ip1Public">检测中...</div>' +
                    '<div class="ip-sub" id="ip1PublicInfo"></div>' +
                '</div>' +
                '<div class="ip-card">' +
                    '<div class="ip-card-title">&#x1F3E0; 本机内网 IP</div>' +
                    '<div id="ip1Local"></div>' +
                    '<div class="ip-sub" id="ip1LocalHint"></div>' +
                '</div>' +
            '</div>' +
            '<div class="ip-actions">' +
                '<button class="ip-btn" id="ip1Refresh">&#x1F504; 重新检测</button>' +
                '<button class="ip-btn" id="ip1Copy">&#x1F4C4; 复制结果</button>' +
            '</div>' +
            '<div class="ip-note" id="ip1Note"></div>';

        var pubEl = document.getElementById('ip1Public');
        var pubInfoEl = document.getElementById('ip1PublicInfo');
        var localEl = document.getElementById('ip1Local');
        var localHintEl = document.getElementById('ip1LocalHint');

        var state = { publicText: '', publicInfo: '', localText: '' };

        function renderLocal(ips) {
            var v4 = [], v6 = [];
            ips.forEach(function(a) {
                if (a.indexOf(':') >= 0) v6.push(a); else v4.push(a);
            });
            state.localText = v4.concat(v6).join('\n');
            if (v4.length + v6.length === 0) {
                localEl.innerHTML = '<span class="ip-locked">&#x1F512; 被浏览器隐私保护隐藏</span>';
                localHintEl.textContent = '现代浏览器隐藏了 WebRTC 的本机 IP。查看方法：Windows 运行 ipconfig，Mac/Linux 运行 ifconfig，或在系统网络设置里看当前连接。';
            } else {
                var html = '';
                v4.forEach(function(a) { html += '<span class="ip-chip">' + a + '</span>'; });
                v6.forEach(function(a) { html += '<span class="ip-chip ip-chip-v6">' + cleanIpText(a) + '</span>'; });
                localEl.innerHTML = html || '—';
                localHintEl.textContent = 'IPv6 地址已去除作用域标识。';
            }
        }

        function refresh() {
            pubEl.textContent = '检测中...';
            pubEl.classList.remove('ip-err');
            pubInfoEl.textContent = '';
            // 公网
            fetchPublicIp().then(function(res) {
                state.publicText = res.ip;
                pubEl.textContent = cleanIpText(res.ip);
                if (res.source === 'ipinfo') {
                    var loc = [res.city, res.region, res.country].filter(Boolean).join(' · ');
                    var isp = res.org ? res.org.replace(/^AS\d+\s+/, '') : '';
                    state.publicInfo = (loc ? loc + ' ' : '') + (isp ? '· ' + isp : '') + '（出口 IP，若开代理显示为节点地址）';
                } else if (res.source === 'ipify') {
                    state.publicInfo = '来源：ipify（出口 IP）';
                } else {
                    state.publicInfo = '来源：本站（真实公网 IP）';
                }
                pubInfoEl.textContent = state.publicInfo;
            }).catch(function() {
                pubEl.textContent = '暂无法获取公网 IP';
                pubEl.classList.add('ip-err');
                state.publicText = '';
                pubInfoEl.textContent = '网络受限或代理拦截，稍后再试～';
            });
            // 内网
            localEl.innerHTML = '<span class="ip-sub">扫描中...</span>';
            localHintEl.textContent = '';
            collectLocalIps(renderLocal);
        }

        document.getElementById('ip1Refresh').addEventListener('click', refresh);
        document.getElementById('ip1Copy').addEventListener('click', function() {
            if (!state.publicText && !state.localText) { showToast('还没有可复制的数据'); return; }
            var txt = '公网 IP：' + (state.publicText || '未获取') + '\n' +
                      (state.publicInfo ? state.publicInfo + '\n' : '') +
                      '内网 IP：' + (state.localText || '被浏览器隐藏');
            copyToClipboard(txt);
            showToast('已复制');
        });

        refresh();
    }

    // --- Mode 2: 子网计算 ---
    function renderMode2() {
        content.innerHTML =
            '<div class="ip-field-row">' +
                '<input class="ip-input" id="ip2Input" placeholder="192.168.1.7/24" autocomplete="off" spellcheck="false" />' +
                '<button class="ip-btn" id="ip2Calc">计算</button>' +
            '</div>' +
            '<div class="ip-hint">支持任意合法 IPv4 + 前缀(0-32)，如 192.168.1.7/24、10.0.0.1/8</div>' +
            '<div class="ip-card ip-card-hidden" id="ip2Result">' +
                '<div class="ip-table" id="ip2Table"></div>' +
                '<div class="ip-bin" id="ip2Bin"></div>' +
            '</div>';

        var inputEl = document.getElementById('ip2Input');
        var resultEl = document.getElementById('ip2Result');
        var tableEl = document.getElementById('ip2Table');
        var binEl = document.getElementById('ip2Bin');

        function toBin8(n) {
            var s = '';
            for (var i = 7; i >= 0; i--) s += ((n >>> i) & 1) ? '1' : '0';
            return s;
        }
        function binRowHtml(value, prefix) {
            // 32 位二进制，网络位(< prefix)绿色高亮，主机位灰色
            var bits = '';
            for (var i = 31; i >= 0; i--) bits += ((value >>> i) & 1) ? '1' : '0';
            var html = '';
            for (var j = 0; j < 32; j += 8) {
                html += '<span class="ip-bin-byte">';
                for (var k = 0; k < 8; k++) {
                    var pos = j + k;                    // 从左到右字节序位置
                    var bitPos = 31 - pos;              // 位权
                    var isNet = pos < prefix;
                    html += '<span class="' + (isNet ? 'ip-bin-net' : 'ip-bin-host') + '">' + ((value >>> bitPos) & 1) + '</span>';
                }
                html += '</span>';
            }
            return html;
        }

        function calc() {
            var raw = inputEl.value.trim().replace(/\s+/g, '');
            if (!raw) { resultEl.classList.add('ip-card-hidden'); return; }
            var m = raw.match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
            if (!m) {
                resultEl.classList.remove('ip-card-hidden');
                tableEl.innerHTML = '<div class="ip-err">格式不对，请输入 例如 192.168.1.7/24</div>';
                binEl.innerHTML = '';
                return;
            }
            var prefix = parseInt(m[2], 10);
            var ip = ipToInt(m[1]);
            if (ip === -1 || prefix > 32) {
                resultEl.classList.remove('ip-card-hidden');
                tableEl.innerHTML = '<div class="ip-err">IP 或前缀不合法（IP 每段 0-255，前缀 0-32）</div>';
                binEl.innerHTML = '';
                return;
            }
            var mask = prefix === 0 ? 0 : ((0xFFFFFFFF << (32 - prefix)) >>> 0);
            var network = (ip & mask) >>> 0;
            var broadcast = (network | ((~mask) >>> 0)) >>> 0;
            var first = network + 1;
            var last = broadcast - 1;
            var hosts;
            if (prefix === 32) hosts = 1;
            else if (prefix === 31) hosts = 2;
            else hosts = broadcast - network - 1;

            var hostRange;
            if (prefix === 31) hostRange = intToIp(network) + ' ~ ' + intToIp(broadcast) + '（点对点，无网络/广播）';
            else if (prefix === 32) hostRange = intToIp(network) + '（单机）';
            else hostRange = intToIp(first) + ' ~ ' + intToIp(last);
            var hostText;
            if (hosts >= 100000000) hostText = '约 ' + Math.round(hosts / 100000000) + ' 亿';
            else if (hosts >= 10000) hostText = '约 ' + Math.round(hosts / 10000) + ' 万';
            else hostText = '' + hosts;

            tableEl.innerHTML =
                '<div class="ip-tr"><span class="ip-td-key">网络地址</span><span class="ip-td-val">' + intToIp(network) + '</span></div>' +
                '<div class="ip-tr"><span class="ip-td-key">广播地址</span><span class="ip-td-val">' + intToIp(broadcast) + '</span></div>' +
                '<div class="ip-tr"><span class="ip-td-key">子网掩码</span><span class="ip-td-val">' + intToIp(mask) + '（/' + prefix + '）</span></div>' +
                '<div class="ip-tr"><span class="ip-td-key">可用主机</span><span class="ip-td-val">' + hostRange + '</span></div>' +
                '<div class="ip-tr"><span class="ip-td-key">主机数</span><span class="ip-td-val">' + hostText + ' 台</span></div>';

            binEl.innerHTML =
                '<div class="ip-bin-row"><span class="ip-bin-label">IP</span><span class="ip-bin-spans">' + binRowHtml(ip, prefix) + '</span></div>' +
                '<div class="ip-bin-row"><span class="ip-bin-label">掩码</span><span class="ip-bin-spans">' + binRowHtml(mask, prefix) + '</span></div>' +
                '<div class="ip-bin-row"><span class="ip-bin-label">网络</span><span class="ip-bin-spans">' + binRowHtml(network, prefix) + '</span></div>';

            resultEl.classList.remove('ip-card-hidden');
        }

        document.getElementById('ip2Calc').addEventListener('click', calc);
        inputEl.addEventListener('keydown', function(e) { if (e.key === 'Enter') calc(); });
        inputEl.value = '192.168.1.7/24';
        calc();
    }

    // --- Mode 3: 地址校验 ---
    function renderMode3() {
        content.innerHTML =
            '<div class="ip-field-row">' +
                '<input class="ip-input" id="ip3Input" placeholder="输入 IPv4 或 IPv6 地址" autocomplete="off" spellcheck="false" />' +
            '</div>' +
            '<div class="ip-hint">IPv4 如 192.168.1.7、8.8.8.8；IPv6 如 2408:8207:xxxx::1</div>' +
            '<div class="ip-card">' +
                '<div class="ip-big" id="ip3Result">输入地址开始校验</div>' +
                '<div class="ip-sub" id="ip3Detail"></div>' +
            '</div>';

        var inputEl = document.getElementById('ip3Input');
        var resEl = document.getElementById('ip3Result');
        var detailEl = document.getElementById('ip3Detail');

        function classifyIpv4(str) {
            var ip = ipToInt(str);
            if (ip === -1) return null;
            var a = ip >>> 24;
            if (ip === 0xFFFFFFFF) return '广播地址（255.255.255.255）';
            if (a === 127) return '回环地址（本机自测用）';
            if (a === 10) return '私网地址（A 类 10.0.0.0/8）';
            // 注意：按位与结果在最高位为 1 时是负数，必须 >>>0 转无符号再与字面量比较
            if (((ip & 0xFFF00000) >>> 0) === 0xAC100000) return '私网地址（B 类 172.16.0.0/12）';
            if (((ip & 0xFFFF0000) >>> 0) === 0xC0A80000) return '私网地址（C 类 192.168.0.0/16）';
            if (((ip & 0xFFFF0000) >>> 0) === 0xA9FE0000) return '链路本地地址（169.254.0.0/16，自动配置）';
            if (((ip & 0xFFC00000) >>> 0) === 0x64400000) return '运营商级 NAT 地址（100.64.0.0/10）';
            if (a >= 224 && a <= 239) return '组播地址（D 类 224.0.0.0/4）';
            if (a >= 240) return '保留地址（E 类，实验用途）';
            if (a === 0) return '保留地址（0.0.0.0/8）';
            if (a <= 127) return '公网地址（A 类 0.0.0.0 - 127.255.255.255）';
            if (a <= 191) return '公网地址（B 类 128.0.0.0 - 191.255.255.255）';
            return '公网地址（C 类 192.0.0.0 - 223.255.255.255）';
        }

        function isValidIpv6(str) {
            if (!str) return false;
            if (str.indexOf('::') >= 0) {
                if ((str.match(/::/g) || []).length > 1) return false;
            }
            var blocks = str.split('::');
            var left = blocks[0] ? blocks[0].split(':') : [];
            var right = blocks[1] ? blocks[1].split(':') : [];
            if (blocks.length === 2) {
                if (left.length + right.length > 7) return false;
            } else {
                if (blocks[0].split(':').length !== 8) return false;
            }
            var all = left.concat(right);
            for (var i = 0; i < all.length; i++) {
                if (!/^[0-9a-fA-F]{1,4}$/.test(all[i])) return false;
            }
            return true;
        }

        function update() {
            var raw = inputEl.value.trim();
            if (!raw) { resEl.textContent = '输入地址开始校验'; resEl.className = 'ip-big'; detailEl.textContent = ''; return; }
            if (raw.indexOf(':') >= 0) {
                if (isValidIpv6(raw)) {
                    resEl.textContent = '✅ 合法的 IPv6 地址';
                    resEl.className = 'ip-big ip-ok';
                    detailEl.textContent = 'IPv6 地址（128 位）';
                } else {
                    resEl.textContent = '❌ 不是合法的 IPv6 地址';
                    resEl.className = 'ip-big ip-err';
                    detailEl.textContent = '格式：8 组十六进制，每组 1-4 位，用 : 分隔；可用 :: 压缩连续 0';
                }
                return;
            }
            var cls = classifyIpv4(raw);
            if (cls) {
                resEl.textContent = '✅ 合法的 IPv4 地址';
                resEl.className = 'ip-big ip-ok';
                detailEl.textContent = cls;
            } else {
                resEl.textContent = '❌ 不是合法的 IPv4 地址';
                resEl.className = 'ip-big ip-err';
                detailEl.textContent = '格式：4 段 0-255 的数字，用 . 分隔';
            }
        }

        inputEl.addEventListener('input', update);
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

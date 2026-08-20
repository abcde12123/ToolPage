// 游戏服务器查询工具 - 主逻辑
(function() {
    'use strict';

    // ===== 配置 =====
    const API_BASE = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
        ? 'http://localhost:8500/api/gameserver'
        : 'https://xiaye.xyz/api/gameserver';
    const STORAGE_KEYS = {
        FAVORITES: 'gs_favorites',
        HISTORY: 'gs_history'
    };
    const MAX_FAVORITES = 20;
    const MAX_HISTORY = 10;
    const CACHE_VERSION = 42;

    // ===== 状态 =====
    let currentGame = 'minecraft';
    let currentResult = null;
    let historyChart = null;

    // ===== DOM 元素 =====
    const elements = {
        tabs: document.querySelectorAll('.gs-tab'),
        form: document.getElementById('queryForm'),
        hostInput: document.getElementById('serverHost'),
        portInput: document.getElementById('serverPort'),
        btnQuery: document.getElementById('btnQuery'),
        btnFavorite: document.getElementById('btnFavorite'),
        resultSection: document.getElementById('resultSection'),
        resultContent: document.getElementById('resultContent'),
        favoritesList: document.getElementById('favoritesList'),
        historyList: document.getElementById('historyList'),
        chartCanvas: document.getElementById('historyChart'),
        chartControls: document.querySelectorAll('.gs-chart-controls .gs-btn')
    };

    // ===== 工具函数 =====
    function escapeHtml(unsafe) {
        if (unsafe == null) return '';
        const str = String(unsafe);
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function showToast(message, duration = 3000) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }

    function formatRelativeTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes} 分钟前`;
        if (hours < 24) return `${hours} 小时前`;
        return `${days} 天前`;
    }

    function getGameName(gameId) {
        const names = {
            'minecraft': 'Minecraft Java',
            'minecraftbe': 'Minecraft 基岩版',
            'palworld': 'Palworld'
        };
        return names[gameId] || gameId;
    }

    // ===== LocalStorage 管理 =====
    function getFavorites() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load favorites:', e);
            return [];
        }
    }

    function saveFavorites(favorites) {
        try {
            localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
        } catch (e) {
            console.error('Failed to save favorites:', e);
        }
    }

    function addFavorite(game, host, port, name) {
        const favorites = getFavorites();
        const key = `${game}:${host}:${port}`;

        if (favorites.some(f => `${f.game}:${f.host}:${f.port}` === key)) {
            showToast('已在收藏列表中');
            return;
        }

        if (favorites.length >= MAX_FAVORITES) {
            showToast(`最多收藏 ${MAX_FAVORITES} 个服务器`);
            return;
        }

        favorites.unshift({ game, host, port, name, addedAt: Date.now() });
        saveFavorites(favorites);
        renderFavorites();
        showToast('已添加到收藏');
    }

    function removeFavorite(index) {
        const favorites = getFavorites();
        favorites.splice(index, 1);
        saveFavorites(favorites);
        renderFavorites();
        showToast('已从收藏移除');
    }

    function getHistory() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load history:', e);
            return [];
        }
    }

    function saveHistory(history) {
        try {
            localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
        } catch (e) {
            console.error('Failed to save history:', e);
        }
    }

    function addHistory(game, host, port) {
        const history = getHistory();
        const key = `${game}:${host}:${port}`;

        // 移除重复项
        const filtered = history.filter(h => `${h.game}:${h.host}:${h.port}` !== key);

        // 添加到开头
        filtered.unshift({ game, host, port, timestamp: Date.now() });

        // 限制数量
        if (filtered.length > MAX_HISTORY) {
            filtered.splice(MAX_HISTORY);
        }

        saveHistory(filtered);
        renderHistory();
    }

    // ===== 渲染函数 =====
    function renderFavorites() {
        const favorites = getFavorites();
        const container = elements.favoritesList;

        if (favorites.length === 0) {
            container.innerHTML = '<p class="gs-empty">暂无收藏</p>';
            return;
        }

        container.innerHTML = favorites.map((fav, index) => `
            <div class="gs-favorite-item" data-game="${escapeHtml(fav.game)}" data-host="${escapeHtml(fav.host)}" data-port="${escapeHtml(fav.port)}">
                <div>
                    <div class="gs-favorite-item__name">${escapeHtml(fav.name || '未命名服务器')}</div>
                    <div class="gs-favorite-item__addr">${escapeHtml(fav.host)}:${escapeHtml(fav.port)}</div>
                </div>
                <button class="gs-favorite-item__remove" data-index="${index}" title="移除">×</button>
            </div>
        `).join('');

        // 绑定点击事件
        container.querySelectorAll('.gs-favorite-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('gs-favorite-item__remove')) return;
                const game = item.dataset.game;
                const host = item.dataset.host;
                const port = item.dataset.port;
                fillForm(game, host, port);
            });
        });

        // 绑定删除事件
        container.querySelectorAll('.gs-favorite-item__remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                removeFavorite(index);
            });
        });
    }

    function renderHistory() {
        const history = getHistory();
        const container = elements.historyList;

        // 过滤掉没有端口号的旧记录
        const validHistory = history.filter(item => item.port);

        if (validHistory.length === 0) {
            container.innerHTML = '<p class="gs-empty">暂无历史</p>';
            return;
        }

        container.innerHTML = validHistory.map(item => `
            <div class="gs-history-item" data-game="${escapeHtml(item.game)}" data-host="${escapeHtml(item.host)}" data-port="${escapeHtml(item.port)}">
                <div class="gs-history-item__game">${escapeHtml(getGameName(item.game))}</div>
                <div class="gs-history-item__addr">${escapeHtml(item.host)}:${escapeHtml(item.port)}</div>
                <div class="gs-history-item__time">${escapeHtml(formatRelativeTime(item.timestamp))}</div>
            </div>
        `).join('');

        // 绑定点击事件
        container.querySelectorAll('.gs-history-item').forEach(item => {
            item.addEventListener('click', () => {
                const game = item.dataset.game;
                const host = item.dataset.host;
                const port = item.dataset.port;
                fillForm(game, host, port);
            });
        });
    }

    function fillForm(game, host, port) {
        // 切换到对应 Tab
        elements.tabs.forEach(tab => {
            if (tab.dataset.game === game) {
                tab.click();
            }
        });

        // 填充表单
        elements.hostInput.value = host;
        elements.portInput.value = port;

        // 滚动到表单
        elements.form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function renderResult(result) {
        currentResult = result;

        if (!result.online) {
            // 分析错误原因并给出友好提示
            let errorHint = '';
            const error = result.error || '';

            if (error.includes('ECONNREFUSED')) {
                errorHint = '💡 端口未开放或协议不匹配，请检查：<br>① 服务器是否已启动<br>② 端口号是否正确<br>③ 是否选择了正确的游戏类型';
            } else if (error.includes('timed out') || error.includes('timeout')) {
                errorHint = '⏱️ 连接超时，可能原因：<br>① 服务器防火墙限制了查询<br>② 网络延迟过高<br>③ 服务器未响应查询协议';
            } else if (error.includes('ENOTFOUND') || error.includes('getaddrinfo')) {
                errorHint = '🔍 无法解析域名，请检查：<br>① 服务器地址是否正确<br>② 域名是否已配置 DNS';
            } else {
                errorHint = '❌ 服务器未响应或不可达';
            }

            elements.resultContent.innerHTML = `
                <div class="gs-status">
                    <div class="gs-status-item">
                        <div class="gs-status-item__label">服务器状态</div>
                        <div class="gs-status-item__value gs-status-item__value--offline">离线</div>
                    </div>
                </div>
                <div style="margin-top: 16px; padding: 12px; background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; color: #92400E; font-size: 14px; line-height: 1.6;">
                    <div style="font-weight: 600; margin-bottom: 8px;">⚠️ 连接失败</div>
                    <div style="font-size: 13px; color: #78716C; margin-bottom: 8px;">${escapeHtml(error)}</div>
                    <div style="font-size: 13px;">${errorHint}</div>
                </div>
            `;
            elements.resultSection.style.display = 'block';
            return;
        }

        elements.resultContent.innerHTML = `
            <div class="gs-status">
                <div class="gs-status-item">
                    <div class="gs-status-item__label">服务器状态</div>
                    <div class="gs-status-item__value gs-status-item__value--online">在线</div>
                </div>
                <div class="gs-status-item">
                    <div class="gs-status-item__label">延迟</div>
                    <div class="gs-status-item__value">${escapeHtml(String(result.ping))} ms</div>
                </div>
                <div class="gs-status-item">
                    <div class="gs-status-item__label">在线玩家</div>
                    <div class="gs-status-item__value">${escapeHtml(String(result.players.current))} / ${escapeHtml(String(result.players.max))}</div>
                </div>
                ${result.version ? `
                <div class="gs-status-item">
                    <div class="gs-status-item__label">版本</div>
                    <div class="gs-status-item__value" style="font-size: 1rem;">${escapeHtml(result.version)}</div>
                </div>
                ` : ''}
            </div>
            ${result.name ? `
                <div style="margin-top: 16px; padding: 16px; background: rgba(255, 255, 255, 0.6); border-radius: 12px; border: 1px solid rgba(120, 113, 108, 0.1);">
                    <div style="font-size: 0.85rem; color: #78716C; margin-bottom: 4px;">服务器名称</div>
                    <div style="font-size: 1.1rem; font-weight: 600; color: #1E293B;">${escapeHtml(result.name)}</div>
                </div>
            ` : ''}
            ${result.players.list && result.players.list.length > 0 ? `
                <div class="gs-players-list">
                    <h4>在线玩家列表</h4>
                    <div class="gs-players-list__items">
                        ${result.players.list.map(p => `<span class="gs-player-tag">${escapeHtml(p)}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
        `;

        elements.resultSection.style.display = 'block';
        elements.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ===== API 调用 =====
    async function queryServer(game, host, port) {
        try {
            const response = await fetch(`${API_BASE}/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ game, host, port })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '查询失败');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Query failed:', error);
            throw error;
        }
    }

    async function fetchHistory(game, host, port, days = 7) {
        try {
            const params = new URLSearchParams({ days, port });
            const response = await fetch(`${API_BASE}/history/${game}/${host}?${params}`);

            if (!response.ok) {
                throw new Error('Failed to fetch history');
            }

            const data = await response.json();
            return data.records || [];
        } catch (error) {
            console.error('Fetch history failed:', error);
            return [];
        }
    }

    // ===== 图表渲染 =====
    function renderChart(records, days) {
        const ctx = elements.chartCanvas.getContext('2d');

        // 销毁旧图表
        if (historyChart) {
            historyChart.destroy();
        }

        if (records.length === 0) {
            ctx.clearRect(0, 0, elements.chartCanvas.width, elements.chartCanvas.height);
            ctx.fillStyle = '#78716C';
            ctx.font = '14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('暂无历史数据', elements.chartCanvas.width / 2, elements.chartCanvas.height / 2);
            return;
        }

        // 准备数据
        const labels = records.map(r => {
            const date = new Date(r.query_time);
            return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
        }).reverse();

        const playerData = records.map(r => r.players_online).reverse();
        const pingData = records.map(r => r.ping).reverse();

        // 主题颜色
        const isNight = document.body.classList.contains('night');
        const gridColor = isNight ? 'rgba(51, 65, 85, 0.5)' : 'rgba(120, 113, 108, 0.2)';
        const textColor = isNight ? '#94A3B8' : '#78716C';

        historyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '在线玩家',
                        data: playerData,
                        borderColor: '#F97316',
                        backgroundColor: 'rgba(249, 115, 22, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: '延迟 (ms)',
                        data: pingData,
                        borderColor: '#22D3EE',
                        backgroundColor: 'rgba(34, 211, 238, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        labels: {
                            color: textColor,
                            font: {
                                family: 'Inter, sans-serif'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: isNight ? 'rgba(248, 250, 252, 0.95)' : 'rgba(30, 41, 59, 0.95)',
                        titleColor: isNight ? '#1E293B' : '#F8FAFC',
                        bodyColor: isNight ? '#1E293B' : '#F8FAFC',
                        borderColor: gridColor,
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: gridColor
                        },
                        ticks: {
                            color: textColor,
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        grid: {
                            color: gridColor
                        },
                        ticks: {
                            color: textColor,
                            beginAtZero: true
                        },
                        title: {
                            display: true,
                            text: '玩家数',
                            color: textColor
                        }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            color: textColor,
                            beginAtZero: true
                        },
                        title: {
                            display: true,
                            text: '延迟 (ms)',
                            color: textColor
                        }
                    }
                }
            }
        });
    }

    // ===== 事件处理 =====
    // Tab 切换
    elements.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            elements.tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentGame = tab.dataset.game;
            elements.portInput.value = tab.dataset.port;
        });
    });

    // 服务器地址输入框：粘贴时自动分离 host:port
    elements.hostInput.addEventListener('paste', (e) => {
        setTimeout(() => {
            const value = elements.hostInput.value.trim();
            const match = value.match(/^(.+):(\d+)$/);
            if (match) {
                const [, host, port] = match;
                elements.hostInput.value = host;
                elements.portInput.value = port;
                showToast('已自动分离端口号');
            }
        }, 10);
    });

    // 表单提交
    elements.form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const host = elements.hostInput.value.trim();
        const port = parseInt(elements.portInput.value);

        if (!host) {
            showToast('请输入服务器地址');
            return;
        }

        if (isNaN(port) || port < 1 || port > 65535) {
            showToast('端口必须在 1-65535 之间');
            return;
        }

        // 禁用按钮
        elements.btnQuery.disabled = true;
        elements.btnQuery.innerHTML = '<span>查询中...</span>';

        try {
            const result = await queryServer(currentGame, host, port);
            renderResult(result);
            addHistory(currentGame, host, port);

            // 加载历史图表
            if (result.online) {
                const records = await fetchHistory(currentGame, host, port, 7);
                renderChart(records, 7);
            }

            showToast('查询完成');
        } catch (error) {
            showToast(error.message || '查询失败');
        } finally {
            elements.btnQuery.disabled = false;
            elements.btnQuery.innerHTML = '<span>查询状态</span>';
        }
    });

    // 收藏按钮
    elements.btnFavorite.addEventListener('click', () => {
        if (!currentResult) {
            showToast('请先查询服务器');
            return;
        }

        const name = currentResult.name || `${currentResult.host}:${currentResult.port}`;
        addFavorite(currentResult.game, currentResult.host, currentResult.port, name);
    });

    // 图表天数切换
    elements.chartControls.forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!currentResult) return;

            elements.chartControls.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const days = parseInt(btn.dataset.days);
            const records = await fetchHistory(currentResult.game, currentResult.host, currentResult.port, days);
            renderChart(records, days);
        });
    });

    // ===== 初始化 =====
    function init() {
        renderFavorites();
        renderHistory();
    }

    init();
})();

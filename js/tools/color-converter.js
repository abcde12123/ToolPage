// 夏夜工具集 - 色值转换工具 (ES5)

window.initColorConverter = function(container) {

    var recentColors = [];
    var STORAGE_KEY = 'cc_recent_colors';
    var skipUpdate = false;

    // 加载历史
    try {
        var stored = localStorage.getItem(STORAGE_KEY);
        if (stored) recentColors = JSON.parse(stored);
        if (!Array.isArray(recentColors)) recentColors = [];
    } catch (e) {
        recentColors = [];
    }

    // --- 构建 UI ---
    container.innerHTML =
        '<div class="cc-container">' +
            '<div class="cc-picker-row">' +
                '<div class="cc-swatch" id="ccSwatch" style="background:#a78bfa;"></div>' +
                '<input class="cc-color-input" id="ccPicker" type="color" value="#a78bfa" />' +
                '<div class="cc-fields">' +
                    '<div class="cc-field"><label>HEX</label><input id="ccHex" type="text" value="#a78bfa" /><button class="cc-copy-btn" data-copy="ccHex">复制</button></div>' +
                    '<div class="cc-field"><label>RGB</label><input id="ccRgb" type="text" value="rgb(167,139,250)" /><button class="cc-copy-btn" data-copy="ccRgb">复制</button></div>' +
                    '<div class="cc-field"><label>HSL</label><input id="ccHsl" type="text" value="hsl(255,91%,76%)" /><button class="cc-copy-btn" data-copy="ccHsl">复制</button></div>' +
                    '<div class="cc-field"><label>名称</label><input id="ccName" type="text" value="Medium Purple" readonly /><button class="cc-copy-btn" data-copy="ccName">复制</button></div>' +
                '</div>' +
            '</div>' +
            '<div>' +
                '<button class="cc-btn" id="ccRandom">&#x1F3B2; 随机颜色</button>' +
            '</div>' +
            '<div class="cc-recents" id="ccRecents">' +
                '<span class="cc-recents-label">&#x1F4C3; 最近:</span>' +
            '</div>' +
        '</div>';

    var swatch = document.getElementById('ccSwatch');
    var picker = document.getElementById('ccPicker');
    var hexInput = document.getElementById('ccHex');
    var rgbInput = document.getElementById('ccRgb');
    var hslInput = document.getElementById('ccHsl');
    var nameInput = document.getElementById('ccName');
    var randomBtn = document.getElementById('ccRandom');
    var recentsContainer = document.getElementById('ccRecents');

    // --- CSS 命名颜色映射（常用子集） ---
    var namedColors = {
        '#000000': 'Black', '#ffffff': 'White', '#ff0000': 'Red', '#00ff00': 'Lime',
        '#0000ff': 'Blue', '#ffff00': 'Yellow', '#ff00ff': 'Magenta', '#00ffff': 'Cyan',
        '#c0c0c0': 'Silver', '#808080': 'Gray', '#800000': 'Maroon', '#808000': 'Olive',
        '#008000': 'Green', '#800080': 'Purple', '#008080': 'Teal', '#000080': 'Navy',
        '#ff4500': 'OrangeRed', '#ff8c00': 'DarkOrange', '#ffa500': 'Orange',
        '#ffd700': 'Gold', '#ffffe0': 'LightYellow', '#fffacd': 'LemonChiffon',
        '#fafad2': 'LightGoldenrodYellow', '#ffe4b5': 'Moccasin', '#ffdead': 'NavajoWhite',
        '#f5deb3': 'Wheat', '#deb887': 'BurlyWood', '#d2b48c': 'Tan', '#bc8f8f': 'RosyBrown',
        '#a0522d': 'Sienna', '#8b4513': 'SaddleBrown', '#d2691e': 'Chocolate',
        '#cd853f': 'Peru', '#f4a460': 'SandyBrown', '#daa520': 'Goldenrod',
        '#b8860b': 'DarkGoldenrod', '#e9967a': 'DarkSalmon', '#fa8072': 'Salmon',
        '#ff6347': 'Tomato', '#ff7f50': 'Coral', '#ff6b6b': 'LightCoral',
        '#dc143c': 'Crimson', '#b22222': 'FireBrick', '#8b0000': 'DarkRed',
        '#ffc0cb': 'Pink', '#ffb6c1': 'LightPink', '#ff69b4': 'HotPink',
        '#ff1493': 'DeepPink', '#c71585': 'MediumVioletRed', '#db7093': 'PaleVioletRed',
        '#e6e6fa': 'Lavender', '#d8bfd8': 'Thistle', '#dda0dd': 'Plum',
        '#ee82ee': 'Violet', '#da70d6': 'Orchid', '#ba55d3': 'MediumOrchid',
        '#9932cc': 'DarkOrchid', '#9400d3': 'DarkViolet', '#8b008b': 'DarkMagenta',
        '#4b0082': 'Indigo', '#6a5acd': 'SlateBlue', '#483d8b': 'DarkSlateBlue',
        '#7b68ee': 'MediumSlateBlue', '#9370db': 'MediumPurple', '#8a2be2': 'BlueViolet',
        '#a78bfa': 'Medium Purple',
        '#f0f8ff': 'AliceBlue', '#f5f5dc': 'Beige', '#ffe4c4': 'Bisque',
        '#f0ffff': 'Azure', '#f0fff0': 'HoneyDew', '#e0ffff': 'LightCyan',
        '#f8f8ff': 'GhostWhite', '#fff5ee': 'SeaShell', '#fffaf0': 'FloralWhite',
        '#fffff0': 'Ivory', '#fdf5e6': 'OldLace', '#fff0f5': 'LavenderBlush',
        '#ffe4e1': 'MistyRose', '#faebd7': 'AntiqueWhite', '#ffefd5': 'PapayaWhip',
        '#ffebcd': 'BlanchedAlmond', '#ffe4e1': 'MistyRose',
        '#7fffd4': 'Aquamarine', '#00ffff': 'Cyan', '#e0ffff': 'LightCyan',
        '#f0ffff': 'Azure', '#00bfff': 'DeepSkyBlue', '#87ceeb': 'SkyBlue',
        '#87cefa': 'LightSkyBlue', '#b0c4de': 'LightSteelBlue', '#add8e6': 'LightBlue',
        '#b0e0e6': 'PowderBlue', '#00ced1': 'DarkTurquoise', '#20b2aa': 'LightSeaGreen',
        '#48d1cc': 'MediumTurquoise', '#40e0d0': 'Turquoise', '#008080': 'Teal',
        '#008b8b': 'DarkCyan', '#00fa9a': 'MediumSpringGreen', '#00ff7f': 'SpringGreen',
        '#3cb371': 'MediumSeaGreen', '#2e8b57': 'SeaGreen', '#228b22': 'ForestGreen',
        '#006400': 'DarkGreen', '#98fb98': 'PaleGreen', '#90ee90': 'LightGreen',
        '#32cd32': 'LimeGreen', '#7cfc00': 'LawnGreen', '#7fff00': 'Chartreuse',
        '#adff2f': 'GreenYellow', '#556b2f': 'DarkOliveGreen', '#6b8e23': 'OliveDrab',
        '#f5f5dc': 'Beige', '#f5f5f5': 'WhiteSmoke', '#dcdcdc': 'Gainsboro',
        '#d3d3d3': 'LightGray', '#c0c0c0': 'Silver', '#a9a9a9': 'DarkGray',
        '#808080': 'Gray', '#696969': 'DimGray', '#778899': 'LightSlateGray',
        '#708090': 'SlateGray', '#2f4f4f': 'DarkSlateGray', '#000000': 'Black'
    };

    // --- 辅助函数 ---
    function hexToRgb(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        var r = parseInt(hex.substring(0, 2), 16);
        var g = parseInt(hex.substring(2, 4), 16);
        var b = parseInt(hex.substring(4, 6), 16);
        if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
        return { r: r, g: g, b: b };
    }

    function rgbToHex(r, g, b) {
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;
        if (max === min) {
            h = s = 0;
        } else {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }

    function hslToRgb(h, s, l) {
        h /= 360; s /= 100; l /= 100;
        var r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            var hue2rgb = function(p, q, t) {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    function findColorName(hex) {
        var lower = hex.toLowerCase();
        if (namedColors[lower]) return namedColors[lower];
        // 找最接近的
        var rgb = hexToRgb(hex);
        if (!rgb) return '-';
        var minDist = Infinity;
        var closest = '-';
        for (var key in namedColors) {
            if (namedColors.hasOwnProperty(key)) {
                var crgb = hexToRgb(key);
                if (!crgb) continue;
                var dist = Math.sqrt(
                    Math.pow(rgb.r - crgb.r, 2) +
                    Math.pow(rgb.g - crgb.g, 2) +
                    Math.pow(rgb.b - crgb.b, 2)
                );
                if (dist < minDist) {
                    minDist = dist;
                    closest = namedColors[key];
                }
            }
        }
        return minDist < 50 ? closest : '-';
    }

    // --- 更新所有字段 ---
    function updateFromHex(hex) {
        if (skipUpdate) return;
        skipUpdate = true;

        // 规范化 hex
        if (hex.indexOf('#') !== 0) hex = '#' + hex;
        if (hex.length === 4) {
            hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }

        var rgb = hexToRgb(hex);
        if (!rgb) {
            skipUpdate = false;
            return;
        }

        var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        var name = findColorName(hex);

        // 更新 UI
        swatch.style.background = hex;
        picker.value = hex;
        hexInput.value = hex.toUpperCase();
        rgbInput.value = 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')';
        hslInput.value = 'hsl(' + hsl.h + ',' + hsl.s + '%,' + hsl.l + '%)';
        nameInput.value = name;

        skipUpdate = false;
    }

    // --- 解析 RGB 字符串 ---
    function parseRgb(str) {
        str = str.replace(/\s/g, '');
        var match = str.match(/^rgb\((\d+),(\d+),(\d+)\)$/);
        if (!match) return null;
        var r = parseInt(match[1], 10);
        var g = parseInt(match[2], 10);
        var b = parseInt(match[3], 10);
        if (r > 255 || g > 255 || b > 255) return null;
        return { r: r, g: g, b: b };
    }

    // --- 解析 HSL 字符串 ---
    function parseHsl(str) {
        str = str.replace(/\s/g, '');
        var match = str.match(/^hsl\((\d+),(\d+)%,(\d+)%\)$/);
        if (!match) {
            match = str.match(/^hsl\((\d+),(\d+),(\d+)\)$/);
            if (!match) return null;
        }
        var h = parseInt(match[1], 10);
        var s = parseInt(match[2], 10);
        var l = parseInt(match[3], 10);
        if (h > 360 || s > 100 || l > 100) return null;
        return { h: h, s: s, l: l };
    }

    // --- 历史颜色 ---
    function addRecent(hex) {
        var upper = hex.toUpperCase();
        // 去重
        var idx = -1;
        for (var i = 0; i < recentColors.length; i++) {
            if (recentColors[i].toUpperCase() === upper) {
                idx = i;
                break;
            }
        }
        if (idx !== -1) {
            recentColors.splice(idx, 1);
        }
        recentColors.unshift(upper);
        if (recentColors.length > 12) {
            recentColors.pop();
        }
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(recentColors));
        } catch (e) {}

        renderRecents();
    }

    function renderRecents() {
        // 移除旧的色块（保留 label）
        recentsContainer.querySelectorAll('.cc-recent-color').forEach(function(el) {
            el.parentNode.removeChild(el);
        });

        recentColors.forEach(function(c) {
            var dot = document.createElement('span');
            dot.className = 'cc-recent-color';
            dot.style.background = c;
            dot.title = c;
            dot.addEventListener('click', function() {
                updateFromHex(c);
                addRecent(c);
            });
            recentsContainer.appendChild(dot);
        });
    }

    // --- 事件绑定 ---
    picker.addEventListener('input', function() {
        updateFromHex(picker.value);
    });

    hexInput.addEventListener('change', function() {
        var val = hexInput.value.trim();
        if (val && val[0] !== '#') val = '#' + val;
        var rgb = hexToRgb(val);
        if (rgb) {
            updateFromHex(val);
            addRecent(val);
        }
    });

    rgbInput.addEventListener('change', function() {
        var rgb = parseRgb(rgbInput.value.trim());
        if (rgb) {
            var hex = rgbToHex(rgb.r, rgb.g, rgb.b);
            updateFromHex(hex);
            addRecent(hex);
        }
    });

    hslInput.addEventListener('change', function() {
        var hsl = parseHsl(hslInput.value.trim());
        if (hsl) {
            var rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
            var hex = rgbToHex(rgb.r, rgb.g, rgb.b);
            updateFromHex(hex);
            addRecent(hex);
        }
    });

    // 复制按钮
    container.querySelectorAll('.cc-copy-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var targetId = btn.getAttribute('data-copy');
            var target = document.getElementById(targetId);
            if (target) {
                copyToClipboard(target.value);
            }
        });
    });

    // 随机颜色
    randomBtn.addEventListener('click', function() {
        var r = Math.floor(Math.random() * 256);
        var g = Math.floor(Math.random() * 256);
        var b = Math.floor(Math.random() * 256);
        var hex = rgbToHex(r, g, b);
        updateFromHex(hex);
        addRecent(hex);
    });

    // 初始化
    renderRecents();
};

/**
 * AR 贴纸素材：像素画直接在 canvas 上生成（不额外请求图片文件）。
 * 与桌面版同一套图案与配色；按**整数倍**放大，避免像素块大小不均。
 */

const PATTERNS = {
    heart: [
        '..XX...XX..',
        '.XooX.XXXX.',
        'XooXXXXXXXX',
        'XoXXXXXXXXX',
        'XXXXXXXXXXX',
        '.XXXXXXXXX.',
        '..XXXXXXX..',
        '...XXXXX...',
        '....XXX....',
        '.....X.....',
    ],
    star: [
        '.....X.....',
        '.....X.....',
        '....XXX....',
        '....XXX....',
        'XXXXXXXXXXX',
        '.XXXXXXXXX.',
        '..XXXXXXX..',
        '..XXXXXXX..',
        '.XXX...XXX.',
        '.XX.....XX.',
    ],
    crown: [
        'X.........X',
        'XX.......XX',
        'XXX.....XXX',
        'XXXXXXXXXXX',
        'XXXXXXXXXXX',
        'XoXXXXXXXoX',
        'XXXXXXXXXXX',
        '.XXXXXXXXX.',
    ],
    cat_ears: [
        'XX.........XX',
        'XXXX.....XXXX',
        'XooXX...XXooX',
        'XooXXXXXXXooX',
        'XXXXXXXXXXXXX',
        'XXXXXXXXXXXXX',
    ],
    glasses: [
        '.XXXXXXXXXXXXX.',
        'XhhooX...XoohhX',
        'XooooXXXXXooooX',
        'XooooX...XooooX',
        '.XXXXXXXXXXXXX.',
        '..XX.......XX..',
    ],
    sparkle: [
        '.....X.....',
        '.....X.....',
        '....XXX....',
        '.X..XXX..X.',
        '..XXXXXXX..',
        '...XXXXX...',
        '..XXXXXXX..',
        '.X..XXX..X.',
        '....XXX....',
        '.....X.....',
        '.....X.....',
    ],
};

// 调色板（RGB）
const PALETTES = {
    heart: { X: [240, 70, 80], o: [255, 175, 170] },
    star: { X: [255, 205, 40], o: [255, 240, 150] },
    crown: { X: [250, 190, 30], o: [70, 70, 200] },
    cat_ears: { X: [68, 58, 58], o: [235, 158, 168] },
    glasses: { X: [32, 26, 26], o: [188, 62, 78], h: [240, 220, 205] },
    sparkle: { X: [255, 255, 255], o: [140, 235, 255] },
};

/** 默认摆放（面部单位：1 = 眼距；u 右正、v 上正）与尺寸 */
export const DEFAULT_PLACEMENT = {
    heart: [[0, 1.30], 0.55],
    star: [[-1.14, 0.98], 0.48],
    sparkle: [[1.14, 0.98], 0.45],
    crown: [[0, 1.27], 0.93],
    cat_ears: [[0, 1.20], 1.31],
    glasses: [[0, 0.42], 1.55],
};

export const STICKER_LABELS = {
    heart: '爱心', star: '星星', crown: '皇冠',
    cat_ears: '猫耳', glasses: '墨镜', sparkle: '闪光',
};

const TARGET = 256;

function renderSticker(rows, palette) {
    const h = rows.length, w = rows[0].length;
    const side = Math.max(h, w);
    const oy = (side - h) >> 1, ox = (side - w) >> 1;
    // 先画到 (side+2) 的小画布（四周留 1 像素透明边）
    const small = document.createElement('canvas');
    small.width = side + 2; small.height = side + 2;
    const sctx = small.getContext('2d');
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const c = palette[rows[y][x]];
            if (!c) continue;
            sctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
            sctx.fillRect(x + ox + 1, y + oy + 1, 1, 1);
        }
    }
    // 整数倍放大（避免像素块大小不均，看起来像"图案损坏"）
    const factor = Math.max(1, Math.floor(TARGET / small.width));
    const out = document.createElement('canvas');
    out.width = small.width * factor;
    out.height = small.height * factor;
    const octx = out.getContext('2d');
    octx.imageSmoothingEnabled = false;
    octx.drawImage(small, 0, 0, out.width, out.height);
    return out;
}

let _cache = null;
/** 生成全部内置贴纸（首次调用时生成并缓存） */
export function builtinStickers() {
    if (_cache) return _cache;
    _cache = {};
    for (const name of Object.keys(PATTERNS)) {
        _cache[name] = {
            name,
            label: STICKER_LABELS[name],
            img: renderSticker(PATTERNS[name], PALETTES[name]),
            placement: DEFAULT_PLACEMENT[name],
        };
    }
    return _cache;
}

let _customSeq = 0;
/** 载入自定义图片为贴纸 */
export function loadCustomSticker(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            _customSeq += 1;
            resolve({
                name: `custom_${_customSeq}`,
                label: file.name.replace(/\.[^.]+$/, '').slice(0, 12),
                img,
                placement: [[0, 1.30], 0.55],
            });
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片加载失败')); };
        img.src = url;
    });
}

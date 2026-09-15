/**
 * 夏夜美颜相机 · 图像处理基础库
 * 全部基于 TypedArray 手写实现，避免任何第三方依赖。
 * 坐标约定：图像数据为 Uint8ClampedArray，RGBA 排列（与 canvas ImageData 一致）。
 */

/** 单通道浮点图 */
export function f32(n) { return new Float32Array(n); }

/** 把 RGBA 图像转成灰度（BT.601 亮度），返回 Float32Array */
export function toGray(rgba, n) {
    const g = new Float32Array(n);
    for (let i = 0, p = 0; i < n; i++, p += 4) {
        g[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
    }
    return g;
}

/** 积分图（用于 O(1) 盒式滤波）：宽高 +1 */
export function integral(src, w, h) {
    // Float32 足够（8bit 数据），内存带宽减半、明显更快
    const sat = new Float32Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
        let rowSum = 0;
        const sOff = (y + 1) * (w + 1), pOff = (y + 1) * (w + 1) - (w + 1), srcOff = y * w;
        for (let x = 0; x < w; x++) {
            rowSum += src[srcOff + x];
            sat[sOff + x + 1] = sat[pOff + x + 1] + rowSum;
        }
    }
    return sat;
}

/**
 * 盒式滤波（用积分图实现，O(1)/像素）。
 * @param {Float32Array} src 输入
 * @param {number} r 半径
 * @param {Float32Array} [dst] 输出
 */
export function boxFilter(src, w, h, r, dst) {
    const sat = integral(src, w, h);
    const out = dst || new Float32Array(w * h);
    const stride = w + 1;
    for (let y = 0; y < h; y++) {
        const y0 = Math.max(y - r, 0), y1 = Math.min(y + r + 1, h);
        const aOff = y0 * stride, bOff = y1 * stride;
        for (let x = 0; x < w; x++) {
            const x0 = Math.max(x - r, 0), x1 = Math.min(x + r + 1, w);
            const sum = sat[bOff + x1] - sat[aOff + x1] - sat[bOff + x0] + sat[aOff + x0];
            out[y * w + x] = sum / ((x1 - x0) * (y1 - y0));
        }
    }
    return out;
}

/**
 * 三次盒式滤波近似高斯（可分离 + 滑动求和，非常快）。
 * sigma 与盒半径的关系：r ≈ sigma * sqrt(3 * n / 4)，n=3 时 r ≈ 1.5*sigma
 */
export function blur(src, w, h, sigma, dst) {
    const out = dst || new Float32Array(w * h);
    if (sigma <= 0) { out.set(src); return out; }
    const r = Math.max(1, Math.round(sigma * 1.5));
    boxFilter(src, w, h, r, out);
    boxFilter(out, w, h, r, out);
    return out;
}

/**
 * 引导滤波（He et al. ECCV 2010）——磨皮核心，保边平滑。
 * guide/src 均为 Float32Array 灰度；eps 越大越平滑。
 */
export function guidedFilter(guide, src, w, h, r, eps) {
    const meanI = boxFilter(guide, w, h, r);
    const ii = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) ii[i] = guide[i] * guide[i];
    const meanII = boxFilter(ii, w, h, r);

    const ip = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) ip[i] = guide[i] * src[i];
    const meanIP = boxFilter(ip, w, h, r);

    const a = new Float32Array(w * h), b = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
        const varI = meanII[i] - meanI[i] * meanI[i];
        const covIP = meanIP[i] - meanI[i] * src[i] === 0 ? 0 : meanIP[i] - meanI[i] * src[i];
        a[i] = covIP / (varI + eps);
        b[i] = src[i] - a[i] * guide[i];
    }
    const meanA = boxFilter(a, w, h, r), meanB = boxFilter(b, w, h, r);
    const out = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) out[i] = meanA[i] * guide[i] + meanB[i];
    return out;
}

/** 图像按比例缩放（双线性，RGBA -> RGBA），用于降采样提速 */
export function resizeRGBA(src, sw, sh, dw, dh) {
    const out = new Uint8ClampedArray(dw * dh * 4);
    const xs = sw / dw, ys = sh / dh;
    for (let y = 0; y < dh; y++) {
        const sy = Math.min((y + 0.5) * ys - 0.5, sh - 1);
        const y0 = Math.max(0, Math.floor(sy)), y1 = Math.min(y0 + 1, sh - 1);
        const wy = sy - y0;
        for (let x = 0; x < dw; x++) {
            const sx = Math.min((x + 0.5) * xs - 0.5, sw - 1);
            const x0 = Math.max(0, Math.floor(sx)), x1 = Math.min(x0 + 1, sw - 1);
            const wx = sx - x0;
            const o = (y * dw + x) * 4;
            for (let c = 0; c < 4; c++) {
                const p00 = src[(y0 * sw + x0) * 4 + c], p01 = src[(y0 * sw + x1) * 4 + c];
                const p10 = src[(y1 * sw + x0) * 4 + c], p11 = src[(y1 * sw + x1) * 4 + c];
                out[o + c] = (p00 * (1 - wx) + p01 * wx) * (1 - wy) + (p10 * (1 - wx) + p11 * wx) * wy;
            }
        }
    }
    return out;
}

/**
 * 距离变换（两遍倒角算法，3-4 近似欧氏距离）。
 * 输入 0/1 掩膜，返回每个前景像素到最近背景的距离。
 */
export function distanceTransform(mask, w, h) {
    const INF = 1e9;
    const d = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) d[i] = mask[i] > 0 ? INF : 0;
    const D1 = 1, D2 = 1.41421356;
    // 前向
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * w + x;
            if (d[i] === 0) continue;
            let v = d[i];
            if (x > 0) v = Math.min(v, d[i - 1] + D1);
            if (y > 0) {
                v = Math.min(v, d[i - w] + D1);
                if (x > 0) v = Math.min(v, d[i - w - 1] + D2);
                if (x < w - 1) v = Math.min(v, d[i - w + 1] + D2);
            }
            d[i] = v;
        }
    }
    // 反向
    for (let y = h - 1; y >= 0; y--) {
        for (let x = w - 1; x >= 0; x--) {
            const i = y * w + x;
            if (d[i] === 0) continue;
            let v = d[i];
            if (x < w - 1) v = Math.min(v, d[i + 1] + D1);
            if (y < h - 1) {
                v = Math.min(v, d[i + w] + D1);
                if (x < w - 1) v = Math.min(v, d[i + w + 1] + D2);
                if (x > 0) v = Math.min(v, d[i + w - 1] + D2);
            }
            d[i] = v;
        }
    }
    return d;
}

/** 归一化色度（光照不变）用到的辅助：把 RGB 转成归一化分量 */
export function normalizedRGB(r, g, b) {
    const s = r + g + b + 1e-6;
    return [r / s, g / s, b / s];
}

/** 逐像素双线性重映射（RGBA -> RGBA），mapX/mapY 为源坐标 */
export function remapRGBA(src, sw, sh, mapX, mapY, dw, dh) {
    const out = new Uint8ClampedArray(dw * dh * 4);
    for (let y = 0; y < dh; y++) {
        for (let x = 0; x < dw; x++) {
            const i = y * dw + x;
            let sx = mapX[i], sy = mapY[i];
            sx = sx < 0 ? 0 : (sx > sw - 1.001 ? sw - 1.001 : sx);
            sy = sy < 0 ? 0 : (sy > sh - 1.001 ? sh - 1.001 : sy);
            const x0 = sx | 0, y0 = sy | 0;
            const fx = sx - x0, fy = sy - y0;
            const o = i * 4;
            for (let c = 0; c < 4; c++) {
                const p00 = src[(y0 * sw + x0) * 4 + c];
                const p01 = src[(y0 * sw + x0 + 1) * 4 + c];
                const p10 = src[((y0 + 1) * sw + x0) * 4 + c];
                const p11 = src[((y0 + 1) * sw + x0 + 1) * 4 + c];
                out[o + c] = (p00 * (1 - fx) + p01 * fx) * (1 - fy) + (p10 * (1 - fx) + p11 * fx) * fy;
            }
        }
    }
    return out;
}

/** 生成 256 级 LUT（单通道） */
export function lut256(fn) {
    const t = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) t[i] = fn(i);
    return t;
}

/** 对 RGBA 应用三个通道的 LUT（原地或输出到 dst） */
export function applyLUT3(rgba, lutR, lutG, lutB, dst) {
    const out = dst || rgba;
    for (let p = 0; p < rgba.length; p += 4) {
        out[p] = lutR[rgba[p]];
        out[p + 1] = lutG[rgba[p + 1]];
        out[p + 2] = lutB[rgba[p + 2]];
        out[p + 3] = rgba[p + 3];
    }
    return out;
}

export function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

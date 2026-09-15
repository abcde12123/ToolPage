/**
 * 夏夜美颜相机 · 美颜效果
 * 桌面版 Python 算法的浏览器移植：磨皮 / 美白 / 瘦脸 / 大眼 / 红润 / 滤镜 / 皮肤权重图
 *
 * 性能策略与桌面版一致：
 *   1) 计算限制在「人脸外接框」内，框外不动；
 *   2) 皮肤权重图在半分辨率上算，再上采样；
 *   3) 颜色映射能用 LUT 的都用 LUT；
 *   4) 盒式滤波走积分图，O(1)/像素。
 */
import { blur, boxFilter, clamp, distanceTransform, lut256 } from './imageops.js?v=6';

// ---------------------------------------------------------------- 关键点索引

const LEFT_EYE = [33, 133, 159, 145, 153, 144];
const RIGHT_EYE = [362, 263, 386, 374, 380, 373];
const LEFT_BROW = [70, 63, 105, 66, 107];
const RIGHT_BROW = [300, 293, 334, 296, 336];
const LIPS = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];
const JAW = [234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152,
    454, 323, 361, 288, 397, 365, 379, 378, 400, 377];
const CHEEK_L = [50, 101, 118, 117, 123];
const CHEEK_R = [280, 330, 347, 346, 352];
const NOSE_TIP = 1;
const CHIN = 152;
// 下颚推动点集合（JAW 里本来就含 CHIN，去重后提为常量，避免每帧每脸重建 Set）
const JAW_CHIN = [...new Set([...JAW, CHIN])];

/** 需要整块保护的特征区域（左右分开，凸包才不会横跨脸中间） */
const FEATURE_GROUPS = [LEFT_EYE, RIGHT_EYE, LEFT_BROW, RIGHT_BROW, LIPS];

// ---------------------------------------------------------------- 基础工具

const _canvas = document.createElement('canvas');
const _ctx = _canvas.getContext('2d', { willReadFrequently: true });

function ensureCanvas(w, h) {
    if (_canvas.width !== w || _canvas.height !== h) { _canvas.width = w; _canvas.height = h; }
}

/** 所有人脸外接框（含边距），夹取到画面内 */
export function faceRoi(faces, w, h, margin = 0.25) {
    if (!faces || !faces.length) return { x: 0, y: 0, w, h };
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const f of faces) {
        const [bx, by, bw, bh] = f.bbox;
        x0 = Math.min(x0, bx); y0 = Math.min(y0, by);
        x1 = Math.max(x1, bx + bw); y1 = Math.max(y1, by + bh);
    }
    const mx = (x1 - x0) * margin, my = (y1 - y0) * margin;
    const X0 = clamp(Math.floor(x0 - mx), 0, w), Y0 = clamp(Math.floor(y0 - my), 0, h);
    const X1 = clamp(Math.ceil(x1 + mx), 0, w), Y1 = clamp(Math.ceil(y1 + my), 0, h);
    // 人脸框完全落在画面外时，X0 可能等于 w，此时 x=w、w=1 会越出右边界一行，
    // 这里再夹一次（正常路径 X0<X1<=w，结果不变）
    const rx = Math.min(X0, Math.max(0, w - 1));
    const ry = Math.min(Y0, Math.max(0, h - 1));
    return { x: rx, y: ry, w: Math.max(1, X1 - rx), h: Math.max(1, Y1 - ry) };
}

/** 凸包（Andrew monotone chain），输入扁平 [x0,y0,x1,y1,...] */
export function convexHull(pts) {
    const n = pts.length / 2;
    const idx = Array.from({ length: n }, (_, i) => i);
    idx.sort((a, b) => (pts[a * 2] - pts[b * 2]) || (pts[a * 2 + 1] - pts[b * 2 + 1]));
    const cross = (o, a, b) =>
        (pts[a * 2] - pts[o * 2]) * (pts[b * 2 + 1] - pts[o * 2 + 1]) -
        (pts[a * 2 + 1] - pts[o * 2 + 1]) * (pts[b * 2] - pts[o * 2]);
    const lower = [], upper = [];
    for (const i of idx) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], i) <= 0) lower.pop();
        lower.push(i);
    }
    for (let k = idx.length - 1; k >= 0; k--) {
        const i = idx[k];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], i) <= 0) upper.pop();
        upper.push(i);
    }
    lower.pop(); upper.pop();
    const hull = lower.concat(upper);
    const out = new Float32Array(hull.length * 2);
    for (let i = 0; i < hull.length; i++) { out[i * 2] = pts[hull[i] * 2]; out[i * 2 + 1] = pts[hull[i] * 2 + 1]; }
    return out;
}

function meanPoint(lm, indices) {
    let sx = 0, sy = 0;
    for (const i of indices) { sx += lm[i * 2]; sy += lm[i * 2 + 1]; }
    return [sx / indices.length, sy / indices.length];
}

/** 把一组关键点转成 Path2D 多边形（可缩放/平移） */
function groupPath(lm, group, scale, ox, oy) {
    const p = new Path2D();
    const pts = new Float32Array(group.length * 2);
    for (let i = 0; i < group.length; i++) {
        pts[i * 2] = lm[group[i] * 2] * scale + ox;
        pts[i * 2 + 1] = lm[group[i] * 2 + 1] * scale + oy;
    }
    const hull = convexHull(pts);
    if (hull.length < 6) return null;
    p.moveTo(hull[0], hull[1]);
    for (let i = 2; i < hull.length; i += 2) p.lineTo(hull[i], hull[i + 1]);
    p.closePath();
    return p;
}

// ---------------------------------------------------------------- 皮肤权重图

const SKIN_SCALE = 0.5;

/**
 * 计算软皮肤权重图（ROI 的 1/2 分辨率）。
 * 归一化色度（光照不变）+ 饱和度兜底 + 相对暗度 + 纯黑门槛 + 脸部凸包（挖眼眉唇）+ 边缘淡出。
 */
export function computeSkinAlpha(frameSource, roi, faces, params) {
    const s = SKIN_SCALE;
    const mw = Math.max(2, Math.round(roi.w * s));
    const mh = Math.max(2, Math.round(roi.h * s));
    ensureCanvas(mw, mh);
    _ctx.clearRect(0, 0, mw, mh);
    _ctx.drawImage(frameSource, roi.x, roi.y, roi.w, roi.h, 0, 0, mw, mh);
    const px = _ctx.getImageData(0, 0, mw, mh).data;

    const n = mw * mh;
    const score = new Float32Array(n);
    const lum = new Float32Array(n);

    for (let i = 0, p = 0; i < n; i++, p += 4) {
        const r = px[p], g = px[p + 1], b = px[p + 2];
        const sum = r + g + b + 1e-6;
        const nr = r / sum, ng = g / sum, nb = b / sum;
        const bandR = clamp((nr - 0.34) / 0.035, 0, 1) * clamp((0.52 - nr) / 0.035, 0, 1);
        const bandG = clamp((ng - 0.25) / 0.035, 0, 1) * clamp((0.38 - ng) / 0.035, 0, 1);
        const y = 0.299 * r + 0.587 * g + 0.114 * b;
        lum[i] = y;
        const spread = Math.max(nr, ng, nb) - Math.min(nr, ng, nb);
        const saturated = clamp((spread - 0.03) / 0.03, 0, 1);       // 灰/黑发近中性 -> 排除
        const highlight = clamp((y - 150) / 40, 0, 1);               // 皮肤高光豁免
        score[i] = bandR * bandG * Math.max(saturated, highlight);
    }

    // 相对暗度：阴影（局部平均同样偏暗 → 保留）vs 毛发（比周围暗得多 → 剔除）
    const k = Math.max(Math.round(mw * 0.15), 5) | 1;
    const localMean = boxFilter(lum, mw, mh, (k - 1) >> 1);
    const relLo = 0.80 - 0.30 * clamp(params.skin_shadow, 0, 1);
    const darkFloor = clamp(params.skin_dark, 0, 80);
    for (let i = 0; i < n; i++) {
        const rel = lum[i] / (localMean[i] + 1e-3);
        score[i] *= clamp((rel - relLo) / 0.15, 0, 1);
        score[i] *= clamp((lum[i] - darkFloor) / 15, 0, 1);
    }

    let faceW = 0;
    if (faces && faces.length) {
        const ox = -roi.x * s, oy = -roi.y * s;

        // ① 脸部凸包 -> 距离变换 -> 边缘淡出
        ensureCanvas(mw, mh);
        _ctx.clearRect(0, 0, mw, mh);
        _ctx.fillStyle = '#fff';
        const facePath = new Path2D();
        let minX = 1e9, maxX = -1e9;
        for (const f of faces) {
            if (!f.landmarks) continue;
            const lm = f.landmarks;
            const pts = new Float32Array(lm.length);
            for (let i = 0; i < lm.length / 2; i++) {
                const x = lm[i * 2] * s + ox, y = lm[i * 2 + 1] * s + oy;
                pts[i * 2] = x; pts[i * 2 + 1] = y;
                if (x < minX) minX = x; if (x > maxX) maxX = x;
            }
            const hull = convexHull(pts);
            facePath.moveTo(hull[0], hull[1]);
            for (let i = 2; i < hull.length; i += 2) facePath.lineTo(hull[i], hull[i + 1]);
            facePath.closePath();
            faceW = Math.max(faceW, f.bbox[2]);
        }
        if (isFinite(minX)) {
            _ctx.fill(facePath);
            const regionPx = _ctx.getImageData(0, 0, mw, mh).data;
            const mask = new Uint8Array(n);
            for (let i = 0, p = 3; i < n; i++, p += 4) mask[i] = regionPx[p] > 128 ? 1 : 0;
            const dist = distanceTransform(mask, mw, mh);
            const rampPx = Math.max((0.02 + 0.33 * clamp(params.skin_ramp, 0, 1)) * faceW * s, 1.5);
            for (let i = 0; i < n; i++) score[i] *= clamp(dist[i] / rampPx, 0, 1);

            // ② 挖掉眼/眉/唇（小核羽化，避免细小暗部被糊回来）
            _ctx.clearRect(0, 0, mw, mh);
            _ctx.fillStyle = '#fff';
            let featPath = null;
            for (const f of faces) {
                if (!f.landmarks) continue;
                for (const group of FEATURE_GROUPS) {
                    const p = groupPath(f.landmarks, group, s, ox, oy);
                    if (!p) continue;
                    featPath = featPath || new Path2D();
                    featPath.addPath(p);
                }
            }
            if (featPath) {
                _ctx.fill(featPath);
                const fpx = _ctx.getImageData(0, 0, mw, mh).data;
                const fm = new Float32Array(n);
                for (let i = 0, p = 3; i < n; i++, p += 4) fm[i] = fpx[p] > 128 ? 1 : 0;
                blur(fm, mw, mh, Math.max(faceW * s * 0.02, 0.8), fm);
                for (let i = 0; i < n; i++) score[i] *= 1 - clamp(fm[i], 0, 1);
            }
        }
    }

    // 参数是全分辨率口径，掩膜是半分辨率，故 /2
    const feather = clamp(params.skin_feather === undefined ? 1.5 : params.skin_feather, 0, 8) / 2;
    if (feather > 0) blur(score, mw, mh, Math.max(feather, 0.5), score);

    // 一次性上采样到 ROI 分辨率返回：后续所有效果即可「按下标直取」，
    // 省掉每个像素一次双线性采样的函数调用（这一步省下非常可观的开销）。
    const rw = roi.w, rh = roi.h;
    const full = new Float32Array(rw * rh);
    const kx = mw / rw, ky = mh / rh;
    for (let y = 0; y < rh; y++) {
        const sy = Math.min(Math.max((y + 0.5) * ky - 0.5, 0), mh - 1.001);
        const y0 = sy | 0, dy = sy - y0;
        const r0 = y0 * mw, r1 = r0 + mw;
        for (let x = 0; x < rw; x++) {
            const sx = Math.min(Math.max((x + 0.5) * kx - 0.5, 0), mw - 1.001);
            const x0 = sx | 0, dx = sx - x0;
            const top = score[r0 + x0] * (1 - dx) + score[r0 + x0 + 1] * dx;
            const bot = score[r1 + x0] * (1 - dx) + score[r1 + x0 + 1] * dx;
            full[y * rw + x] = Math.min(Math.max(top * (1 - dy) + bot * dy, 0), 1);
        }
    }
    return { data: full, w: rw, h: rh, x: roi.x, y: roi.y, scale: 1 };
}

/** 按全分辨率坐标在权重图上取值（已是 ROI 分辨率，直接下标访问） */
export function sampleAlpha(sk, fx, fy) {
    // 用 floor 而不是 |0：|0 对 (-1,0) 的负数会向零截断成 0，
    // 导致 ROI 左/上外沿 0~1px 的亚像素坐标取到第 0 列而不是返回 0。
    // 对整数输入二者结果相同，正常路径不受影响。
    const x = Math.floor(fx - sk.x), y = Math.floor(fy - sk.y);
    if (x < 0 || y < 0 || x >= sk.w || y >= sk.h) return 0;
    return sk.data[y * sk.w + x];
}

// 指数函数的查表近似（热循环里 Math.exp 太慢，误差 < 0.1%）
const EXP_N = 128, EXP_MAX = 5.0;
const EXP_LUT = new Float32Array(EXP_N + 1);
for (let i = 0; i <= EXP_N; i++) EXP_LUT[i] = Math.exp(-EXP_MAX * i / EXP_N);
function fastExp(x) {
    if (x <= 0) return 1;
    if (x >= EXP_MAX) return 0;
    const t = x * (EXP_N / EXP_MAX);
    const i = t | 0;
    return EXP_LUT[i] + (EXP_LUT[i + 1] - EXP_LUT[i]) * (t - i);
}

// ---------------------------------------------------------------- 磨皮

export function applySmooth(imgData, sk, params) {
    const strength = clamp(params.smooth, 0, 1);
    if (strength <= 0) return;
    const { width: w, height: h, data } = imgData;
    // 引导滤波求的是「低频层」，本身极平滑，用 1/3 分辨率足够，
    // 高频细节来自原图（高反差保留那一步），因此观感几乎无差别但快一倍以上。
    const s = 0.33;
    const rw = Math.max(2, Math.round(w * s)), rh = Math.max(2, Math.round(h * s));

    // 全图降采样到 1/2（面积小，很快）
    ensureCanvas(rw, rh);
    _ctx.clearRect(0, 0, rw, rh);
    _ctx.drawImage(_srcCanvasOf(imgData, w, h), 0, 0, w, h, 0, 0, rw, rh);
    const small = _ctx.getImageData(0, 0, rw, rh).data;

    const n = rw * rh;
    const guide = new Float32Array(n);
    for (let i = 0, p = 0; i < n; i++, p += 4) {
        guide[i] = 0.299 * small[p] + 0.587 * small[p + 1] + 0.114 * small[p + 2];
    }
    const radius = Math.round(clamp(params.smooth_radius, 2, 20));
    const eps = 120 + (clamp(params.smooth_eps, 100, 2000) - 120) * strength;
    const keep = 1 - (1 - clamp(params.smooth_keep, 0, 1)) * strength;
    const meanI = boxFilter(guide, rw, rh, radius);
    const ii = new Float32Array(n);
    for (let i = 0; i < n; i++) ii[i] = guide[i] * guide[i];
    const meanII = boxFilter(ii, rw, rh, radius);
    const varI = new Float32Array(n);
    for (let i = 0; i < n; i++) varI[i] = meanII[i] - meanI[i] * meanI[i];

    const out = new Float32Array(n * 3);
    const tmpA = new Float32Array(n), tmpB = new Float32Array(n);
    for (let c = 0; c < 3; c++) {
        const p = new Float32Array(n);
        for (let i = 0, q = c; i < n; i++, q += 4) p[i] = small[q];
        const meanP = boxFilter(p, rw, rh, radius);
        const ip = new Float32Array(n);
        for (let i = 0; i < n; i++) ip[i] = guide[i] * p[i];
        const meanIP = boxFilter(ip, rw, rh, radius);
        for (let i = 0; i < n; i++) {
            const cov = meanIP[i] - meanI[i] * meanP[i];
            const a = cov / (varI[i] + eps);
            tmpA[i] = a;
            tmpB[i] = meanP[i] - a * meanI[i];
        }
        // 引导滤波定义里 mean(a)/mean(b) 就是「同半径的均值滤波」，
        // 不是再叠一次高斯——这样既正确又快很多
        const meanA = boxFilter(tmpA, rw, rh, radius);
        const meanB = boxFilter(tmpB, rw, rh, radius);
        for (let i = 0; i < n; i++) {
            const base = meanA[i] * guide[i] + meanB[i];
            const v = base + (p[i] - base) * keep;              // 高反差保留
            out[i * 3 + c] = v < 0 ? 0 : (v > 255 ? 255 : v);
        }
    }

    // 上采样回原图，只在皮肤区域混合（框外 alpha 恒为 0，无需遍历整幅画面）
    const bx0 = sk.x, bx1 = sk.x + sk.w, by0 = sk.y, by1 = sk.y + sk.h;
    for (let y = by0; y < by1; y++) {
        const sy = clamp(y * s, 0, rh - 1.001);
        const y0 = sy | 0, dy = sy - y0;
        const arow = (y - sk.y) * sk.w;
        for (let x = bx0; x < bx1; x++) {
            const alpha = sk.data[arow + (x - sk.x)] * strength;
            if (alpha <= 0.002) continue;
            const sx = clamp(x * s, 0, rw - 1.001);
            const x0 = sx | 0, dx = sx - x0;
            const o = (y * w + x) * 4;
            for (let c = 0; c < 3; c++) {
                const i00 = (y0 * rw + x0) * 3 + c, i10 = (y0 * rw + x0 + 1) * 3 + c;
                const i01 = ((y0 + 1) * rw + x0) * 3 + c, i11 = ((y0 + 1) * rw + x0 + 1) * 3 + c;
                const top = out[i00] * (1 - dx) + out[i10] * dx;
                const bot = out[i01] * (1 - dx) + out[i11] * dx;
                data[o + c] = data[o + c] * (1 - alpha) + (top * (1 - dy) + bot * dy) * alpha;
            }
        }
    }
}

// 用一个复用的 canvas 承载 imgData（避免每次新建）
let _srcCanvas = document.createElement('canvas');
let _srcCtx = _srcCanvas.getContext('2d', { willReadFrequently: true });
function _srcCanvasOf(imgData, w, h) {
    if (_srcCanvas.width !== w || _srcCanvas.height !== h) {
        _srcCanvas.width = w; _srcCanvas.height = h;
    }
    _srcCtx.putImageData(imgData, 0, 0);
    return _srcCanvas;
}

// ---------------------------------------------------------------- 美白

export function applyWhiten(imgData, sk, params) {
    const strength = clamp(params.whiten, 0, 1);
    if (strength <= 0) return;
    const { width: w, height: h, data } = imgData;

    const lift = clamp(params.whiten_lift, 0, 0.8) * strength;
    const warm = clamp(params.whiten_warm, 0, 10) * strength;
    const lutR = lut256(v => v + (255 - v) * lift + warm * 0.7);
    const lutG = lut256(v => v + (255 - v) * lift + warm * 0.15);
    const lutB = lut256(v => v + (255 - v) * lift - warm * 0.5);

    for (let y = sk.y; y < sk.y + sk.h; y++) {
        const arow = (y - sk.y) * sk.w;
        for (let x = sk.x; x < sk.x + sk.w; x++) {
            const alpha = sk.data[arow + (x - sk.x)] * strength;
            if (alpha <= 0.002) continue;
            const o = (y * w + x) * 4;
            const ia = 1 - alpha;
            data[o] = data[o] * ia + lutR[data[o]] * alpha;
            data[o + 1] = data[o + 1] * ia + lutG[data[o + 1]] * alpha;
            data[o + 2] = data[o + 2] * ia + lutB[data[o + 2]] * alpha;
        }
    }
}

// ---------------------------------------------------------------- 红润

export function applyBlush(imgData, faces, sk, params) {
    const strength = clamp(params.blush, 0, 1);
    if (strength <= 0 || !faces.length) return;
    const { width: w, height: h, data } = imgData;
    const roi = faceRoi(faces, w, h, 0.20);
    const rw = roi.w, rh = roi.h;
    const blobs = new Float32Array(rw * rh);

    let peak = 0;
    for (const f of faces) {
        if (!f.landmarks) continue;
        const sigma = Math.max(f.bbox[2] * 0.30, 10);
        const R = Math.ceil(sigma * 3 * 1.9);
        for (const group of [CHEEK_L, CHEEK_R]) {
            const [gx, gy] = meanPoint(f.landmarks, group);
            const cx = gx - roi.x, cy = gy - roi.y;
            const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(rw - 1, Math.ceil(cx + R));
            const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(rh - 1, Math.ceil(cy + R));
            const k1 = 1 / (2 * sigma * sigma), k2 = 1 / (2 * 3.61 * sigma * sigma);
            for (let y = y0; y <= y1; y++) {
                const dy = y - cy, dy2 = dy * dy;
                for (let x = x0; x <= x1; x++) {
                    const dx = x - cx;
                    const r2 = dx * dx + dy2;
                    const g = 0.65 * fastExp(r2 * k1) + 0.35 * fastExp(r2 * k2);
                    const i = y * rw + x;
                    if (g > blobs[i]) blobs[i] = g;
                    if (g > peak) peak = g;
                }
            }
        }
    }
    if (peak <= 1e-6) return;

    // 乘皮肤权重 -> 归一化 -> 大核羽化（"晕开"的关键）
    const alpha = new Float32Array(rw * rh);
    let p2 = 0;
    for (let y = 0; y < rh; y++) {
        const arow = (roi.y + y - sk.y) * sk.w - sk.x;
        for (let x = 0; x < rw; x++) {
            const i = y * rw + x;
            const v = (blobs[i] / peak) * sk.data[arow + roi.x + x];
            alpha[i] = v; if (v > p2) p2 = v;
        }
    }
    if (p2 <= 1e-6) return;
    const faceW = faces[0].bbox[2];
    blur(alpha, rw, rh, Math.max(faceW * 0.06, 4) / 1.5, alpha);
    let p3 = 0;
    for (let i = 0; i < alpha.length; i++) if (alpha[i] > p3) p3 = alpha[i];
    const norm = (p3 > 1e-6 ? 1 / p3 : 0) * 0.72 * strength;
    const gain = clamp(params.blush_gain, 0, 45);

    for (let y = 0; y < rh; y++) {
        for (let x = 0; x < rw; x++) {
            const a = clamp(alpha[y * rw + x] * norm, 0, 1);
            if (a <= 0.002) continue;
            const p = ((roi.y + y) * w + roi.x + x) * 4;
            // RGB 上近似 LAB 的 a/b 加法：加红 + 轻微加暖
            data[p] = Math.min(255, data[p] + gain * a * 0.75);
            data[p + 1] = Math.min(255, data[p + 1] + gain * a * 0.30);
            data[p + 2] = Math.min(255, data[p + 2] + gain * a * 0.12);
        }
    }
}

// ---------------------------------------------------------------- 滤镜

function channelLUT(gain, brightness, contrast) {
    return lut256(v => clamp(((v * gain - 128) * contrast + 128 + brightness * 255), 0, 255));
}

/** 与桌面版一致的 6 种滤镜（gain 顺序为 R、G、B） */
export const FILTERS = {
    none: { label: '原图' },
    natural: { label: '自然', R: 1.05, G: 1.03, B: 1.02, b: 0.03, c: 1.06, sat: 1.12 },
    cool: { label: '冷白', R: 0.92, G: 1.00, B: 1.10, b: 0.05, c: 1.05, sat: 0.95 },
    warm: { label: '暖阳', R: 1.12, G: 1.01, B: 0.90, b: 0.04, c: 1.04, sat: 1.05 },
    fresh: { label: '清新', R: 0.99, G: 1.05, B: 1.06, b: 0.06, c: 1.05, sat: 1.06 },
    vintage: { label: '复古', sat: 0.75, sepia: true },
};

export function applyFilter(imgData, name, strength) {
    // hasOwnProperty 兜底：FILTERS[name] 对 'constructor'/'__proto__' 之类的键
    // 会命中原型链上的真值，随后 f.R/f.b 为 undefined -> LUT 全 NaN -> 整幅变黑
    const f = (name && Object.prototype.hasOwnProperty.call(FILTERS, name)) ? FILTERS[name] : null;
    if (!f || !name || name === 'none' || strength <= 0) return;
    const { width: w, height: h, data } = imgData;
    const s = clamp(strength, 0, 1);
    const sat = f.sat || 1;
    const sepia = !!f.sepia;
    const lr = sepia ? null : channelLUT(f.R, f.b, f.c);
    const lg = sepia ? null : channelLUT(f.G, f.b, f.c);
    const lb = sepia ? null : channelLUT(f.B, f.b, f.c);
    const cx = w / 2, cy = h / 2;
    const invS = 1 - s;

    // 单趟完成：色彩映射 -> 饱和度 -> （复古）暗角 -> 与原图混合
    for (let y = 0; y < h; y++) {
        const dy = (y - cy) / cy;
        const vigRow = sepia ? clamp(1.15 - 0.55 * dy * dy, 0, 1) : 1;
        for (let x = 0; x < w; x++) {
            const p = (y * w + x) * 4;
            let r, g, b;
            if (sepia) {
                const R = data[p], G = data[p + 1], B = data[p + 2];
                r = 0.393 * R + 0.769 * G + 0.189 * B;
                g = 0.349 * R + 0.686 * G + 0.168 * B;
                b = 0.272 * R + 0.534 * G + 0.131 * B;
                if (vigRow !== 1) {
                    const dx = (x - cx) / cx;
                    const v = clamp(1.15 - 0.55 * (dx * dx + dy * dy), 0, 1);
                    r *= v; g *= v; b *= v;
                }
            } else {
                r = lr[data[p]]; g = lg[data[p + 1]]; b = lb[data[p + 2]];
            }
            if (sat !== 1) {
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                r = gray + (r - gray) * sat;
                g = gray + (g - gray) * sat;
                b = gray + (b - gray) * sat;
            }
            data[p] = data[p] * invS + clamp(r, 0, 255) * s;
            data[p + 1] = data[p + 1] * invS + clamp(g, 0, 255) * s;
            data[p + 2] = data[p + 2] * invS + clamp(b, 0, 255) * s;
        }
    }
}

// ---------------------------------------------------------------- 几何变形

/** 脸部闸门：脸内≈1、脸外平滑衰减到 0（把变形限制在脸上，背景不动） */
export function faceGate(faces, w, h, expand = 0.06, feather = 0.05) {
    if (!faces || !faces.length) return null;
    ensureCanvas(w, h);
    _ctx.clearRect(0, 0, w, h);
    _ctx.fillStyle = '#fff';
    _ctx.strokeStyle = '#fff';
    const fw = faces[0].bbox[2];
    _ctx.lineWidth = Math.max(fw * expand, 2) * 2;
    _ctx.lineJoin = 'round';
    for (const f of faces) {
        if (!f.landmarks) continue;
        const hull = convexHull(f.landmarks);
        const p = new Path2D();
        p.moveTo(hull[0], hull[1]);
        for (let i = 2; i < hull.length; i += 2) p.lineTo(hull[i], hull[i + 1]);
        p.closePath();
        _ctx.fill(p); _ctx.stroke(p);
    }
    const px = _ctx.getImageData(0, 0, w, h).data;
    const gate = new Float32Array(w * h);
    for (let i = 0, p = 3; i < w * h; i++, p += 4) gate[i] = px[p] > 128 ? 1 : 0;
    blur(gate, w, h, Math.max(fw * feather / 1.5, 1.5), gate);
    return gate;
}

/**
 * 平滑位移场变形：各关键点位移按高斯核加权平均成连续位移场，一次重映射。
 * 边界用「复制」而不是镜像 —— 避免人脸贴近画面边缘时出现镜像/重影。
 * 只在 ROI 内计算与写回，框外像素完全不动。
 */
function warpRegion(data, w, h, roi, moves, sigma, gate, maxShift) {
    if (!moves.length) return;
    const { x: ox, y: oy, w: rw, h: rh } = roi;
    // 位移场非常平滑：在 1/4 分辨率上合成后上采样，exp 调用量降到 1/16
    const fs = 0.25;
    const fw = Math.max(2, Math.round(rw * fs)), fh = Math.max(2, Math.round(rh * fs));
    const accX = new Float32Array(fw * fh), accY = new Float32Array(fw * fh), accW = new Float32Array(fw * fh);
    const fSigma = Math.max(sigma * fs, 1);
    const radius = Math.ceil(fSigma * 3);
    const inv2s2 = 1 / (2 * fSigma * fSigma);
    for (const [mpx, mpy, dx, dy] of moves) {
        const px = (mpx - ox) * fs, py = (mpy - oy) * fs;
        const x0 = Math.max(0, Math.floor(px - radius)), x1 = Math.min(fw - 1, Math.ceil(px + radius));
        const y0 = Math.max(0, Math.floor(py - radius)), y1 = Math.min(fh - 1, Math.ceil(py + radius));
        for (let y = y0; y <= y1; y++) {
            const gy = y - py, gy2 = gy * gy;
            for (let x = x0; x <= x1; x++) {
                const gx = x - px;
                const g = fastExp((gx * gx + gy2) * inv2s2);
                const i = y * fw + x;
                accX[i] += dx * g; accY[i] += dy * g; accW[i] += g;
            }
        }
    }
    let wmax = 0;
    for (let i = 0; i < accW.length; i++) if (accW[i] > wmax) wmax = accW[i];
    const eps = Math.max(0.05 * wmax, 1e-3);

    // 合成 + 上采样到 ROI 分辨率
    const dxf = new Float32Array(fw * fh), dyf = new Float32Array(fw * fh);
    for (let i = 0; i < fw * fh; i++) {
        const denom = accW[i] + eps;
        let dx = accX[i] / denom, dy = accY[i] / denom;
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag > maxShift) { const k = maxShift / mag; dx *= k; dy *= k; }
        dxf[i] = dx; dyf[i] = dy;
    }
    const dxMap = new Float32Array(rw * rh), dyMap = new Float32Array(rw * rh);
    for (let y = 0; y < rh; y++) {
        const sy = Math.min(Math.max((y + 0.5) * fs - 0.5, 0), fh - 1.001);
        const sy0 = sy | 0, fy = sy - sy0;
        const r0 = sy0 * fw, r1 = r0 + fw;
        for (let x = 0; x < rw; x++) {
            const sx = Math.min(Math.max((x + 0.5) * fs - 0.5, 0), fw - 1.001);
            const sx0 = sx | 0, fx = sx - sx0;
            const i = y * rw + x;
            const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
            let dx = dxf[r0 + sx0] * w00 + dxf[r0 + sx0 + 1] * w10 + dxf[r1 + sx0] * w01 + dxf[r1 + sx0 + 1] * w11;
            let dy = dyf[r0 + sx0] * w00 + dyf[r0 + sx0 + 1] * w10 + dyf[r1 + sx0] * w01 + dyf[r1 + sx0 + 1] * w11;
            if (gate) dx *= gate[(oy + y) * w + ox + x], dy *= gate[(oy + y) * w + ox + x];
            dxMap[i] = dx; dyMap[i] = dy;
        }
    }

    const src = new Uint8ClampedArray(data);
    for (let y = 0; y < rh; y++) {
        for (let x = 0; x < rw; x++) {
            const i = y * rw + x;
            let sx = x - dxMap[i] + ox, sy = y - dyMap[i] + oy;
            sx = clamp(sx, 0, w - 1.001); sy = clamp(sy, 0, h - 1.001);   // 边界复制，不镜像
            const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0;
            const o = ((oy + y) * w + ox + x) * 4;
            for (let c = 0; c < 3; c++) {
                const p00 = src[(y0 * w + x0) * 4 + c], p01 = src[(y0 * w + x0 + 1) * 4 + c];
                const p10 = src[((y0 + 1) * w + x0) * 4 + c], p11 = src[((y0 + 1) * w + x0 + 1) * 4 + c];
                data[o + c] = (p00 * (1 - fx) + p01 * fx) * (1 - fy) + (p10 * (1 - fx) + p11 * fx) * fy;
            }
        }
    }
}

export function applySlim(imgData, faces, params, gate) {
    const strength = clamp(params.slim, 0, 1);
    if (strength <= 0 || !faces.length) return;
    const { width: w, height: h, data } = imgData;
    // 位移场只在人脸外接框内计算（框外位移为 0，等价于全图计算但快得多）
    const roi = faceRoi(faces, w, h, 0.30);
    for (const f of faces) {
        if (!f.landmarks) continue;
        const lm = f.landmarks;
        const cx = lm[NOSE_TIP * 2], cy = lm[NOSE_TIP * 2 + 1];
        const [, by, fw, fh] = f.bbox;
        const maxShift = clamp(params.slim_shift, 0, 0.15) * fw * strength;
        const sigma = Math.max(clamp(params.slim_sigma, 0.04, 0.25) * fw, 6);
        const moves = [];
        for (const idx of JAW_CHIN) {
            const px = lm[idx * 2], py = lm[idx * 2 + 1];
            const relY = (py - by) / Math.max(fh, 1);
            if (relY < 0.45) continue;                       // 颧骨以上不推
            const wy = Math.pow(clamp((relY - 0.45) / 0.55, 0, 1), 0.8);
            const vx = cx - px, vy = (cy - py) * 0.30;
            const norm = Math.hypot(vx, vy) || 1;
            const s = maxShift * wy;
            moves.push([px, py, vx / norm * s, vy / norm * s]);
        }
        warpRegion(data, w, h, roi, moves, sigma, gate, maxShift);
    }
}

export function applyEyes(imgData, faces, params) {
    const strength = clamp(params.eye, 0, 1) * clamp(params.eye_gain, 0, 0.45);
    if (strength <= 0) return;
    const { width: w, height: h, data } = imgData;
    const src = new Uint8ClampedArray(data);
    for (const f of faces) {
        if (!f.landmarks) continue;
        const fw = f.bbox[2], fh = f.bbox[3];
        const radius = Math.max(Math.floor(0.13 * Math.min(fw, fh)), 10);
        for (const group of [LEFT_EYE, RIGHT_EYE]) {
            const [cx, cy] = meanPoint(f.landmarks, group);
            const x0 = Math.max(0, Math.floor(cx - radius)), x1 = Math.min(w - 1, Math.ceil(cx + radius));
            const y0 = Math.max(0, Math.floor(cy - radius)), y1 = Math.min(h - 1, Math.ceil(cy + radius));
            for (let y = y0; y <= y1; y++) {
                const dy = y - cy;
                for (let x = x0; x <= x1; x++) {
                    const dx = x - cx;
                    const dist = Math.hypot(dx, dy);
                    if (dist >= radius) continue;
                    const factor = 1 - strength * Math.pow(1 - dist / radius, 2);
                    let sx = cx + dx * factor, sy = cy + dy * factor;
                    sx = clamp(sx, 0, w - 1.001); sy = clamp(sy, 0, h - 1.001);
                    const ix0 = sx | 0, iy0 = sy | 0, fx = sx - ix0, fy = sy - iy0;
                    const o = (y * w + x) * 4;
                    for (let c = 0; c < 3; c++) {
                        const p00 = src[(iy0 * w + ix0) * 4 + c], p01 = src[(iy0 * w + ix0 + 1) * 4 + c];
                        const p10 = src[((iy0 + 1) * w + ix0) * 4 + c], p11 = src[((iy0 + 1) * w + ix0 + 1) * 4 + c];
                        data[o + c] = (p00 * (1 - fx) + p01 * fx) * (1 - fy) + (p10 * (1 - fx) + p11 * fx) * fy;
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------- 可视化

export function drawMesh(ctx, faces, showMesh) {
    if (!faces || !faces.length) return;
    ctx.save();
    ctx.lineWidth = 1;
    for (const f of faces) {
        if (!f.landmarks) continue;
        const lm = f.landmarks;
        const hull = convexHull(lm);
        ctx.beginPath();
        ctx.moveTo(hull[0], hull[1]);
        for (let i = 2; i < hull.length; i += 2) ctx.lineTo(hull[i], hull[i + 1]);
        ctx.closePath();
        ctx.strokeStyle = 'rgba(90,200,60,0.95)';
        ctx.fillStyle = 'rgba(90,200,60,0.08)';
        ctx.fill(); ctx.stroke();

        if (showMesh) {
            ctx.fillStyle = 'rgba(0,229,255,0.8)';
            for (let i = 0; i < lm.length / 2; i += 2) ctx.fillRect(lm[i * 2] - 0.5, lm[i * 2 + 1] - 0.5, 1, 1);
            ctx.strokeStyle = 'rgba(0,229,255,0.9)';
            for (const group of FEATURE_GROUPS) {
                ctx.beginPath();
                for (let i = 0; i < group.length; i++) {
                    const idx = group[i];
                    if (i === 0) ctx.moveTo(lm[idx * 2], lm[idx * 2 + 1]);
                    else ctx.lineTo(lm[idx * 2], lm[idx * 2 + 1]);
                }
                ctx.closePath(); ctx.stroke();
            }
        }
    }
    ctx.restore();
}

/** 皮肤权重热力图（调参用）：红=会处理，蓝=被排除 */
export function drawHeatmap(ctx, sk, w, h, weight = 0.55) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const a = sampleAlpha(sk, x, y);
            // JET 近似
            const t = clamp(a, 0, 1);
            const r = clamp(1.5 - Math.abs(4 * t - 3), 0, 1) * 255;
            const g = clamp(1.5 - Math.abs(4 * t - 2), 0, 1) * 255;
            const b = clamp(1.5 - Math.abs(4 * t - 1), 0, 1) * 255;
            const p = (y * w + x) * 4;
            d[p] = d[p] * (1 - weight) + r * weight;
            d[p + 1] = d[p + 1] * (1 - weight) + g * weight;
            d[p + 2] = d[p + 2] * (1 - weight) + b * weight;
        }
    }
    ctx.putImageData(img, 0, 0);
}

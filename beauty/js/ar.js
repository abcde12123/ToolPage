/**
 * AR 贴纸与面部平面
 *
 * 桌面版用 OpenCV solvePnP 估计三维头部姿态；浏览器里为了保持轻量，
 * 改用「关键点构成的二维面部坐标系」：
 *   原点 = 双眼外角中点
 *   x 轴 = 左眼外角 -> 右眼外角（单位 = 眼距）
 *   y 轴 = 与之垂直的「向上」方向
 * 贴纸按「眼距」为单位摆放，因此会随头部转动/远近自动缩放与倾斜，
 * 平面范围同样远大于脸部，贴纸可以浮在头顶与两侧。
 */

const LEFT_EYE_OUTER = 33;
const RIGHT_EYE_OUTER = 263;

/** 由关键点构造面部坐标系 */
export function faceFrame(landmarks) {
    if (!landmarks) return null;
    const lx = landmarks[LEFT_EYE_OUTER * 2], ly = landmarks[LEFT_EYE_OUTER * 2 + 1];
    const rx = landmarks[RIGHT_EYE_OUTER * 2], ry = landmarks[RIGHT_EYE_OUTER * 2 + 1];
    let ex = rx - lx, ey = ry - ly;
    const dist = Math.hypot(ex, ey);
    if (dist < 4) return null;
    ex /= dist; ey /= dist;
    return {
        ox: (lx + rx) / 2, oy: (ly + ry) / 2,   // 原点（图像坐标）
        ex, ey,                                  // x 轴单位向量（图像坐标）
        ux: ey, uy: -ex,                         // 向上单位向量（图像 y 向下，故取 -ex）
        dist,                                    // 眼距（像素）= 1 个"面部单位"
    };
}

/** 面部单位 -> 图像坐标 */
export function faceToScreen(frame, u, v) {
    return [
        frame.ox + (frame.ex * u + frame.ux * v) * frame.dist,
        frame.oy + (frame.ey * u + frame.uy * v) * frame.dist,
    ];
}

/** 图像坐标 -> 面部单位（拖动贴纸用） */
export function screenToFace(frame, x, y) {
    const dx = (x - frame.ox) / frame.dist;
    const dy = (y - frame.oy) / frame.dist;
    return [dx * frame.ex + dy * frame.ey, dx * frame.ux + dy * frame.uy];
}

/**
 * 在画布上绘制一枚贴纸（用 canvas 变换完成旋转/缩放/透视近似）。
 * sticker: { img, u, v, size, rot, opacity }，size 单位为眼距
 */
export function drawSticker(ctx, frame, sticker) {
    const half = sticker.size / 2;
    const cos = Math.cos(sticker.rot || 0), sin = Math.sin(sticker.rot || 0);
    const d = frame.dist;
    // canvas 的 y 轴朝下，而面部坐标系 v 轴朝上，这里先取「右」「下」两个方向：
    //   R = 面部右方向（= 贴纸的 x 轴）
    //   D = 面部下方向（= 贴纸的 y 轴，canvas 里 y 向下，正好对应图片的下沿）
    // 之前直接把「面部上方向」当成了贴纸的 y 轴，导致贴纸整体上下颠倒。
    const rx = frame.ex * d, ry = frame.ey * d;
    const dx = -frame.ux * d, dy = -frame.uy * d;
    // 贴纸自身旋转（在 canvas 坐标系里，正角 = 顺时针；显示端整体水平镜像，
    // 所以屏幕上看起来是逆时针，滑块方向与此保持一致即可）
    const bx = cos * rx + sin * dx, by = cos * ry + sin * dy;
    const cx = -sin * rx + cos * dx, cy = -sin * ry + cos * dy;
    const [px, py] = faceToScreen(frame, sticker.u, sticker.v);

    ctx.save();
    ctx.globalAlpha = sticker.opacity === undefined ? 1 : sticker.opacity;
    // (lu, lv)【面部单位】 -> (bx,by)*lu + (cx,cy)*lv + 中心
    ctx.setTransform(bx, by, cx, cy, px, py);
    ctx.drawImage(sticker.img, -half, -half, sticker.size, sticker.size);
    ctx.restore();
}

/** 画贴纸外框 */
export function drawStickerBox(ctx, frame, sticker, selected) {
    const half = sticker.size / 2;
    const pts = [[-half, -half], [half, -half], [half, half], [-half, half]].map(([u, v]) => {
        // 这里的 (u, v) 是「贴纸局部坐标」：u 向右、v 向下（和图片一致），
        // 因此换算到面部坐标时 v 要取负；旋转同样按屏幕空间的顺时针处理，
        // 否则外框会和贴纸本体转反、不重合。
        const cos = Math.cos(sticker.rot || 0), sin = Math.sin(sticker.rot || 0);
        const ru = u * cos - v * sin, rv = -u * sin - v * cos;
        return faceToScreen(frame, sticker.u + ru, sticker.v + rv);
    });
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.strokeStyle = selected ? '#50dcff' : 'rgba(200,140,80,0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
}

/** 面部平面网格（展示"平面远大于脸"） */
export function drawFacePlane(ctx, frame, halfU = 1.7, halfV = 1.8, divisions = 6) {
    ctx.save();
    ctx.strokeStyle = 'rgba(60,130,150,0.55)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= divisions; i++) {
        const t = -halfU + (2 * halfU * i) / divisions;
        const a = faceToScreen(frame, t, -halfV), b = faceToScreen(frame, t, halfV);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        const s = -halfV + (2 * halfV * i) / divisions;
        const c = faceToScreen(frame, -halfU, s), d = faceToScreen(frame, halfU, s);
        ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(230,200,40,0.95)';
    ctx.lineWidth = 1.5;
    const corners = [[-halfU, -halfV], [halfU, -halfV], [halfU, halfV], [-halfU, halfV]]
        .map(([u, v]) => faceToScreen(frame, u, v));
    ctx.beginPath();
    ctx.moveTo(corners[0][0], corners[0][1]);
    for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i][0], corners[i][1]);
    ctx.closePath(); ctx.stroke();
    ctx.restore();
}

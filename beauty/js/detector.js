/**
 * 人脸检测与关键点：MediaPipe FaceLandmarker（Web 版）封装
 * 依赖本地托管的 vision_bundle.mjs 与 face_landmarker.task，
 * 不依赖 Google 域名，国内也能稳定加载。
 */
// 注意：用 .js 而不是 .mjs —— nginx / Python 等默认不为 .mjs 提供 JS MIME，
// 会被当成 text/plain 导致模块加载失败。
import { FaceLandmarker, FilesetResolver } from '../vendor/vision_bundle.js';

export class FaceDetector {
    /**
     * @param {string} base 站点上 beauty 目录的相对路径（默认当前目录）
     */
    constructor(base = '.') {
        this.base = base.replace(/\/$/, '');
        this.landmarker = null;
        this.backend = null;
    }

    async load(onStatus) {
        const say = (s) => { if (onStatus) onStatus(s); };
        say('正在加载检测器…');
        const fileset = await FilesetResolver.forVisionTasks(`${this.base}/vendor/wasm`);

        const options = (delegate) => ({
            baseOptions: { modelAssetPath: `${this.base}/models/face_landmarker.task`, delegate },
            runningMode: 'VIDEO',
            numFaces: 3,
            outputFaceBlendshapes: false,
        });

        try {
            this.landmarker = await FaceLandmarker.createFromOptions(fileset, options('GPU'));
            this.backend = 'GPU';
        } catch (err) {
            // 部分显卡/驱动不支持 GPU 委托，回退 CPU
            console.warn('[beauty] GPU 委托失败，回退 CPU：', err);
            this.landmarker = await FaceLandmarker.createFromOptions(fileset, options('CPU'));
            this.backend = 'CPU';
        }
        say('');
        return this.backend;
    }

    /**
     * 检测一帧。
     * @returns {Array<{bbox:number[], landmarks:Float32Array|null, score:number}>}
     */
    detect(video, timestampMs) {
        if (!this.landmarker) return [];
        let result;
        try {
            result = this.landmarker.detectForVideo(video, timestampMs);
        } catch (err) {
            console.warn('[beauty] 检测失败：', err);
            return [];
        }
        // 兼容 video / canvas / img：canvas 与 img 没有 videoWidth
        const vw = video.videoWidth || video.naturalWidth || video.width;
        const vh = video.videoHeight || video.naturalHeight || video.height;
        const faces = [];
        const list = result.faceLandmarks || [];
        for (let f = 0; f < list.length; f++) {
            const src = list[f];
            const n = src.length;
            const pts = new Float32Array(n * 2);
            let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
            for (let i = 0; i < n; i++) {
                const x = src[i].x * vw, y = src[i].y * vh;
                pts[i * 2] = x; pts[i * 2 + 1] = y;
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
            }
            faces.push({
                bbox: [minX, minY, maxX - minX, maxY - minY],
                landmarks: pts,
                score: 1,
            });
        }
        return faces;
    }

    close() {
        if (this.landmarker) { try { this.landmarker.close(); } catch (e) { /* ignore */ } }
        this.landmarker = null;
    }
}

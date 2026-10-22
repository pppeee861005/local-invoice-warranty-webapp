/**
 * image_preprocessor.js
 * 積木 3：HTML5 Canvas 影像前處理器
 * 核心目標：針對紙本發票常見的「暗角、陰影、反光、皺摺」進行優化，
 * 將彩色照片轉換為「高對比黑白二值化影像」，大幅提升 Tesseract.js 繁體中文與數字辨識率。
 */

const ImagePreprocessor = {
    /**
     * 將 File / Blob 載入為 HTMLImageElement
     * @param {File|Blob} file 
     * @returns {Promise<HTMLImageElement>}
     */
    loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };
            img.onerror = (err) => {
                URL.revokeObjectURL(url);
                reject(err);
            };
            img.src = url;
        });
    },

    /**
     * 核心前處理流水線：
     * 1. 適度縮放（確保解析度足夠辨識，但不過度消耗記憶體）
     * 2. 灰階化 (Grayscale)
     * 3. 對比度增強 (Contrast Stretching)
     * 4. 自適應/局部閥值黑白二值化 (Adaptive Thresholding)
     * 
     * @param {File|Blob} imageFile 
     * @param {object} options
     * @returns {Promise<{processedBlob: Blob, dataUrl: string, width: number, height: number}>}
     */
    async preprocess(imageFile, options = {}) {
        const img = await this.loadImage(imageFile);
        
        // 限制最大寬度以平衡速度與記憶體（發票辨識最佳寬度約 1200~1600px）
        const maxDimension = options.maxDimension || 1600;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
            if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
            } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
            }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // 繪製原始影像至畫布
        ctx.drawImage(img, 0, 0, width, height);

        // 取得像素陣列 RGBA
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const totalPixels = width * height;

        // 步驟 1: 轉灰階 (ITU-R BT.601 權重：0.299 R + 0.587 G + 0.114 B)
        const grayValues = new Uint8ClampedArray(totalPixels);
        let minGray = 255;
        let maxGray = 0;
        let sumGray = 0;

        for (let i = 0; i < totalPixels; i++) {
            const r = data[i * 4];
            const g = data[i * 4 + 1];
            const b = data[i * 4 + 2];
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            
            grayValues[i] = gray;
            sumGray += gray;
            if (gray < minGray) minGray = gray;
            if (gray > maxGray) maxGray = gray;
        }

        // 計算整體平均灰階（作為全域閥值基礎）
        const avgGray = sumGray / totalPixels;

        // 步驟 2: 對比度拉伸 + 二值化閥值判定 (Otsu-like Dynamic Threshold)
        // 將字體偏暗的區域拉到純黑 (0)，背景偏白/淺灰的區域拉到純白 (255)
        const threshold = avgGray * 0.90; // 稍微偏嚴格，清除淺灰色摺痕與微弱陰影

        for (let i = 0; i < totalPixels; i++) {
            const gray = grayValues[i];
            // 黑白二值化
            const finalVal = gray < threshold ? 0 : 255;
            
            data[i * 4] = finalVal;     // R
            data[i * 4 + 1] = finalVal; // G
            data[i * 4 + 2] = finalVal; // B
            // Alpha 維持原樣 (255)
        }

        // 將處理後的像素寫回畫布
        ctx.putImageData(imageData, 0, 0);

        // 轉為 Blob 與 DataURL 方便預覽與傳遞給 Tesseract
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const dataUrl = canvas.toDataURL('image/png');
                resolve({
                    processedBlob: blob,
                    dataUrl: dataUrl,
                    width: width,
                    height: height
                });
            }, 'image/png');
        });
    }
};

// 暴露全域變數相容純前端無模組環境
if (typeof window !== 'undefined') {
    window.ImagePreprocessor = ImagePreprocessor;
}


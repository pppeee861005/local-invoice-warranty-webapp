/**
 * app.js
 * 主調度器：負責 DOM 事件監聽、拖曳圖片、調用 Tesseract.js、更新畫面與 CSV 匯出
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素快取
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const statusPanel = document.getElementById('status-panel');
    const statusText = document.getElementById('status-text');
    const progressFill = document.getElementById('progress-fill');
    const progressPercent = document.getElementById('progress-percent');
    
    const resultCard = document.getElementById('result-card');
    const verdictBanner = document.getElementById('verdict-banner');
    const verdictTitle = document.getElementById('verdict-title');
    const verdictDesc = document.getElementById('verdict-desc');
    const verdictIcon = document.getElementById('verdict-icon');
    
    const resInvNum = document.getElementById('res-inv-num');
    const resInvDate = document.getElementById('res-inv-date');
    const resExpiryDate = document.getElementById('res-expiry-date');
    const resDaysLeft = document.getElementById('res-days-left');
    const rawOcrText = document.getElementById('raw-ocr-text');
    
    const historyTbody = document.getElementById('history-tbody');
    const recordCount = document.getElementById('record-count');
    const btnExport = document.getElementById('btn-export');
    
    const warrantyMonthsInput = document.getElementById('warranty-months');
    const refDateInput = document.getElementById('reference-date');
    const enablePreprocessCheckbox = document.getElementById('enable-preprocess');
    const previewPreprocessed = document.getElementById('preview-preprocessed');
    const noPreviewText = document.getElementById('no-preview-text');

    // 初始化基準日期為今天
    const todayStr = new Date().toISOString().split('T')[0];
    refDateInput.value = todayStr;

    // 歷史紀錄資料
    let historyRecords = [];

    // ==========================================
    // 1. 拖曳與選取事件
    // ==========================================
    dropZone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFiles(files);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    });

    // ==========================================
    // 2. 批次或單張圖片處理
    // ==========================================
    async function handleFiles(files) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith('image/')) continue;
            await processSingleImage(file, i + 1, files.length);
        }
    }

    // ==========================================
    // 3. Tesseract.js 本地 OCR 執行核心
    // ==========================================
    async function processSingleImage(file, currentIdx, totalFiles) {
        statusPanel.style.display = 'block';
        updateProgress(0, `[${currentIdx}/${totalFiles}] 正在準備影像...`);

        try {
            let imageToRecognize = file;
            let previewDataUrl = null;

            // 積木 3：Canvas 前處理（若有勾選啟用）
            if (enablePreprocessCheckbox && enablePreprocessCheckbox.checked && window.ImagePreprocessor) {
                updateProgress(15, `[${currentIdx}/${totalFiles}] 正在進行 Canvas 影像二值化與對比增強...`);
                try {
                    const prepResult = await ImagePreprocessor.preprocess(file);
                    imageToRecognize = prepResult.processedBlob;
                    previewDataUrl = prepResult.dataUrl;
                } catch (prepErr) {
                    console.warn('影像前處理略過，使用原圖:', prepErr);
                    imageToRecognize = file;
                }
            }

            updateProgress(30, `[${currentIdx}/${totalFiles}] 正在載入 OCR 辨識引擎...`);

            // 建立或重用 Worker (繁體中文 + 英文)
            const worker = await Tesseract.createWorker('chi_tra+eng', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        const pct = 30 + Math.floor(m.progress * 65);
                        updateProgress(pct, `[${currentIdx}/${totalFiles}] 正在光學辨識發票文字... (${pct}%)`);
                    }
                }
            });

            const ret = await worker.recognize(imageToRecognize);
            const text = ret.data.text;
            await worker.terminate();

            updateProgress(100, `[${currentIdx}/${totalFiles}] 辨識完成！正在萃取發票與計算保固...`);
            setTimeout(() => { statusPanel.style.display = 'none'; }, 600);

            // 調用積木 2：萃取號碼與日期
            const extracted = DateExtractor.extract(text);
            
            // 調用積木 1：計算保固
            const warrantyMonths = parseInt(warrantyMonthsInput.value, 10);
            const refDate = refDateInput.value;
            const verdict = WarrantyLogic.evaluate(extracted.date, warrantyMonths, refDate);

            // 更新當前結果卡片
            renderResultCard(extracted, verdict, text, previewDataUrl);

            // 加入歷史紀錄
            addRecord(extracted, verdict);

        } catch (err) {
            console.error('OCR Error:', err);
            updateProgress(100, `辨識出錯：${err.message}`);
        }
    }

    function updateProgress(percent, msg) {
        progressFill.style.width = `${percent}%`;
        progressPercent.innerText = `${percent}%`;
        statusText.innerText = msg;
    }

    // ==========================================
    // 4. 渲染結果卡片 (綠/紅燈)
    // ==========================================
    function renderResultCard(extracted, verdict, rawText, previewDataUrl = null) {
        resultCard.style.display = 'block';
        rawOcrText.innerText = rawText || '(未識別到文字)';

        // 預覽增強後的二值化黑白圖
        if (previewDataUrl) {
            previewPreprocessed.src = previewDataUrl;
            previewPreprocessed.style.display = 'block';
            if (noPreviewText) noPreviewText.style.display = 'none';
        } else {
            previewPreprocessed.style.display = 'none';
            if (noPreviewText) noPreviewText.style.display = 'block';
        }

        resInvNum.innerText = extracted.invoiceNumber || '未偵測到';
        resInvDate.innerText = extracted.date || '未偵測到';
        resExpiryDate.innerText = verdict.expiryDate || '--';

        if (verdict.status === 'SUCCESS') {
            if (verdict.isCovered) {
                verdictBanner.className = 'verdict-banner valid';
                verdictTitle.innerText = '✅ 保固有效 (In Warranty)';
                verdictDesc.innerText = `此發票仍在有效保固期內，截止日為 ${verdict.expiryDate}`;
                verdictIcon.innerText = '🟢';
                resDaysLeft.innerText = `剩餘 ${verdict.remainingDays} 天`;
                resDaysLeft.style.color = 'var(--accent-green)';
            } else {
                verdictBanner.className = 'verdict-banner expired';
                verdictTitle.innerText = '❌ 已過保固 (Expired)';
                verdictDesc.innerText = `此發票已於 ${verdict.expiryDate} 超過保固期限`;
                verdictIcon.innerText = '🔴';
                resDaysLeft.innerText = `已逾期 ${verdict.overdueDays} 天`;
                resDaysLeft.style.color = 'var(--accent-red)';
            }
        } else {
            verdictBanner.className = 'verdict-banner expired';
            verdictTitle.innerText = '⚠️ 無法判定日期';
            verdictDesc.innerText = '未能在發票文字中找到有效的開立年月日或雙月期別，請手動確認。';
            verdictIcon.innerText = '⚠️';
            resDaysLeft.innerText = '格式錯誤';
        }
    }

    // ==========================================
    // 5. 歷史表格與 CSV 匯出
    // ==========================================
    function addRecord(extracted, verdict) {
        const emptyRow = document.getElementById('empty-row');
        if (emptyRow) emptyRow.remove();

        const record = {
            num: extracted.invoiceNumber || '未偵測到',
            date: extracted.date || '無效',
            expiry: verdict.expiryDate || '無效',
            status: verdict.isCovered ? '保固有效' : '已過保固',
            note: extracted.note || (verdict.isCovered ? `剩餘 ${verdict.remainingDays} 天` : `逾期 ${verdict.overdueDays} 天`)
        };

        historyRecords.push(record);
        recordCount.innerText = historyRecords.length;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${record.num}</strong></td>
            <td>${record.date}</td>
            <td>${record.expiry}</td>
            <td>
                <span class="status-pill ${verdict.isCovered ? 'valid' : 'expired'}">
                    ${record.status}
                </span>
            </td>
            <td style="color: var(--text-secondary);">${record.note}</td>
        `;
        historyTbody.prepend(tr);
    }

    btnExport.addEventListener('click', () => {
        if (historyRecords.length === 0) {
            alert('目前尚無辨識紀錄可供匯出！');
            return;
        }

        // 加入 BOM 防止 Excel 打開中文亂碼
        let csvContent = '\uFEFF發票號碼,開立日期,保固截止日,判定狀態,備註說明\n';
        historyRecords.forEach(r => {
            csvContent += `"${r.num}","${r.date}","${r.expiry}","${r.status}","${r.note}"\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `發票保固審核清單_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});


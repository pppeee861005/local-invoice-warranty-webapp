/**
 * date_extractor.js
 * 積木 2：發票文字清洗與正規表示式（Regex）提取器
 * 負責從 OCR 產生的凌亂文字中萃取：
 * 1. 發票號碼 (兩位英文字母 + 8位數字)
 * 2. 開立日期 (民國年轉西元年 / 西元年標準化)
 * 3. 雙月期別備援 (當找不到具體日期的 Fallback)
 */

const DateExtractor = {
    /**
     * 提取發票號碼 (格式: 兩個大寫英文字母 + 8位數字，中間可容忍連字符或空格)
     * 例如: AB-12345678, CD 87654321, EF99887766
     * @param {string} text 
     * @returns {string|null}
     */
    extractInvoiceNumber(text) {
        if (!text) return null;
        // 修正 OCR 常見誤判：例如把大寫 'O' 誤判為數字 '0'，或數字 '1' 誤判為 'I' 的情境先保留原貌
        const match = text.match(/\b([A-Z]{2})[\s\-]?(\d{8})\b/i);
        if (match) {
            return `${match[1].toUpperCase()}-${match[2]}`;
        }
        return null;
    },

    /**
     * 民國年轉西元年 (如 "113" -> 2024, "112" -> 2023)
     * @param {number|string} rocYear 
     * @returns {number}
     */
    rocToAdYear(rocYear) {
        const y = parseInt(rocYear, 10);
        return y < 1000 ? y + 1911 : y; // 若已經是西元年則直接回傳
    },

    /**
     * 格式化標準日期字串 YYYY-MM-DD
     */
    toStandardDate(year, month, day) {
        const y = parseInt(year, 10);
        const m = String(month).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },

    /**
     * 主解析函式：從 OCR 原始文本中抓取最精準的日期
     * @param {string} rawText 
     * @returns {object}
     */
    extract(rawText) {
        if (!rawText || typeof rawText !== 'string') {
            return {
                invoiceNumber: null,
                date: null,
                dateType: 'NONE',
                rawText: ''
            };
        }

        const invoiceNumber = this.extractInvoiceNumber(rawText);

        // 規則 1：西元年完整格式 (2024-10-15 或 2024/10/15 或 2024.10.15)
        const adFullMatch = rawText.match(/\b(20\d{2})[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](0?[1-9]|[12]\d|3[01])\b/);
        if (adFullMatch) {
            return {
                invoiceNumber,
                date: this.toStandardDate(adFullMatch[1], adFullMatch[2], adFullMatch[3]),
                dateType: 'EXACT_AD', // 精確西元年月日
                confidence: 'HIGH'
            };
        }

        // 規則 2：民國年完整格式 (113-10-15 或 113/10/15 或 113年10月15日)
        const rocFullMatch = rawText.match(/\b(10\d|11\d|12\d)[\/\-\.年](0?[1-9]|1[0-2])[\/\-\.月](0?[1-9]|[12]\d|3[01])日?\b/);
        if (rocFullMatch) {
            const adYear = this.rocToAdYear(rocFullMatch[1]);
            return {
                invoiceNumber,
                date: this.toStandardDate(adYear, rocFullMatch[2], rocFullMatch[3]),
                dateType: 'EXACT_ROC', // 精確民國年月日轉西元
                confidence: 'HIGH'
            };
        }

        // 規則 3：傳統雙月期別備援 (例如: "113年09-10月" 或 "113年 09-10 月")
        // 若找不到具體開立日，以期別最後一個月第一天或最後一天作為寬限備援
        const periodMatch = rawText.match(/\b(10\d|11\d|12\d)\s*年\s*(0?[1-9]|1[0-2])\s*[\-\~至]\s*(0?[1-9]|1[0-2])\s*月/);
        if (periodMatch) {
            const adYear = this.rocToAdYear(periodMatch[1]);
            const endMonth = parseInt(periodMatch[3], 10);
            // 備援方案：以該期別第二個月的第一天作為判定點
            return {
                invoiceNumber,
                date: this.toStandardDate(adYear, endMonth, '01'),
                dateType: 'FALLBACK_PERIOD', // 期別雙月備援
                confidence: 'MEDIUM',
                note: `取自發票雙月期別備援：${periodMatch[1]}年${periodMatch[2]}-${periodMatch[3]}月`
            };
        }

        // 規則 4：西元年月 (2024-10 或 2024/10)
        const adMonthMatch = rawText.match(/\b(20\d{2})[\/\-\.](0?[1-9]|1[0-2])\b/);
        if (adMonthMatch) {
            return {
                invoiceNumber,
                date: this.toStandardDate(adMonthMatch[1], adMonthMatch[2], '01'),
                dateType: 'MONTH_ONLY',
                confidence: 'LOW'
            };
        }

        return {
            invoiceNumber,
            date: null,
            dateType: 'NOT_FOUND',
            confidence: 'NONE'
        };
    }
};

// 相容於 Node.js 測試或瀏覽器原生 window
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DateExtractor;
} else if (typeof window !== 'undefined') {
    window.DateExtractor = DateExtractor;
}


/**
 * warranty_logic.js
 * 積木 1：保固判定決策核心（純業務邏輯，零外部依賴）
 * 負責計算發票開立日 + 保固月數是否在基準日（今天）之前或之後。
 */

const WarrantyLogic = {
    /**
     * 解析並標準化日期字串為 Date 物件
     * @param {string|Date} dateInput - YYYY-MM-DD 或 Date 物件
     * @returns {Date|null}
     */
    parseDate(dateInput) {
        if (!dateInput) return null;
        if (dateInput instanceof Date) return dateInput;
        
        // 支援 YYYY-MM-DD 或 YYYY/MM/DD
        const normalized = String(dateInput).trim().replace(/\//g, '-');
        const parts = normalized.split('-');
        if (parts.length !== 3) return null;
        
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JS 月份為 0~11
        const day = parseInt(parts[2], 10);
        
        const d = new Date(year, month, day);
        return isNaN(d.getTime()) ? null : d;
    },

    /**
     * 日期物件格式化為 YYYY-MM-DD 字串
     * @param {Date} d 
     * @returns {string}
     */
    formatDate(d) {
        if (!d || isNaN(d.getTime())) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    },

    /**
     * 計算到期日（支援月數累加，包含月底與閏年處理）
     * @param {Date} startDate 
     * @param {number} monthsToAdd 
     * @returns {Date}
     */
    addMonths(startDate, monthsToAdd) {
        const result = new Date(startDate.getTime());
        const expectedMonth = result.getMonth() + monthsToAdd;
        result.setMonth(expectedMonth);
        
        // 處理月份天數溢位（如 1/31 加一個月變 3/3，自動調整回 2/28）
        if (result.getMonth() !== (expectedMonth % 12 + 12) % 12) {
            result.setDate(0); // 設為前一個月的最後一天
        }
        return result;
    },

    /**
     * 核心判定函式
     * @param {string|Date} invoiceDateInput - 發票開立日期
     * @param {number} warrantyMonths - 保固月數 (預設 12 個月)
     * @param {string|Date} [referenceDateInput] - 基準比對日期 (預設今日)
     * @returns {object}
     */
    evaluate(invoiceDateInput, warrantyMonths = 12, referenceDateInput = null) {
        const invoiceDate = this.parseDate(invoiceDateInput);
        if (!invoiceDate) {
            return {
                status: 'ERROR',
                message: `無效的發票日期格式: "${invoiceDateInput}"`,
                isCovered: false,
                remainingDays: 0,
                badgeClass: 'badge-error'
            };
        }

        const refDate = referenceDateInput ? this.parseDate(referenceDateInput) : new Date();
        // 歸零時分秒，純比對日期天數
        refDate.setHours(0, 0, 0, 0);
        invoiceDate.setHours(0, 0, 0, 0);

        // 計算保固到期日
        const expiryDate = this.addMonths(invoiceDate, parseInt(warrantyMonths, 10));

        // 計算相差天數 (毫秒轉天數)
        const diffTime = expiryDate.getTime() - refDate.getTime();
        const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const isCovered = remainingDays >= 0;

        return {
            status: 'SUCCESS',
            invoiceDate: this.formatDate(invoiceDate),
            warrantyMonths: parseInt(warrantyMonths, 10),
            expiryDate: this.formatDate(expiryDate),
            referenceDate: this.formatDate(refDate),
            isCovered: isCovered,
            remainingDays: isCovered ? remainingDays : 0,
            overdueDays: !isCovered ? Math.abs(remainingDays) : 0,
            verdict: isCovered ? '保固有效 (In Warranty)' : '已過保固 (Expired)',
            badgeClass: isCovered ? 'badge-success' : 'badge-danger'
        };
    }
};

// 相容於 Node.js 測試或瀏覽器原生 window
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WarrantyLogic;
} else if (typeof window !== 'undefined') {
    window.WarrantyLogic = WarrantyLogic;
}


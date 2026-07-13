/**
 * Formats a date into a string with the format "YYYY-MM-DD_HH-MM-SS".
 * @param {Date | null} [date=null]
 * @returns {string}
 */
export function formatDate(date: Date | null = null) {
    if (!date) date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
};

/**
 * Formats uptime data into a human-readable string.
 * @param {string} data
 * @returns {string}
 */
export function uptimeFormat(data) {
    const match = data.match(/(\d+)d(\d+)h(\d+)m(\d+)s/);
    if (!match) return '無法解析';
    const days = match[1] ? parseInt(match[1], 10) : 0;
    const hours = match[2] ? parseInt(match[2], 10) : 0;
    const minutes = match[3] ? parseInt(match[3], 10) : 0;
    const seconds = match[4] ? parseInt(match[4], 10) : 0;
    return `${days} 天 ${hours} 小時 ${minutes} 分鐘 ${seconds} 秒`;
};

/**
 * @param {number | null} [date=null]
 * @returns {number}
 */
export function unixTimeStamp(date: number | null = null) {
    if (!date) date = Date.now();
    return Math.floor(date / 1000);
};

/**
 * Sleeps for a specified amount of time.
 * @param {number} millsec
 * @returns {Promise<void>}
 */
export async function sleep(millsec) {
    return new Promise(sov => setTimeout(sov, millsec));
};

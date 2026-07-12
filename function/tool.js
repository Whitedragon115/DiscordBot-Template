/**
 * Generates a UUID based on the provided format. The format string should contain 'x' where random characters should be inserted.
 * @param {string[]} format
 * @returns {string}
 */
export function uuid(format) {
    const availChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let uuid = '';
    for (let i = 0; i < format.length; i++) {
        if (format[i] === 'x') {
            const randomIndex = Math.floor(Math.random() * availChars.length);
            uuid += availChars[randomIndex];
        } else {
            uuid += format[i];
        }
    }
    return uuid;
};

/**
 * Formats a given size in bytes into a human-readable string with appropriate units.
 * @param {number} bytes
 * @returns {string}
 */
export function sizeFormat(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';

    const i = parseInt(String(Math.floor(Math.log(bytes) / Math.log(1024))), 10);
    return `${(bytes / (1024 ** i)).toFixed(2)} ${sizes[i]}`;
};
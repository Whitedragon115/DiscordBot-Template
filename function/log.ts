import fs from 'fs';
import path from 'path'

// ============================================
// Color Definitions
// ============================================

/** @type {{
 *  error: { fg: string, bold: string },
 *  warn: { fg: string, bold: string },
 *  info: { fg: string, bold: string },
 *  debug: { fg: string, bold: string },
 *  success: { fg: string, bold: string },
 *  white: string,
 *  gray: string,
 *  reset: string,
 *  [k: string]: string | { fg: string, bold: string }
 * }} */
const colors = {
    error: { fg: '\x1b[91m', bold: '\x1b[1m' },      // Red (danger)
    warn: { fg: '\x1b[93m', bold: '\x1b[1m' },       // Yellow (warning)
    info: { fg: '\x1b[94m', bold: '\x1b[1m' },       // Blue (info)
    debug: { fg: '\x1b[90m', bold: '\x1b[1m' },      // Magenta (debug)
    success: { fg: '\x1b[92m', bold: '\x1b[1m' },    // Green (success)
    white: '\x1b[97m',                               // White
    gray: '\x1b[90m',                                // Gray
    reset: '\x1b[0m'
};

/** Map level to display name
 * @type {Record<string, string>}
 */
const levelNames = {
    error: '[ error   ]',
    warn: '[ warning ]',
    info: '[ info    ]',
    debug: '[ debug   ]',
    success: '[ success ]'
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get current time in HH:mm:ss format
 */
function getTimestamp() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

/**
 * Format log output
 * @param {string} timestamp - Timestamp string
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {object} [meta] - Additional metadata
 */
function formatLog(timestamp, level, message, meta) {
    const colorObj = colors[level] || colors.info;
    const fg = typeof colorObj === "string" ? '' : colorObj.fg;
    const bold = colorObj.bold || '';
    const levelName = levelNames[level] || level.toUpperCase();

    let metaStr = '';
    if (meta && Object.keys(meta).length > 0) {
        metaStr = '\n' + JSON.stringify(meta, null, 2);
    }

    // Format: (levelColor)[(white)time(gray)|(levelColor)level(gray)](white) message
    return `${colors.gray}+ ${colors.white}${timestamp} ${bold}${fg}${levelName} ${colors.reset}${levelName == '[ info    ]' ? colors.gray : fg}${message.startsWith("!") ? (fg + message.slice(1)) : message}${colors.reset}${metaStr}`;
}

// ============================================
// Logger Object
// ============================================
/** @type {Logger} */
const logger: Record<string, any> = {};

// ============================================
// 1️⃣ Basic Logging Functions
// ============================================

/**
 * Log info message
 * @param {string} message - The message to log
 * @param {Object} [meta] - Optional metadata object
 * @example logger.info('Application started')
 */
logger.info = function (message, meta) {
    const timestamp = getTimestamp();
    console.log(formatLog(timestamp, 'info', message.toString(), meta));
};

/**
 * Log success message with ✓ icon
 * @param {string} message - The success message
 * @param {Object} [meta] - Optional metadata object
 * @example logger.success('Data saved successfully')
 */
logger.success = function (message, meta) {
    const timestamp = getTimestamp();
    console.log(formatLog(timestamp, 'success', `${message.toString()}`, meta));
};

/**
 * Log warning message
 * @param {string} message - The warning message
 * @param {Object} [meta] - Optional metadata object
 * @example logger.warn('API rate limit approaching')
 */
logger.warn = function (message, meta) {
    const timestamp = getTimestamp();
    console.log(formatLog(timestamp, 'warn', message.toString(), meta));
};

/**
 * Log error message
 * @param {string} message - The error message
 * @param {Object} [meta] - Optional metadata object
 * @example logger.error('Connection failed', { code: 500 })
 */
logger.error = function (message, meta) {
    const timestamp = getTimestamp();
    console.log(formatLog(timestamp, 'error', message.toString(), meta));
};

/**
 * Log debug message
 * @param {string} message - The debug message
 * @param {Object} [meta] - Optional metadata object
 * @example logger.debug('Variable value', { x: 10 })
 */
logger.debug = function (message, meta) {
    const timestamp = getTimestamp();
    console.log(formatLog(timestamp, 'debug', message.toString(), meta));
};

// ============================================
// 2️⃣ Separators and Title Functions
// ============================================

/**
 * Display section title
 * @param {string} title
 */
logger.section = function (title) {
    const separator = '═'.repeat(process.stdout.columns);
    console.log(`${colors.reset}${separator}\n${title}\n${separator}${colors.reset}\n`);
};

/**
 * Display separator line
 * @param {string} [char='─'] - Character to use for line
 * @param {number} [length=80] - Length of line
 */
logger.line = function (char = '─', length = 80) {
    console.log(`${colors.info.fg}${char.repeat(length)}${colors.reset}`);
};

/**
 * Display message box
 * @param {string} message - Message to display
 * @param {string} [type='info'] - Box type (info, success, warn, error)
 */
logger.box = function (message, type = 'info') {
    const colorObj = /** @type {{ fg: string, bold: string }} */
        (colors[type] || colors.info);

    const padding = ' '.repeat(message.length + 4);

    logger.line();
    console.log(
        `${colorObj.fg}${colorObj.bold}+ ${colors.white}${getTimestamp()} ${colorObj.fg}${colorObj.bold}[ ${message} ]`
    );
    logger.line()
};

// ============================================
// 3️⃣ Data Display Functions
// ============================================

/**
 * Display data in table format
 * @param {any} data
*/
logger.table = function (data, title = '') {
    if (title) {
        console.log(`\n${colors.info.fg}${colors.info.bold}📊 ${title}${colors.reset}`);
    }
    console.table(data);
};

/**
 * Display nested object in tree structure
 * @param {any} data
 */
logger.tree = function (data, title = '') {
    if (title) {
        console.log(`\n${colors.success.fg}${colors.success.bold}🌳 ${title}${colors.reset}`);
    }

    /**
     * 
     * @param {{[k: string]: any}} obj
     * @param {string} [prefix='']
     * @param {boolean} [isLast=true]
     */
    const printTree = (obj, prefix = '', isLast = true) => {
        const keys = Object.keys(obj);
        keys.forEach((key, index) => {
            const isLastItem = index === keys.length - 1;
            const connector = isLastItem ? '└── ' : '├── ';
            const value = obj[key];

            // Check if this is a leaf node (no children)
            const isLeaf = typeof value !== 'object' || value === null;

            // Format the value based on type
            let formattedValue = '';
            if (isLeaf) {
                // Leaf node - show colon and value
                if (value === null) {
                    formattedValue = `: ${colors.gray}[null]${colors.reset}`;
                } else if (Array.isArray(value) && value.length === 0) {
                    formattedValue = `: ${colors.gray}[empty array]${colors.reset}`;
                } else {
                    formattedValue = `: ${String(value).replaceAll('\n', ` ${colors.gray}↵${colors.reset} `)}`;
                }
            } else if (typeof value === 'object' && value !== null) {
                // Branch node with children
                if (Array.isArray(value) && value.length === 0) {
                    formattedValue = `: ${colors.gray}[empty array]${colors.reset}`;
                } else if (Object.keys(value).length === 0) {
                    formattedValue = `: ${colors.gray}[empty object]${colors.reset}`;
                }
                // Otherwise no colon, children will be displayed
            }

            console.log(
                `${prefix}${connector}${colors.info.fg}${colors.info.bold}${key}${colors.reset}${formattedValue}`
            );

            // Recursively print children if not a leaf
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                const newPrefix = prefix + (isLastItem ? '    ' : '│   ');
                printTree(value, newPrefix, isLastItem);
            } else if (Array.isArray(value) && value.length > 0) {
                // Handle non-empty arrays
                const newPrefix = prefix + (isLastItem ? '    ' : '│   ');

                /** @type {{ [k: string]: any }} */
                const arrayObj = {};
                value.forEach((item, idx) => {
                    arrayObj[`[${idx}]`] = item;
                });
                printTree(arrayObj, newPrefix, isLastItem);
            }
        });
    };

    printTree(data);
    console.log('');
};

/**
 * Display data in JSON format
 * @param {any} data
*/
logger.json = function (data, title = '') {
    if (title) {
        console.log(`\n${colors.debug.fg}${colors.debug.bold}📋 ${title}${colors.reset}`);
    }
    console.log(JSON.stringify(data, null, 2));
};

/**
 * Display items in list format
 * @param {string[]} items
 * @param {string} [title='']
*/
logger.list = function (items, title = '') {
    if (title) {
        console.log(`\n${colors.info.fg}${colors.info.bold}📝 ${title}${colors.reset}`);
    }

    items.forEach((item, index) => {
        const icon = index === items.length - 1 ? '└' : '├';
        console.log(`${colors.info.fg}${icon}──${colors.reset} ${item}`);
    });
    console.log('');
};

// ============================================
// 4️⃣ Timer Functions
// ============================================

/** @type {Record<string, number>} */
const timers = {};

/** Start timer */
logger.time = function (label = 'default') {
    timers[label] = Date.now();
    this.debug(`⏱ Timer started: ${label}`);
};

/** End timer and display elapsed time */
logger.timeEnd = function (label = 'default') {
    if (!timers[label]) {
        this.warn(`⏱ Timer "${label}" not started`);
        return;
    }

    const duration = Date.now() - timers[label];
    const durationStr = duration > 1000
        ? `${(duration / 1000).toFixed(2)}s`
        : `${duration}ms`;

    this.success(`⏱ ${label} completed, elapsed time: ${colors.info.fg}${durationStr}${colors.reset}`);
    delete timers[label];
};

// ============================================
// 5️⃣ Error Log File Functions
// ============================================

/**
 * Save error log to file in log folder
 * @param {Error | string} error - The error object or error message
 * @param {string} type - The type of error (e.g., 'uncaughtException', 'unhandledRejection', 'custom')
 * @param {Object} [additionalInfo] - Optional additional information
 */
logger.saveErrorLog = function (error, type = 'error', additionalInfo = {}) {
    const logDir = path.join(process.cwd(), 'log');

    // Create log directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    // Generate filename with timestamp
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    const filename = `${dateStr}_${timeStr}_${type}.log`;
    const filepath = path.join(logDir, filename);

    // Format error information
    let logContent = `╔${'═'.repeat(78)}╗\n`;
    logContent += `║ Error Log - ${now.toISOString().replace('T', ' ').split('.')[0]}`.padEnd(79) + '║\n';
    logContent += `║ Type: ${type}`.padEnd(79) + '║\n';
    logContent += `╠${'═'.repeat(78)}╣\n`;

    if (error instanceof Error) {
        logContent += `\n[Error Message]\n${error.message}\n`;
        logContent += `\n[Error Stack]\n${error.stack}\n`;
    } else {
        logContent += `\n[Error Message]\n${String(error)}\n`;
    }

    if (Object.keys(additionalInfo).length > 0) {
        logContent += `\n[Additional Information]\n${JSON.stringify(additionalInfo, null, 2)}\n`;
    }

    logContent += `\n╚${'═'.repeat(78)}╝\n`;

    // Write to file
    try {
        fs.writeFileSync(filepath, logContent, 'utf8');
        this.info(`Error log saved to: ${colors.gray}log/${filename}${colors.reset}`);
        return filepath;
    } catch (writeError) {
        const msg = writeError instanceof Error
            ? writeError.message
            : String(writeError);

        this.error(`Failed to write error log: ${msg}`);
        return null;
    }
};

// ============================================
// 6️⃣ Progress Bar Functions
// ============================================

/**
 * Display progress bar
 * @param {number} current - Current progress value
 * @param {number} total - Total progress value
 * @param {string} [label=''] - Optional label for the progress bar
 * @param {number} [barLength=20] - Length of the progress bar in characters
*/
logger.progress = function (current, total, label = '', barLength = 20) {
    const percentage = (current / total) * 100;
    const filledLength = Math.round((barLength * current) / total);
    const emptyLength = barLength - filledLength;

    const filled = '█'.repeat(filledLength);
    const empty = '░'.repeat(emptyLength);
    const bar = `[${filled}${empty}]`;

    const labelStr = label ? `${label} ` : '';
    const percentStr = percentage.toFixed(0).padStart(3);

    process.stdout.write(
        `\r${colors.success.fg}${labelStr}${bar} ${percentStr}%${colors.reset}`
    );

    if (current === total) {
        console.log();
    }
};

// ============================================
// Export Logger
// ============================================

/**
 * Logger utility with colorful console output and various display formats
 *
 * @typedef {Object} Logger
 * @property {Function} info - Log info message
 * @property {Function} success - Log success message with ✓ icon
 * @property {Function} warn - Log warning message
 * @property {Function} error - Log error message
 * @property {Function} debug - Log debug message
 * @property {Function} section - Display section title with decorative separators
 * @property {Function} line - Display custom separator line
 * @property {Function} box - Display message in a decorative box
 * @property {Function} table - Display data in table format
 * @property {Function} tree - Display nested object in tree structure
 * @property {Function} json - Display data in formatted JSON
 * @property {Function} list - Display items in list format with bullets
 * @property {Function} time - Start a named timer
 * @property {Function} timeEnd - End a named timer and display elapsed time
 * @property {Function} progress - Display an animated progress bar
 * @property {Function} saveErrorLog - Save error log to file in log folder
 */

export default logger;

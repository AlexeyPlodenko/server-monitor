/**
 * @param {string} msg
 */
export function info(msg) {
    console.log('INFO', formatDate(now()), msg);
}

/**
 * @param {...*} args
 */
export function log(...args) {
    console.log('LOG', ...args);
}

/**
 * @param {...*} args
 */
export function d(...args) {
    console.log('DUMP', ...args);
    process.exit(1);
}

/**
 * @returns {Date}
 */
export function now() {
    return new Date();
}

/**
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
    const opt = {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    };

    const dtf = new Intl.DateTimeFormat('en-CA', opt);

    // 'en-CA' (English Canada) conveniently defaults to YYYY-MM-DD
    return dtf.format(date).replace(',', '');
}

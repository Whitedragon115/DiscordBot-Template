import fs from "fs";

/**
 * Write config
 * @param {string} name
 * @param {any} value
 */
export function writeConfig(name, value) {
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
    config[name] = value;
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 4), 'utf-8');
};

/**
 * Read config
 * @param {string} name
 * @returns {any}
 */
export function readConfig(name) {
    const file = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
    return file[name] ?? false;
};

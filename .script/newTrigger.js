import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Select, Input } from 'enquirer';

const triggerTypes = [
    { name: 'button', label: 'button' },
    { name: 'modal', label: 'modal' },
    { name: 'select', label: 'select' }
];

const stateFilePath = join(__dirname, '.newtri-state.json');
const triggerNamePattern = /^[a-z0-9_-]{1,64}$/;

const color = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    magenta: '\x1b[35m',
    dim: '\x1b[2m'
};

const templates = {
    button: `
export default {
    customId: '%CUSTOM_ID%',

    /**
     * @param {import('discord.js').ButtonInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async execute(interaction, client) {
        await interaction.reply({ content: 'Button clicked!', flags: 'Ephemeral' });
    }
};
`,
    modal: `
export default {
    customId: '%CUSTOM_ID%',

    /**
     * @param {import('discord.js').ModalSubmitInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async execute(interaction, client) {
        await interaction.reply({ content: 'Modal submitted!', flags: 'Ephemeral' });
    }
};
`,
    select: `
export default {
    customId: '%CUSTOM_ID%',

    /**
     * @param {import('discord.js').StringSelectMenuInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async execute(interaction, client) {
        const selected = interaction.values;
        await interaction.reply({ content: \`Selected: \${selected.join(', ')}\`, flags: 'Ephemeral' });
    }
};
`
};

function paint(text, kind) {
    return `${color[kind] || ''}${text}${color.reset}`;
}

function createAbortError() {
    const error = new Error('Prompt canceled by user');
    error.name = 'AbortError';
    return error;
}

function isQuietAbortError(error) {
    if (!error) {
        return false;
    }

    if (error.name === 'AbortError') {
        return true;
    }

    if (error.code === 'ERR_USE_AFTER_CLOSE') {
        return true;
    }

    return /readline was closed/i.test(String(error.message || ''));
}

async function runPromptSafe(promptInstance) {
    try {
        return await promptInstance.run();
    } catch (error) {
        if (isQuietAbortError(error)) {
            throw createAbortError();
        }

        throw error;
    }
}

function readState() {
    try {
        if (!existsSync(stateFilePath)) {
            return {};
        }

        return JSON.parse(readFileSync(stateFilePath, 'utf8'));
    } catch {
        return {};
    }
}

function writeState(nextState) {
    const state = readState();
    writeFileSync(stateFilePath, JSON.stringify({ ...state, ...nextState }, null, 2), 'utf8');
}

function getPreview(preview) {
    const type = preview.type || '<type>';
    const folder = preview.folder || '<folder>';
    const file = preview.file || '<file>';
    const customId = preview.customId || '<customId>';
    return [
        `${paint('/trigger', 'magenta')} ${paint(type, 'green')}`,
        `${paint('|', 'dim')} ${paint(`trigger/${folder}/${file}.js`, 'dim')}`,
        `${paint('|', 'dim')} ${paint(`customId: ${customId}`, 'dim')}`
    ].join('\n');
}

function printFrame(preview, promptMessage) {
    console.log('');
    console.log(getPreview(preview));
    console.log(`${paint('>>', 'cyan')} ${promptMessage}`);
}

function validateTriggerName(value) {
    const text = String(value || '').trim();
    if (!text) {
        return 'This field is required.';
    }

    if (!triggerNamePattern.test(text)) {
        return 'Use 1-64 chars: lowercase letters, numbers, -, _';
    }

    return true;
}

function listTriggerFolders() {
    const triggerPath = join(__dirname, '..', 'trigger');
    if (!existsSync(triggerPath)) {
        return [];
    }

    return readdirSync(triggerPath, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b));
}

async function promptSelectType(typeArg, preview) {
    if (typeArg && triggerTypes.some((type) => type.name === typeArg)) {
        writeState({ lastType: typeArg });
        return typeArg;
    }

    const state = readState();
    const initialIndex = Math.max(0, triggerTypes.findIndex((type) => type.name === state.lastType));

    printFrame(preview, 'Choose trigger type');
    const selected = await runPromptSafe(new Select({
        name: 'value',
        message: `${paint('>>', 'cyan')} Type`,
        choices: triggerTypes.map((type) => ({ name: type.name, message: type.label })),
        initial: initialIndex
    }));

    writeState({ lastType: selected });
    return selected;
}

async function promptSelectOrInputFolder(preview) {
    const folders = listTriggerFolders();
    if (!folders.length) {
        printFrame(preview, 'Enter trigger folder (no existing folder found)');
        return runPromptSafe(new Input({
            name: 'value',
            message: `${paint('>>', 'cyan')} Folder`,
            validate: (value) => value && value.trim() ? true : 'This field is required.'
        })).then((value) => value.trim());
    }

    printFrame(preview, 'Choose or create trigger folder');
    const choice = await runPromptSafe(new Select({
        name: 'value',
        message: `${paint('>>', 'cyan')} Folder`,
        choices: [
            ...folders.map((folder) => ({ name: folder, message: folder })),
            { name: '__create_new__', message: paint('-- user input --', 'yellow') }
        ],
        initial: 0
    }));

    if (choice !== '__create_new__') {
        return choice;
    }

    printFrame(preview, 'Enter new trigger folder');
    const typed = await runPromptSafe(new Input({
        name: 'value',
        message: `${paint('>>', 'cyan')} Folder`,
        validate: (value) => value && value.trim() ? true : 'This field is required.'
    }));

    return typed.trim();
}

function printHelp() {
    console.log(paint('Create a Discord trigger file.', 'bold'));
    console.log('');
    console.log('Usage:');
    console.log('  npm run newtri');
    console.log('  npm run newtri <type>');
    console.log('');
    console.log('Features:');
    console.log('  - Arrow key trigger type selection');
    console.log('  - Slash-command style preview frame');
    console.log('  - Choose existing trigger folder or use custom input');
    console.log('  - Quiet Ctrl+C cancellation');
}

async function main() {
    if (process.argv.includes('help') || process.argv.includes('h')) {
        printHelp();
        return;
    }

    const [, , typeArgRaw] = process.argv;
    const typeArg = typeArgRaw ? typeArgRaw.toLowerCase() : '';

    const preview = {};

    const triggerType = await promptSelectType(typeArg, preview);
    preview.type = triggerType;

    const folder = await promptSelectOrInputFolder(preview);
    preview.folder = folder;

    printFrame(preview, 'Enter trigger file name');
    const rawFileName = await runPromptSafe(new Input({
        name: 'value',
        message: `${paint('>>', 'cyan')} File name`,
        validate: validateTriggerName
    }));
    const fileName = rawFileName.trim().endsWith('.js') ? rawFileName.trim() : `${rawFileName.trim()}.js`;
    preview.file = fileName.replace(/\.js$/i, '');

    printFrame(preview, 'Enter trigger customId');
    const customId = (await runPromptSafe(new Input({
        name: 'value',
        message: `${paint('>>', 'cyan')} Custom ID`,
        validate: validateTriggerName
    }))).trim();
    preview.customId = customId;

    const triggerFolderPath = join(__dirname, '..', 'trigger', folder);
    const outputPath = join(triggerFolderPath, fileName);

    if (existsSync(outputPath)) {
        console.log(paint(`File already exists: ${outputPath}`, 'yellow'));
        process.exitCode = 1;
        return;
    }

    mkdirSync(triggerFolderPath, { recursive: true });

    const triggerFileContent = templates[triggerType].replace(/%CUSTOM_ID%/g, customId);
    writeFileSync(outputPath, triggerFileContent, 'utf8');

    console.log(paint(`Created trigger file: ${outputPath}`, 'green'));
}

main().catch((error) => {
    if (isQuietAbortError(error)) {
        return;
    }

    console.error(error);
    process.exit(1);
});
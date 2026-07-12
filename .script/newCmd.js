import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { clearScreenDown, emitKeypressEvents } from 'node:readline';
import { Select, Input } from 'enquirer';

const commandModes = [
    { name: 'command', label: 'command' },
    { name: 'subcommand', label: 'subcommand' },
    { name: 'subgroupcommand', label: 'subcommandgroup' }
];

const stateFilePath = join(__dirname, '.newcmd-state.json');

const color = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    magenta: '\x1b[35m',
    red: '\x1b[31m',
    dim: '\x1b[2m'
};

const slashNamePattern = /^[a-z0-9_-]{1,32}$/;
const BACK_STEP = Symbol('back-step');

const rootIndexTemplate = `
import { SlashCommandBuilder } from 'discord.js';

/**
 * @param {any} options
 * @returns {Promise<any>}
 */
async function getExecuteFile(options) {
    const subCommand = options.getSubcommand();
    const subGroupCommand = options.getSubcommandGroup()
    const subGroupCommandFolder = subGroupCommand ? \`/[${subGroupCommand}]\` : ''
    const filePath = \`.${subGroupCommandFolder}/${subCommand}.js\`;

    return (await import(new URL(filePath, import.meta.url).href)).default;
};

export default {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('server command'),

    /**
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async execute(interaction, client) {
        const executeFile = await getExecuteFile(interaction.options);

        return await executeFile.execute?.(interaction, client)
    },

    /**
     * @param {import('discord.js').AutocompleteInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async autocomplete(interaction, client) {
        const executeFile = await getExecuteFile(interaction.options);

        return await executeFile.autocomplete?.(interaction, client)
    },
}
`;

const commandTemplate = `
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('%COMMAND_NAME%')
        .setDescription('%COMMAND_DESCRIPTION%'),

    /**
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async execute(interaction, client) {


    },

    /**
     * @param {import('discord.js').AutocompleteInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async autocomplete(interaction, client) {


    }
}
`;

const subcommandTemplate = `
import { SlashCommandBuilder, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('%SUBCOMMAND_NAME%')
        .setDescription('%SUBCOMMAND_DESCRIPTION%'),

    /**
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async execute(interaction, client) {


    },

    /**
     * @param {import('discord.js').AutocompleteInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async autocomplete(interaction, client) {


    }
}
`;

const subgroupIndexTemplate = `
import { SlashCommandBuilder, EmbedBuilder, SlashCommandSubcommandGroupBuilder } from 'discord.js';

export default {
    data: new SlashCommandSubcommandGroupBuilder()
        .setName('%SUBCOMMAND_GROUP_NAME%')
        .setDescription('%SUBCOMMAND_GROUP_DESCRIPTION%'),

    /**
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async execute(interaction, client) {


    },

    /**
     * @param {import('discord.js').AutocompleteInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async autocomplete(interaction, client) {


    }
}
`;

const subgroupCommandTemplate = `
import { SlashCommandBuilder, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('%SUBGROUP_COMMAND_NAME%')
        .setDescription('%SUBGROUP_COMMAND_DESCRIPTION%'),

    /**
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async execute(interaction, client) {


    },

    /**
     * @param {import('discord.js').AutocompleteInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async autocomplete(interaction, client) {


    }
}
`;

function paint(text, kind) {
    return `${color[kind] || ''}${text}${color.reset}`;
}

function normalizeRootCommandName(rootName) {
    return String(rootName || '').replace(/^\[|\]$/g, '').trim();
}

function getBracketFolderName(name) {
    return `[${normalizeRootCommandName(name)}]`;
}

function escapeDescription(text) {
    return String(text || '').replace(/'/g, "\\'");
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
    const merged = { ...state, ...nextState };
    writeFileSync(stateFilePath, JSON.stringify(merged, null, 2), 'utf8');
}

function ensureFileDoesNotExist(filePath) {
    if (existsSync(filePath)) {
        console.log(paint(`File already exists: ${filePath}`, 'yellow'));
        process.exitCode = 1;
        return false;
    }

    return true;
}

function writeFileWithCheck(filePath, content) {
    if (!ensureFileDoesNotExist(filePath)) {
        return false;
    }

    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content, 'utf8');
    console.log(paint(`Created file: ${filePath}`, 'green'));
    return true;
}

function listRootCommands(parentFolder) {
    const commandsPath = join(__dirname, '..', 'commands', parentFolder);
    if (!existsSync(commandsPath)) {
        return [];
    }

    return readdirSync(commandsPath, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && /^\[.+\]$/.test(entry.name))
        .map((entry) => normalizeRootCommandName(entry.name))
        .sort((a, b) => a.localeCompare(b));
}

function listSubcommandGroups(parentFolder, rootCommandName) {
    const rootFolderPath = join(__dirname, '..', 'commands', parentFolder, getBracketFolderName(rootCommandName));
    if (!existsSync(rootFolderPath)) {
        return [];
    }

    return readdirSync(rootFolderPath, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && /^\[.+\]$/.test(entry.name))
        .map((entry) => normalizeRootCommandName(entry.name))
        .sort((a, b) => a.localeCompare(b));
}

function listNormalCommandFolders() {
    const commandsPath = join(__dirname, '..', 'commands');
    if (!existsSync(commandsPath)) {
        return [];
    }

    return readdirSync(commandsPath, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !/^\[.+\]$/.test(entry.name))
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b));
}

function paintPreviewSegment(value, isFocused) {
    const text = value || '<...>';
    if (isFocused) {
        return paint(text, 'green');
    }

    return paint(text, 'dim');
}

function getCommandPreview(mode, preview = {}, focusedPart = '') {
    if (mode === 'command') {
        return `/${paintPreviewSegment(preview.command || '<command>', focusedPart === 'command')}`;
    }

    if (mode === 'subcommand') {
        return `/${paintPreviewSegment(preview.root || '<root cmd>', focusedPart === 'root')} ${paintPreviewSegment(preview.sub || '<sub cmd>', focusedPart === 'sub')}`;
    }

    return `/${paintPreviewSegment(preview.root || '<root cmd>', focusedPart === 'root')} ${paintPreviewSegment(preview.sub || '<sub cmd>', focusedPart === 'sub')} ${paintPreviewSegment(preview.subgroup || '<sub group cmd>', focusedPart === 'subgroup')}`;
}

function buildPromptFrameLines(mode, preview, systemPrompt, focusedPart = '') {
    return [
        '',
        `${paint('/', 'magenta')}${getCommandPreview(mode, preview, focusedPart).slice(1)}`,
        `${paint('|', 'dim')} ${paint(systemPrompt, 'dim')}`
    ];
}

function printPromptFrame(mode, preview, systemPrompt, focusedPart = '') {
    const lines = buildPromptFrameLines(mode, preview, systemPrompt, focusedPart);
    console.log(lines.join('\n'));
}

function setRawModeSafe(stdin, enabled) {
    if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
        return;
    }

    try {
        stdin.setRawMode(enabled);
    } catch {
        // Ignore raw mode transition errors on Ctrl+C / closed stdin.
    }
}

function getRequiredValidator(validator) {
    if (validator) {
        return validator;
    }

    return (inputValue) => inputValue && inputValue.trim() ? true : 'This field is required.';
}

async function promptText({ mode, preview, systemPrompt, label, initial = '', focusedPart = '', validator }) {
    printPromptFrame(mode, preview, systemPrompt, focusedPart);
    const value = await runPromptSafe(new Input({
        name: 'value',
        message: `${paint('>>', 'cyan')} ${label}`,
        initial,
        validate: getRequiredValidator(validator)
    }));

    return value.trim();
}

async function promptOptionalText({ mode, preview, systemPrompt, label, initial = '', focusedPart = '', validator }) {
    printPromptFrame(mode, preview, systemPrompt, focusedPart);
    const value = await runPromptSafe(new Input({
        name: 'value',
        message: `${paint('>>', 'cyan')} ${label}`,
        initial,
        validate: validator || (() => true)
    }));

    return value.trim();
}

async function promptSelect({ mode, preview, systemPrompt, label, choices, initial = 0, focusedPart = '' }) {
    printPromptFrame(mode, preview, systemPrompt, focusedPart);
    return runPromptSafe(new Select({
        name: 'value',
        message: `${paint('>>', 'cyan')} ${label}`,
        choices,
        initial
    }));
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

async function promptHorizontalMode({ mode, preview, systemPrompt, label, choices, initial = 0 }) {
    const stdin = process.stdin;
    const stdout = process.stdout;

    // Fallback when raw key handling is not available.
    if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
        return promptSelect({ mode, preview, systemPrompt, label, choices, initial });
    }

    return new Promise((resolve, reject) => {
        let selectedIndex = initial;
        let renderedLines = 0;

        const redraw = () => {
            const row = choices
                .map((choice, index) => {
                    const text = choice.message || choice.name;
                    return index === selectedIndex ? paint(text, 'green') : paint(text, 'dim');
                })
                .join(paint(' | ', 'dim'));

            const lines = [
                `${paint('|', 'dim')} ${paint('Select a command mode', 'dim')}`,
                `[ ${row} ]`,
                `${paint('>>', 'cyan')} ${label}:`
            ];

            if (renderedLines > 0) {
                stdout.write(`\x1b[${Math.max(0, renderedLines - 1)}F`);
                clearScreenDown(stdout);
            }

            stdout.write(lines.join('\n'));
            renderedLines = lines.length;
        };

        const cleanup = () => {
            stdin.off('keypress', onKeypress);
            setRawModeSafe(stdin, false);
            stdin.pause();

            if (renderedLines > 0) {
                stdout.write(`\x1b[${Math.max(0, renderedLines - 1)}F`);
                clearScreenDown(stdout);
            }
        };

        const onKeypress = (_str, key) => {
            if (!key) {
                return;
            }

            if (key.ctrl && key.name === 'c') {
                cleanup();
                reject(createAbortError());
                return;
            }

            if (key.name === 'left' || key.name === 'up') {
                selectedIndex = Math.max(0, selectedIndex - 1);
                redraw();
                return;
            }

            if (key.name === 'right' || key.name === 'down') {
                selectedIndex = Math.min(choices.length - 1, selectedIndex + 1);
                redraw();
                return;
            }

            if (key.name === 'return' || key.name === 'enter') {
                const selected = choices[selectedIndex];
                cleanup();
                resolve(selected.name);
            }
        };

        emitKeypressEvents(stdin);
        setRawModeSafe(stdin, true);
        stdin.resume();
        stdin.on('keypress', onKeypress);
        redraw();
    });
}

async function promptSelectOrInput({ mode, preview, systemPrompt, choices, focusedPart = '', validator }) {
    const stdin = process.stdin;
    const stdout = process.stdout;

    if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
        const picked = await promptSelect({
            mode,
            preview,
            systemPrompt,
            label: 'Choose item',
            choices: [
                ...choices.map((item) => ({ name: item, message: item })),
                { name: '__create_new__', message: '-- user input --' }
            ],
            focusedPart
        });

        if (picked !== '__create_new__') {
            return { value: picked, existed: true };
        }

        const typed = await promptText({
            mode,
            preview,
            systemPrompt,
            label: 'User input',
            focusedPart,
            validator
        });

        return { value: typed, existed: false };
    }

    return new Promise((resolve, reject) => {
        const inputChoiceIndex = choices.length;
        let selectedIndex = 0;
        let typedInput = '';
        let errorText = '';
        let renderedLines = 0;

        const render = () => {
            const lines = [...buildPromptFrameLines(mode, preview, systemPrompt, focusedPart)];

            choices.forEach((item, index) => {
                const text = index === selectedIndex ? paint(item, 'green') : paint(item, 'dim');
                lines.push(`> ${text}`);
            });

            const inputLabel = selectedIndex === inputChoiceIndex
                ? paint('-- user input --', 'green')
                : paint('-- user input --', 'dim');

            lines.push(`> ${inputLabel}`);
            lines.push(`${paint('>>', 'cyan')} ${typedInput}`);

            if (errorText) {
                lines.push(paint(errorText, 'red'));
            }

            if (renderedLines > 0) {
                stdout.write(`\x1b[${Math.max(0, renderedLines - 1)}F`);
                clearScreenDown(stdout);
            }

            stdout.write(lines.join('\n'));
            renderedLines = lines.length;
        };

        const cleanup = () => {
            stdin.off('keypress', onKeypress);
            setRawModeSafe(stdin, false);
            stdin.pause();

            if (renderedLines > 0) {
                stdout.write(`\x1b[${Math.max(0, renderedLines - 1)}F`);
                clearScreenDown(stdout);
            }
        };

        const onKeypress = (str, key) => {
            if (!key) {
                return;
            }

            if (key.ctrl && key.name === 'c') {
                cleanup();
                reject(createAbortError());
                return;
            }

            if (key.name === 'up') {
                errorText = '';
                selectedIndex = Math.max(0, selectedIndex - 1);
                render();
                return;
            }

            if (key.name === 'down') {
                errorText = '';
                selectedIndex = Math.min(inputChoiceIndex, selectedIndex + 1);
                render();
                return;
            }

            if (key.name === 'left') {
                cleanup();
                resolve({ back: true });
                return;
            }

            if (selectedIndex === inputChoiceIndex && key.name === 'backspace') {
                typedInput = typedInput.slice(0, -1);
                errorText = '';
                render();
                return;
            }

            if (selectedIndex === inputChoiceIndex && key.sequence && !key.ctrl && !key.meta && key.name !== 'return' && key.name !== 'enter') {
                typedInput += str;
                errorText = '';
                render();
                return;
            }

            if (key.name === 'return' || key.name === 'enter') {
                if (selectedIndex !== inputChoiceIndex) {
                    const value = choices[selectedIndex];
                    cleanup();
                    resolve({ value, existed: true });
                    return;
                }

                const candidate = typedInput.trim();
                if (!candidate) {
                    errorText = 'Please type a value for -- user input --';
                    render();
                    return;
                }

                if (validator) {
                    const validation = validator(candidate);
                    if (validation !== true) {
                        errorText = validation;
                        render();
                        return;
                    }
                }

                cleanup();
                resolve({ value: candidate, existed: false });
            }
        };

        emitKeypressEvents(stdin);
        setRawModeSafe(stdin, true);
        stdin.resume();
        stdin.on('keypress', onKeypress);
        render();
    });
}

function validateSlashName(inputValue) {
    const value = String(inputValue || '').trim();
    if (!value) {
        return 'This field is required.';
    }

    if (!slashNamePattern.test(value)) {
        return 'Use 1-32 chars: lowercase letters, numbers, -, _';
    }

    return true;
}

function printHelp() {
    console.log(paint('Create a Discord command file.', 'bold'));
    console.log('');
    console.log('Usage:');
    console.log('  npm run newcmd');
    console.log('');
    console.log('Features:');
    console.log('  - Arrow key mode selection');
    console.log('  - Command preview while creating');
    console.log('  - Choose existing root/subcommand group or enter new one');
    console.log('  - Remembers your last selected mode');
}

async function pickMode(modeArg) {
    if (modeArg && commandModes.some((mode) => mode.name === modeArg)) {
        writeState({ lastMode: modeArg });
        return modeArg;
    }

    const state = readState();
    const initialIndex = Math.max(0, commandModes.findIndex((mode) => mode.name === state.lastMode));

    const selected = await promptHorizontalMode({
        mode: 'subgroupcommand',
        preview: {},
        systemPrompt: 'Select a command mode',
        label: 'Choose command mode',
        choices: commandModes.map((mode) => ({ name: mode.name, message: mode.label })),
        initial: initialIndex
    });

    writeState({ lastMode: selected });
    return selected;
}

async function chooseOrEnterName({ mode, preview, promptLabel, systemPrompt, existingNames, createOptionLabel }) {
    if (!existingNames.length) {
        const value = await promptText({
            mode,
            preview,
            systemPrompt,
            label: promptLabel,
            focusedPart: promptLabel.toLowerCase().includes('root') ? 'root' : 'sub',
            validator: validateSlashName
        });

        return { value, existed: false };
    }

    return promptSelectOrInput({
        mode,
        preview,
        systemPrompt: `${systemPrompt} (${createOptionLabel})`,
        choices: existingNames,
        focusedPart: promptLabel.toLowerCase().includes('root') ? 'root' : 'sub',
        validator: validateSlashName
    });
}

async function chooseOrEnterFolder({ mode, preview, systemPrompt, existingFolders }) {
    if (!existingFolders.length) {
        const value = await promptText({
            mode,
            preview,
            systemPrompt,
            label: 'Command folder'
        });

        return value;
    }

    const selected = await promptSelectOrInput({
        mode,
        preview,
        systemPrompt: `${systemPrompt} (Create new folder)`,
        choices: existingFolders,
        focusedPart: ''
    });

    if (selected && selected.back) {
        return BACK_STEP;
    }

    return selected.value;
}

async function ensureRootIndexIfMissing(folderPath, rootCommandName, rootDescription) {
    const rootIndexPath = join(folderPath, 'index.js');
    if (existsSync(rootIndexPath)) {
        return true;
    }

    const rootContent = rootIndexTemplate
        .replace(/%ROOT_COMMAND_NAME%/g, normalizeRootCommandName(rootCommandName))
        .replace(/%ROOT_COMMAND_DESCRIPTION%/g, escapeDescription(rootDescription));

    return writeFileWithCheck(rootIndexPath, rootContent);
}

async function createCommand() {
    const preview = {};

    const commandFolder = await chooseOrEnterFolder({
        mode: 'command',
        preview,
        systemPrompt: 'Choose or enter command folder',
        existingFolders: listNormalCommandFolders()
    });

    if (commandFolder === BACK_STEP) {
        return BACK_STEP;
    }

    const commandName = await promptText({
        mode: 'command',
        preview,
        systemPrompt: 'Enter command name',
        label: 'Command name',
        focusedPart: 'command',
        validator: validateSlashName
    });
    preview.command = commandName;

    const outputPath = join(__dirname, '..', 'commands', commandFolder, `${commandName}.js`);
    if (!ensureFileDoesNotExist(outputPath)) {
        return;
    }

    const commandDescription = await promptText({
        mode: 'command',
        preview,
        systemPrompt: 'Enter command description',
        label: 'Command description',
        focusedPart: 'command'
    });

    const content = commandTemplate
        .replace(/%COMMAND_NAME%/g, commandName)
        .replace(/%COMMAND_DESCRIPTION%/g, escapeDescription(commandDescription));

    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, content, 'utf8');
    console.log(paint(`Created file: ${outputPath}`, 'green'));
}

async function createSubcommand() {
    const preview = {};

    while (true) {
        const parentFolder = await chooseOrEnterFolder({
            mode: 'subcommand',
            preview,
            systemPrompt: 'Choose or enter parent folder under commands/',
            existingFolders: listNormalCommandFolders()
        });

        if (parentFolder === BACK_STEP) {
            return BACK_STEP;
        }

        const rootSelection = await chooseOrEnterName({
            mode: 'subcommand',
            preview,
            promptLabel: 'Root command name',
            systemPrompt: 'Choose or enter a root command',
            existingNames: listRootCommands(parentFolder),
            createOptionLabel: 'Create new root command'
        });

        if (rootSelection && rootSelection.back) {
            continue;
        }

        const rootCommandName = rootSelection.value;
        preview.root = rootCommandName;

        const commandFolderPath = join(__dirname, '..', 'commands', parentFolder, getBracketFolderName(rootCommandName));
        const rootIndexPath = join(commandFolderPath, 'index.js');
        const rootExists = existsSync(rootIndexPath);

        let rootDescription = '';
        if (!rootExists) {
            rootDescription = await promptOptionalText({
                mode: 'subcommand',
                preview,
                systemPrompt: 'Root command is new, description is optional (press Enter to skip)',
                label: 'Root command description (optional)',
                focusedPart: 'root'
            });

            if (!rootDescription) {
                rootDescription = `${rootCommandName} command`;
            }
        }

        const subcommandName = await promptText({
            mode: 'subcommand',
            preview,
            systemPrompt: 'Enter subcommand name',
            label: 'Subcommand name',
            focusedPart: 'sub',
            validator: validateSlashName
        });
        preview.sub = subcommandName;

        const subcommandPath = join(commandFolderPath, `${subcommandName}.js`);
        if (!ensureFileDoesNotExist(subcommandPath)) {
            return;
        }

        const subcommandDescription = await promptText({
            mode: 'subcommand',
            preview,
            systemPrompt: 'Enter subcommand description',
            label: 'Subcommand description',
            focusedPart: 'sub'
        });

        if (!rootExists && !(await ensureRootIndexIfMissing(commandFolderPath, rootCommandName, rootDescription))) {
            return;
        }

        const content = subcommandTemplate
            .replace(/%SUBCOMMAND_NAME%/g, subcommandName)
            .replace(/%SUBCOMMAND_DESCRIPTION%/g, escapeDescription(subcommandDescription));

        writeFileWithCheck(subcommandPath, content);
        return;
    }
}

async function createSubgroupCommand() {
    const preview = {};

    while (true) {
        const parentFolder = await chooseOrEnterFolder({
            mode: 'subgroupcommand',
            preview,
            systemPrompt: 'Choose or enter parent folder under commands/',
            existingFolders: listNormalCommandFolders()
        });

        if (parentFolder === BACK_STEP) {
            return BACK_STEP;
        }

        while (true) {
            const rootSelection = await chooseOrEnterName({
                mode: 'subgroupcommand',
                preview,
                promptLabel: 'Root command name',
                systemPrompt: 'Choose or enter a root command',
                existingNames: listRootCommands(parentFolder),
                createOptionLabel: 'Create new root command'
            });

            if (rootSelection && rootSelection.back) {
                break;
            }

            const rootCommandName = rootSelection.value;
            preview.root = rootCommandName;

            const commandFolderPath = join(__dirname, '..', 'commands', parentFolder, getBracketFolderName(rootCommandName));
            const rootIndexPath = join(commandFolderPath, 'index.js');
            const rootExists = existsSync(rootIndexPath);

            let rootDescription = '';
            if (!rootExists) {
                rootDescription = await promptOptionalText({
                    mode: 'subgroupcommand',
                    preview,
                    systemPrompt: 'Root command is new, description is optional (press Enter to skip)',
                    label: 'Root command description (optional)',
                    focusedPart: 'root'
                });

                if (!rootDescription) {
                    rootDescription = `${rootCommandName} command`;
                }
            }

            const subSelection = await chooseOrEnterName({
                mode: 'subgroupcommand',
                preview,
                promptLabel: 'Sub command group name',
                systemPrompt: 'Choose or enter a sub command group',
                existingNames: listSubcommandGroups(parentFolder, rootCommandName),
                createOptionLabel: 'Create new sub command group'
            });

            if (subSelection && subSelection.back) {
                continue;
            }

            const subcommandName = subSelection.value;
            preview.sub = subcommandName;

            const subgroupFolderPath = join(commandFolderPath, getBracketFolderName(subcommandName));
            const subgroupIndexPath = join(subgroupFolderPath, 'index.js');
            const subgroupIndexExists = existsSync(subgroupIndexPath);

            let subcommandDescription = '';
            if (!subgroupIndexExists) {
                subcommandDescription = await promptOptionalText({
                    mode: 'subgroupcommand',
                    preview,
                    systemPrompt: 'Sub command group is new, description is optional (press Enter to skip)',
                    label: 'Subcommand description (optional)',
                    focusedPart: 'sub'
                });

                if (!subcommandDescription) {
                    subcommandDescription = `${subcommandName} group`;
                }
            }

            const subgroupCommandName = await promptText({
                mode: 'subgroupcommand',
                preview,
                systemPrompt: 'Enter subgroup command name',
                label: 'Subgroupcommand name',
                focusedPart: 'subgroup',
                validator: validateSlashName
            });
            preview.subgroup = subgroupCommandName;

            const subgroupCommandPath = join(subgroupFolderPath, `${subgroupCommandName}.js`);
            if (!ensureFileDoesNotExist(subgroupCommandPath)) {
                return;
            }

            const subgroupCommandDescription = await promptText({
                mode: 'subgroupcommand',
                preview,
                systemPrompt: 'Enter subgroup command description',
                label: 'Subgroupcommand description',
                focusedPart: 'subgroup'
            });

            if (!rootExists && !(await ensureRootIndexIfMissing(commandFolderPath, rootCommandName, rootDescription))) {
                return;
            }

            if (!subgroupIndexExists) {
                const subgroupIndexContent = subgroupIndexTemplate
                    .replace(/%SUBCOMMAND_GROUP_NAME%/g, subcommandName)
                    .replace(/%SUBCOMMAND_GROUP_DESCRIPTION%/g, escapeDescription(subcommandDescription));

                if (!writeFileWithCheck(subgroupIndexPath, subgroupIndexContent)) {
                    return;
                }
            }

            const subgroupCommandContent = subgroupCommandTemplate
                .replace(/%SUBGROUP_COMMAND_NAME%/g, subgroupCommandName)
                .replace(/%SUBGROUP_COMMAND_DESCRIPTION%/g, escapeDescription(subgroupCommandDescription));

            writeFileWithCheck(subgroupCommandPath, subgroupCommandContent);
            return;
        }
    }
}

async function main() {
    if (process.argv.includes('help') || process.argv.includes('h')) {
        printHelp();
        return;
    }

    const [, , modeArgRaw] = process.argv;
    const modeArg = modeArgRaw ? modeArgRaw.toLowerCase() : '';

    while (true) {
        const mode = await pickMode(modeArg);

        if (mode === 'command') {
            const result = await createCommand();
            if (result === BACK_STEP) {
                continue;
            }

            return;
        }

        if (mode === 'subcommand') {
            const result = await createSubcommand();
            if (result === BACK_STEP) {
                continue;
            }

            return;
        }

        if (mode === 'subgroupcommand') {
            const result = await createSubgroupCommand();
            if (result === BACK_STEP) {
                continue;
            }

            return;
        }

        console.log(paint(`Invalid mode: ${mode}`, 'red'));
        process.exitCode = 1;
        return;
    }
}

main().catch((error) => {
    if (isQuietAbortError(error)) {
        return;
    }

    console.error(error);
    process.exit(1);
});

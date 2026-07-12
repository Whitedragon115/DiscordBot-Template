

import { SlashCommandBuilder } from 'discord.js';

/**
 * @param {any} options
 * @returns {Promise<any>}
 */
async function getExecuteFile(options) {
    const subCommand = options.getSubcommand();
    const subGroupCommand = options.getSubcommandGroup()
    const subGroupCommandFolder = subGroupCommand ? `/[${subGroupCommand}]` : ''
    const filePath = `.${subGroupCommandFolder}/${subCommand}.js`;

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

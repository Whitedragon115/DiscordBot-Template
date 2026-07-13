
import { SlashCommandBuilder, EmbedBuilder, SlashCommandSubcommandGroupBuilder } from 'discord.js';

export default {
    data: new SlashCommandSubcommandGroupBuilder()
        .setName('sub-command')
        .setDescription('sub-command group'),

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


import { SlashCommandBuilder, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('sub-command-2')
        .setDescription('this is a sub command'),

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

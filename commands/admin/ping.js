const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const logger = require('../../function/log');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin-ping')
        .setDescription('Replies with Pong!'),

    /**
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     * @param {import('discord.js').Client} client
     */

    async execute(interaction, client) {

        const embed = new EmbedBuilder()
            .setTitle('Pong! 🏓')
            .setDescription(`Latency is \`${interaction.createdTimestamp - Date.now()}ms\``)
            .setColor(0x00FF00);

        await interaction.reply({ embeds: [embed], flags: 'Ephemeral' });
    },

    /**
     * @param {import('discord.js').AutocompleteInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async autocomplete(interaction, client) {


    }
}
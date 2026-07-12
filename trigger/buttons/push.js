export default {
    customId: 'push',

    /**
     * @param {import('discord.js').ButtonInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async execute(interaction, client) {
        await interaction.reply({ content: 'Button pushed!', ephemeral: true });
    }
}
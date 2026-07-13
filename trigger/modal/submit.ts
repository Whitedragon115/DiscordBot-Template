export default {
    customId: 'submit',

    /**
     * @param {import('discord.js').ModalSubmitInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async execute(interaction, client) {
        await interaction.reply({ content: 'Modal submitted!', flags: 'Ephemeral' });
    }
}
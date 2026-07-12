import { Events, EmbedBuilder } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import logger from '../function/log.js';

export default {
	name: Events.InteractionCreate,

	/**
	 * @param {import('discord.js').Interaction} interaction 
	 * @param {import('discord.js').Client & {rcon: import('rcon-client').Rcon}} client 
	 */

	async execute(interaction, client) {
		const isButton = interaction.isButton();
		const isModalSubmit = interaction.isModalSubmit();
		if (!isButton && !isModalSubmit) return;

		const pageMatch = interaction.customId && interaction.customId.match(/^page\:(\d+)_/);
		if (!pageMatch) return;

		const page = parseInt(pageMatch[1]);
		const customId = interaction.customId.replace(/^page\:(\d+)_/, 'page_');

		/** @type {{ [k: string]: any }} */
		const Action = {};
		/** @type {{ [k: string]: boolean }} */
		const AdminMap = {};

		const ActionFolderPath = join(process.cwd(), 'trigger');
		const actionFolders = readdirSync(ActionFolderPath);

		for (const folder of actionFolders) {
			const actionPath = join(ActionFolderPath, folder);
			const actionFiles = readdirSync(actionPath).filter(file => file.endsWith('.js'));
			for (const file of actionFiles) {
				const filePath = join(actionPath, file);
				const { default: action } = await import(new URL(filePath, import.meta.url).href);
				const admin = file.includes('[admin]') ? true : false;

				Action[action.customId] = action;
				AdminMap[action.customId] = admin;
			}
		}

		const action = Action[customId];
		const isAdminAction = AdminMap[customId];

		if (action) {
			try {
				await action.execute(interaction, client, page);
			} catch (error) {
				const replied = interaction.replied || interaction.deferred;
				logger.error(`Error executing command ${interaction.customId}`)
				logger.error(error instanceof Error ? error.stack : error);

				const embed = new EmbedBuilder()
					.setTitle('Error ❌')
					.setDescription('There was an error while executing this command.')
					.setColor(0xFF0000);

				return replied ?
					await interaction.editReply({ embeds: [embed] }) :
					await interaction.reply({ embeds: [embed], flags: 'Ephemeral' });
			}
		}
	},
};
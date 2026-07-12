import { Events, EmbedBuilder } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import logger from '../function/log.js';
import MyClient from '../utils/myClient.js';

export default {
	name: Events.InteractionCreate,

	/**
	 * @param {import('discord.js').Interaction} intertrigger 
	 * @param {MyClient & {rcon: import('rcon-client').Rcon}} client
	 */

	async execute(intertrigger, client) {
		if (!intertrigger.isButton() && !intertrigger.isModalSubmit()) return;

		/** @type {{ [k: string]: any }} */
		const Trigger = {};
		/** @type {{ [k: string]: boolean }} */
		const AdminMap = {};

		const TriggerFolderPath = join(process.cwd(), 'trigger');
		const triggerFolders = readdirSync(TriggerFolderPath);

		for (const folder of triggerFolders) {
			const triggerPath = join(TriggerFolderPath, folder);
			const triggerFiles = readdirSync(triggerPath).filter(file => file.endsWith('.js'));
			for (const file of triggerFiles) {
				const filePath = join(triggerPath, file);
				const { default: trigger } = await import(new URL(filePath, import.meta.url).href);
				const admin = file.includes('[admin]') ? true : false;

				Trigger[trigger.customId] = trigger;
				AdminMap[trigger.customId] = admin;
			}
		}

		const trigger = Trigger[intertrigger.customId];
		const isAdminTrigger = AdminMap[intertrigger.customId];

		if (trigger) {
			try {
				await trigger.execute(intertrigger, client);
			} catch (error) {

				const replied = intertrigger.replied || intertrigger.deferred;
				logger.error(`Error executing command ${intertrigger.customId}`)
				logger.error(error instanceof Error ? error.stack : error);

				const embed = new EmbedBuilder()
					.setTitle('Error ❌')
					.setDescription('There was an error while executing this command.')
					.setColor(0xFF0000);

				return replied ?
					await intertrigger.editReply({ embeds: [embed] }) :
					await intertrigger.reply({ embeds: [embed], flags: 'Ephemeral' });
			}
		}
	},
};
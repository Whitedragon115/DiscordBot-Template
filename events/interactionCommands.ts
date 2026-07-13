import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'node:url';

import { Events, EmbedBuilder, GuildMemberRoleManager } from 'discord.js';
import config from '../config.json' with { type: 'json' };
import MyClient from '../utils/myClient.js';
import logger from '../function/log.js';

const { AdminRoleId } = config;
const moduleFileExtension = path.extname(import.meta.filename);
const Command = LoadCommandFolder();

export default {
	name: Events.InteractionCreate,

	/**
	 * @param {import('discord.js').Interaction} interaction
	 * @param {import('discord.js').ChatInputCommandInteraction} interaction
	 * @param {MyClient} client
	 */

	async execute(interaction, client) {
		const isChatInputCommand = interaction.isChatInputCommand();
		const isAutocomplete = interaction.isAutocomplete();

		if (!isChatInputCommand && !isAutocomplete) return;

		const command = client.commands.get(interaction.commandName);
		if (!command) return logger.warn(`No command matching ${interaction.commandName} was found.`);

		try {
			const commandFolder = (await Command)[interaction.commandName].folder

			if (
				(commandFolder.startsWith('admin-') || commandFolder == 'admin')
				&& (!interaction.member || (
					interaction.member.roles instanceof GuildMemberRoleManager
						? interaction.member.roles.cache.some(rl => rl.id == AdminRoleId)
						: interaction.member.roles.some(rl => rl == AdminRoleId)
				))
			) {
				const embed = new EmbedBuilder()
					.setTitle('Permission Denied ❌')
					.setDescription('You do not have permission to use this command.')
					.setColor(0xFF0000);

				if (isChatInputCommand) await interaction.reply({ embeds: [embed], flags: 'Ephemeral' });
				return
			}

			if (isAutocomplete) return await command.autocomplete(interaction, client)
			if (isChatInputCommand) return await command.execute(interaction, client)

		} catch (error) {
			const replied = isChatInputCommand ? (interaction.replied || interaction.deferred) : null;

			logger.error(`Error executing command ${interaction.commandName}`);
			logger.error(error instanceof Error ? error.stack : error);

			const embed = new EmbedBuilder()
				.setTitle('Error ❌')
				.setDescription('There was an error while executing this command.')
				.setColor(0xFF0000);

			if (!isChatInputCommand) return;

			if (replied) {
				await interaction.editReply({ embeds: [embed] })
			} else {
				await interaction.reply({ embeds: [embed], flags: 'Ephemeral' });
			};
		}
	},
};

async function LoadCommandFolder() {
	/** @type {{ [k: string]: any }} */
	const commands = {};
	const CommandFolderPath = path.join(import.meta.dirname, '..', 'commands');
	const commandFolders = fs.readdirSync(CommandFolderPath);

	for (const folder of commandFolders) {
		const commandPath = path.join(CommandFolderPath, folder);
		const commandFiles = fs.readdirSync(commandPath).filter(file => file.endsWith(moduleFileExtension));
		const subCommandRegex = /^\[(.*)\]$/;
		const subCommandFiles = fs.readdirSync(commandPath).filter(file => fs.statSync(path.join(commandPath, file)).isDirectory() && subCommandRegex.test(file));

		for (const file of commandFiles) {
			const filePath = path.join(commandPath, file);
			const { default: command } = await import(pathToFileURL(filePath).href);

			command.folder = folder;
			commands[command.data.name] = command;
		}

		for (const subCommandFolder of subCommandFiles) {
			const subCommandPath = path.join(commandPath, subCommandFolder);
			const subCommandIndexPath = path.join(subCommandPath, `index${moduleFileExtension}`);
			const { default: subCommand } = await import(pathToFileURL(subCommandIndexPath).href);

			subCommand.folder = folder;
			commands[subCommand.data.name] = subCommand;
		}
	}

	return commands;
};

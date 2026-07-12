import { REST, Routes } from 'discord.js';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

const commands = [];
const foldersPath = join(__dirname, '..', 'commands');
const commandFolders = readdirSync(foldersPath);

const subCommandsFolderRegex = /^\[.*\]$/

for (const folder of commandFolders) {
	const commandsPath = join(foldersPath, folder);
	const files = readdirSync(commandsPath);
	const commandFiles = files.filter(file => file.endsWith('.js'));
	const subCommand = files.filter(file => subCommandsFolderRegex.test(file));

	// Normal Command Process
	for (const file of commandFiles) {

		const filePath = join(commandsPath, file);
		const { default: command } = await import(new URL(filePath, import.meta.url).href);

		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
		} else {
			console.log(`[WARNING] The command at "${filePath}" is missing a required "data" or "execute" property.`);
		}
	}

	for (const folder of subCommand) {

		const subFiles = readdirSync(join(commandsPath, folder));
		const subCommandFiles = subFiles.filter(file => file !== 'index.js' && file.endsWith('.js'));
		const subGroupFiles = subFiles.filter(file => statSync(join(commandsPath, folder, file)).isDirectory() && subCommandsFolderRegex.test(file));

		const rootCommandPath = join(commandsPath, folder, 'index.js')
		const { default: rootCommandData } = await import(new URL(rootCommandPath, import.meta.url).href);

		//Process Subcommand
		for (const subFile of subCommandFiles) {
			const filePath = join(commandsPath, folder, subFile);
			const { default: command } = await import(new URL(filePath, import.meta.url).href);

			if ('data' in command && 'execute' in command) {
				rootCommandData.data.addSubcommand(command.data);
			} else {
				console.log(`[WARNING] The command at "${filePath}" is missing a required "data" or "execute" property.`);
			}
		}

		//Process Subcommand Group
		for (const subGroup of subGroupFiles) {
			const subGroupFilePath = join(commandsPath, folder, subGroup, 'index.js')
			const { default: subGroupData } = await import(new URL(subGroupFilePath, import.meta.url).href);
			const subGroupCommandFiles = readdirSync(join(commandsPath, folder, subGroup)).filter(file => file !== 'index.js' && file.endsWith('.js'));

			for (const subGroupCommandFile of subGroupCommandFiles) {
				const filePath = join(commandsPath, folder, subGroup, subGroupCommandFile);
				const { default: command } = await import(new URL(filePath, import.meta.url).href);
				if ('data' in command && 'execute' in command) {
					subGroupData.data.addSubcommand(command.data);
				} else {
					console.log(`[WARNING] The command at "${filePath}" is missing a required "data" or "execute" property.`);
				}
			}

			rootCommandData.data.addSubcommandGroup(subGroupData.data);
		}

		commands.push(rootCommandData.data.toJSON());
	}
}

const rest = new REST().setToken(process.env.TOKEN);

(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		const data = await rest.put(
			Routes.applicationGuildCommands(process.env.CLIENTID, process.env.GUILDID),
			{ body: commands },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
})();
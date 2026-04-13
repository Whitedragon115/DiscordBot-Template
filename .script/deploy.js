const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const commands = [];
const foldersPath = path.join(__dirname, '..', 'commands');
const commandFolders = fs.readdirSync(foldersPath);

const subCommandsFolderRegex = /^\[.*\]$/

for (const folder of commandFolders) {

	const commandsPath = path.join(foldersPath, folder);
	const files = fs.readdirSync(commandsPath);
	const commandFiles = files.filter(file => file.endsWith('.js'));
	const subCommand = files.filter(file => subCommandsFolderRegex.test(file));

	// Normal Command Process
	for (const file of commandFiles) {

		const filePath = path.join(commandsPath, file);
		const command = require(filePath);

		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
		} else {
			console.log(`[WARNING] The command at "${filePath}" is missing a required "data" or "execute" property.`);
		}
	}

	for(const folder of subCommand){

		const subFiles = fs.readdirSync(path.join(commandsPath, folder));
		const subCommandFiles = subFiles.filter(file => file !== 'index.js' && file.endsWith('.js'));
		const subGroupFiles = subFiles.filter(file => fs.statSync(path.join(commandsPath, folder, file)).isDirectory() && subCommandsFolderRegex.test(file));

		const rootCommandData = require(path.join(commandsPath, folder, 'index.js'));

		//Process Subcommand
		for (const subFile of subCommandFiles) {
			const filePath = path.join(commandsPath, folder, subFile);
			const command = require(filePath);
			if ('data' in command && 'execute' in command) {
				rootCommandData.data.addSubcommand(command.data);
			} else {
				console.log(`[WARNING] The command at "${filePath}" is missing a required "data" or "execute" property.`);
			}
		}
		
		//Process Subcommand Group
		for(const subGroup of subGroupFiles){
			const subGroupData = require(path.join(commandsPath, folder, subGroup, 'index.js'));
			const subGroupCommandFiles = fs.readdirSync(path.join(commandsPath, folder, subGroup)).filter(file => file !== 'index.js' && file.endsWith('.js'));

			for(const subGroupCommandFile of subGroupCommandFiles){
				const filePath = path.join(commandsPath, folder, subGroup, subGroupCommandFile);
				const command = require(filePath);
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
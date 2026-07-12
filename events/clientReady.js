import { Events, Client } from 'discord.js';
import { color } from 'console-log-colors';
import logger from '../function/log.js';

export default {
    name: Events.ClientReady,
    once: true,
    /**
     * @param {Client} client
     */
    execute: async function (client) {
        const guildID = process.env.GUILDID;
        if (guildID === undefined) {
            logger.warn("GUILDID is not set in .env file");
            return;
        };

        const guild = client.guilds.cache.get(guildID);
        if (!guild) {
            logger.warn(`Guild with ID ${guildID} not found.`);
            return;
        }

        const memberCount = guild.memberCount;
        const login_string = `${color.green('Login Bot : ')} ${color.yellow(client.user?.tag)}  ║  ${color.green('BotID :')} ${color.yellow(process.env.CLIENTID)}  ║  ${color.green('Server :')} ${color.yellow(guild.name)}  ║  ${color.green('Server Member :')} ${color.yellow(memberCount)}`;
        logger.section(login_string);
    },
}
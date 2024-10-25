import { Client, GatewayIntentBits, TextChannel, ChannelType, Guild, Message } from 'discord.js';

class DiscordBotManager {
    private client: Client;
    private guildId: string;  // Server ID where the channel will be created or retrieved
    private botUserId: string; // Bot ID for MidJourney

    constructor(token: string, guildId: string, botUserId: string) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
            ],
        });
        this.guildId = guildId;
        this.botUserId = botUserId;

        // Log in to Discord with the token
        this.client.login(token);
        
        this.client.once('ready', () => {
            console.log(`Logged in as ${this.client.user?.tag}`);
						console.log("listGuilds =>",this.client.guilds.cache);
						
						this.listGuilds();
        });
    }

		async listGuilds(): Promise<void> {
			this.client.guilds.cache.forEach((guild) => {
					console.log(`Guild Name: ${guild.name}, ID: ${guild.id}`);
			});
	}
	

    // Method to create a private channel
    async createPrivateChannel(channelName: string): Promise<TextChannel | null> {
        const guild = await this.getGuildById(this.guildId);
        if (!guild) {
            console.error('Guild not found');
            return null;
        }

        try {
            const channel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id, // Disable everyone access
                        deny: ['ViewChannel'],
                    },
                    {
                        id: this.botUserId, // Allow bot to access
                        allow: ['ViewChannel', 'SendMessages'],
                    },
                    {
                        id: this.client.user?.id!, // Allow your bot to access
                        allow: ['ViewChannel', 'SendMessages'],
                    },
                ],
            });

            console.log(`Private channel "${channelName}" created!`);
            return channel as TextChannel;
        } catch (error) {
            console.error('Error creating private channel:', error);
            return null;
        }
    }

    // Method to retrieve a previously created private channel by name or ID
    async getPrivateChannel(channelIdOrName: string): Promise<TextChannel | null> {
        const guild = await this.getGuildById(this.guildId);
        if (!guild) {
            console.error('Guild not found');
            return null;
        }

        const channel = guild.channels.cache.find(
            (ch) =>
                (ch.type === ChannelType.GuildText && ch.name === channelIdOrName) ||
                ch.id === channelIdOrName
        ) as TextChannel | undefined;

        if (!channel) {
            console.error('Channel not found');
            return null;
        }

        console.log(`Found channel "${channel.name}"`);
        return channel;
    }

		async listChannels(): Promise<void> {
			const guild = await this.getGuildById(this.guildId);
			if (!guild) {
					console.error('Guild not found');
					return;
			}
	
			guild.channels.cache.forEach((channel) => {
					if (channel.type === ChannelType.GuildText) {
							console.log(`Channel Name: ${channel.name}, ID: ${channel.id}`);
					}
			});
	}
	

    // Helper method to fetch the guild (server) by ID
    private async getGuildById(guildId: string): Promise<Guild | null> {
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
            console.error('Guild not found');
            return null;
        }
        return guild;
    }

    // Method to send a message to the private channel
    async sendMessageToChannel(channel: TextChannel, content: string): Promise<Message | null> {
        try {
            const message = await channel.send(content);
            console.log('Message sent!');
            return message;
        } catch (error) {
            console.error('Error sending message:', error);
            return null;
        }
    }

    // Method to check if MidJourney has responded in the channel
    async checkBotResponse(channel: TextChannel, botResponseCheckInterval: number = 5000): Promise<boolean> {
        return new Promise((resolve) => {
            const interval = setInterval(async () => {
                const messages = await channel.messages.fetch({ limit: 10 });
                const botMessage = messages.find(msg => msg.author.id === this.botUserId);
                if (botMessage) {
                    console.log('Bot responded:', botMessage.content);
                    clearInterval(interval);
                    resolve(true);
                }
            }, botResponseCheckInterval);
        });
    }

    // Method to delete the message once the bot completes the task
    async deleteMessage(message: Message): Promise<void> {
        try {
            await message.delete();
            console.log('Message deleted!');
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    }
}
// http://localhost:3000/api?code=0DogchzBtNiGj9g1Pedgrz0suikVuF&guild_id=1291429233536536718&permissions=68624
// Example usage
(async () => {
	const token = ''; // Discord bot token
	const guildId = '1291429233536536718'; // Your server ID
	const channelID = '1294702522728185938'
	const botUserId = '936929561302675456'; // MidJourney bot user ID  936929561302675456 ?

	const botManager = new DiscordBotManager(token, guildId, botUserId);
	
	// console.log("this.client.guilds.cache",botManager.client.guilds.cache);
	
	// await botManager.listGuilds();
	const privateChannel = await botManager.getPrivateChannel(channelID);
	console.log('privateChannel =>',privateChannel);
	// const listChannels = await botManager.listChannels();
	// console.log('listChannels =>',listChannels);

	// // Create a private channel
	// const privateChannel = await botManager.createPrivateChannel('private-room');
	// console.log(privateChannel);

	// if (privateChannel) {
	// 	// Send a message to the private channel
		// const message = await botManager.sendMessageToChannel(privateChannel, 'Generate image request');

	// 	// Check if the bot has responded
	// 	const isBotResponded = await botManager.checkBotResponse(privateChannel);

	// 	if (isBotResponded && message) {
	// 		// Delete the message after the bot has responded
	// 		await botManager.deleteMessage(message);
	// 	}
	// }	
})();

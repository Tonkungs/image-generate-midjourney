import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import { config } from 'dotenv';

// Load environment variables
config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const TOKEN = ""; // Discord bot token
const CHANNEL_ID = "1294702522728185938";

client.once('ready', () => {
  console.log('Bot is ready!');
});

client.on('messageCreate', async (message) => {
  // console.log("message", message);

  if (message.author.bot) return;

  // if (message.content.startsWith('!send')) {
  //   const content = message.content.slice(6).trim();
  //   const channel = await client.channels.fetch(CHANNEL_ID) as TextChannel;

  //   if (channel) {
  //     await channel.send(content);
  //     console.log(`Message sent to channel: ${content}`);
  //   } else {
  //     console.error('Channel not found');
  //   }
  // }

  // Command to generate an image
  if (message.content.startsWith('!generate')) {
    const prompt = message.content.slice(9); // Get the prompt after the command
    const channel = await client.channels.fetch(CHANNEL_ID) as TextChannel;
    if (!prompt) {
      channel.send('Please provide a prompt for the image generation.');
      return;
    }

    // Send command to MidJourney
    try {
      await channel.send(`/imagine ${prompt}`);
      channel.send(`Generating image for: **${prompt}**`);
    } catch (error) {
      console.error('Error sending message:', error);
      channel.send('There was an error generating the image.');
    }
  }
});

client.login(TOKEN);
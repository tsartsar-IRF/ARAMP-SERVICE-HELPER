const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { DISCORD_TOKEN } = require('./config');
const { registerCommands } = require('./commands');
const server = require('./server');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel]
});

client.commands = new Collection();
registerCommands(client);

client.once('ready', async () => {
  console.log(`${client.user.tag} is online!`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction, client);
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: 'Error executing command.', ephemeral: true });
  }
});

client.login(DISCORD_TOKEN);
server();


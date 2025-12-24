const { Client, Collection, GatewayIntentBits } = require('discord.js');
const commands = require('./commands');
const { TOKEN } = require('./config');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();
for (const cmd of commands) {
  client.commands.set(cmd.data.name, cmd);
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);
    interaction.reply({ content: 'Error executing command.', ephemeral: true });
  }
});

client.login(TOKEN);

console.log("🚀 index.js loaded");

const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { startServer } = require("./server");
const { registerCommands } = require("./commands");
const { TOKEN } = require("./config");

// Keep-alive server for Render/UptimeRobot
startServer();

// Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

registerCommands(client);

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("error", (e) => console.error("Discord client error:", e));
client.on("shardError", (e) => console.error("Discord shard error:", e));

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error("Command execution error:", err);

    // If we already deferred, editReply is safe. Otherwise reply.
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("❌ Error running command.");
      } else {
        await interaction.reply({ content: "❌ Error running command.", ephemeral: true });
      }
    } catch {}
  }
});

console.log("🔑 Attempting Discord login...");
client.login(TOKEN);

const express = require("express");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { TOKEN, PORT } = require("./config");
const { registerCommands } = require("./commands");

console.log("🚀 index.js loaded");

// Keep-alive server (Render + UptimeRobot)
const app = express();
app.get("/", (req, res) => res.send("Bot is alive ✅"));
app.listen(PORT, () => console.log(`Keep-alive server running on port ${PORT}`));

// Discord bot
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

client.on("error", (e) => console.error("Discord client error:", e));
client.on("shardError", (e) => console.error("Discord shard error:", e));
client.on("warn", (m) => console.warn("Discord warn:", m));

registerCommands(client);

client.once("ready", () => {
  console.log("✅ Discord READY event fired");
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error("Interaction handler error:", err);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("❌ Command crashed.");
      } else {
        await interaction.reply({ content: "❌ Command crashed.", ephemeral: true });
      }
    } catch {}
  }
});

console.log("🔑 Attempting Discord login...");
client.login(TOKEN);

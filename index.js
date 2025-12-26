console.log("🚀 index.js loaded");

const express = require("express");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { TOKEN } = require("./config");
const { registerCommands } = require("./commands");

// Keep-alive server
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.status(200).send("Bot is alive ✅"));
app.listen(PORT, () => console.log(`Keep-alive server running on port ${PORT}`));

// Discord bot
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

registerCommands(client);

client.once("ready", () => {
  console.log("✅ Discord READY event fired");
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error("❌ Command error:", err);

    const msg = "❌ Command failed (timeout/network). Try again in a moment.";

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: msg, ephemeral: true });
      } else {
        await interaction.reply({ content: msg, ephemeral: true });
      }
    } catch (e) {
      console.error("❌ Failed to send error reply:", e);
    }
  }
});

console.log("🔑 Attempting Discord login...");
client.login(TOKEN);

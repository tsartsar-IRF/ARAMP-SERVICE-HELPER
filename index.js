console.log("🚀 index.js loaded");

const express = require("express");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { TOKEN } = require("./config");
const { registerCommands } = require("./commands");

// Keep-alive server (Render + UptimeRobot)
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("Bot is alive ✅"));
app.listen(PORT, () => console.log(`Keep-alive server running on port ${PORT}`));

// Discord
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
    console.error("interactionCreate error:", err);

    // If something blew up before we replied, try to respond safely
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: "Command error.", ephemeral: true });
      } else {
        await interaction.reply({ content: "Command error.", ephemeral: true });
      }
    } catch (e) {
      console.error("Failed to send error reply:", e);
    }
  }
});

console.log("🔑 Attempting Discord login...");
client.login(TOKEN);

console.log("🚀 index.js loaded");

const express = require("express");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { TOKEN } = require("./config");
const { registerCommands } = require("./commands");

// Keep-alive server
const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => res.status(200).send("OK"));
app.get("/health", (req, res) => res.status(200).json({ ok: true, ts: Date.now() }));

app.listen(PORT, () => {
  console.log(`Keep-alive server running on port ${PORT}`);
});

// Discord bot
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

process.on("unhandledRejection", (err) => console.error("UnhandledRejection:", err));
process.on("uncaughtException", (err) => console.error("UncaughtException:", err));

registerCommands(client);

console.log("🔑 Attempting Discord login...");
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
    console.error("Command error:", err);

    // Always try to respond so Discord doesn't say "did not respond"
    try {
      if (interaction.deferred) {
        await interaction.editReply("❌ Error running that command.");
      } else if (interaction.replied) {
        await interaction.followUp({ content: "❌ Error running that command.", ephemeral: true });
      } else {
        await interaction.reply({ content: "❌ Error running that command.", ephemeral: true });
      }
    } catch (e) {
      console.error("Failed to send error reply:", e);
    }
  }
});

client.login(TOKEN);

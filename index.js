console.log("🚀 index.js loaded");

const express = require("express");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { TOKEN, PORT } = require("./config");
const { registerCommands } = require("./commands");

// Keep-alive server
const app = express();
app.get("/", (req, res) => res.send("Bot is alive ✅"));
app.listen(PORT, () => console.log(`Keep-alive server running on port ${PORT}`));

// Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Debug events (these are CRUCIAL when login “hangs”)
client.on("error", (e) => console.error("❌ Discord client error:", e));
client.on("warn", (m) => console.warn("⚠️ Discord warn:", m));
client.on("shardError", (e) => console.error("❌ Shard error:", e));
client.on("shardDisconnect", (event, id) => console.warn(`⚠️ Shard ${id} disconnected:`, event?.reason));
client.on("shardReconnecting", (id) => console.warn(`⚠️ Shard ${id} reconnecting...`));
client.on("invalidated", () => console.error("❌ Client invalidated (Discord session)"));

client.once("ready", () => {
  console.log("✅ Discord READY event fired");
  console.log(`✅ Logged in as ${client.user.tag}`);
});

registerCommands(client);

(async () => {
  try {
    if (!TOKEN) throw new Error("DISCORD_TOKEN missing");
    console.log(`✅ DISCORD_TOKEN present (length: ${TOKEN.length})`);
    console.log("🔑 Attempting Discord login...");
    await client.login(TOKEN);
  } catch (err) {
    console.error("❌ Discord login failed:", err);
    process.exit(1);
  }
})();

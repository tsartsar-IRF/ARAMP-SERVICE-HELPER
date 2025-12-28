const { SlashCommandBuilder, REST, Routes, EmbedBuilder } = require("discord.js");
const { appendRow, getXpRowByRobloxUsername } = require("./sheets");
const { blockBar } = require("./progress");
const { CLIENT_ID, GUILD_ID, ROWIFI_TOKEN, LOG_ROLE_ID } = require("./config");

// ----- helpers -----
function hasRole(member, roleId) {
  if (!roleId) return true; // don't hard-lock if you forgot to set
  return member.roles?.cache?.has(roleId);
}

// Simple in-memory cache to reduce API calls
const rowifiCache = new Map(); // discordId -> { username, ts }
const CACHE_MS = 5 * 60 * 1000;

function fetchWithTimeout(url, options = {}, ms = 8000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(t));
}

// Discord -> Roblox username via RoWifi + Roblox Users API
async function getRobloxUsernameFromRowifi(guildId, discordUserId) {
  if (!ROWIFI_TOKEN) return null;

  const cached = rowifiCache.get(discordUserId);
  if (cached && Date.now() - cached.ts < CACHE_MS) return cached.username;

  // RoWifi v3 base URL and auth format :contentReference[oaicite:1]{index=1}
  const rowifiUrl = `https://api.rowifi.xyz/v3/guilds/${guildId}/members/${discordUserId}`;

  const r1 = await fetchWithTimeout(rowifiUrl, {
    headers: {
      Authorization: `Bot ${ROWIFI_TOKEN}`,
      "Content-Type": "application/json",
    },
  }, 8000);

  if (!r1.ok) return null;
  const data = await r1.json();

  const robloxId = data?.roblox_id;
  if (!robloxId) return null;

  // Roblox username lookup
  const robloxUrl = `https://users.roblox.com/v1/users/${robloxId}`;
  const r2 = await fetchWithTimeout(robloxUrl, { headers: { "Content-Type": "application/json" } }, 8000);
  if (!r2.ok) return null;
  const u = await r2.json();

  const username = u?.name;
  if (!username) return null;

  rowifiCache.set(discordUserId, { username, ts: Date.now() });
  return username;
}

// ----- slash command definitions -----
const commandsData = [
  new SlashCommandBuilder().setName("xp").setDescription("Check XP (uses RoWifi Roblox username)"),

  new SlashCommandBuilder()
    .setName("log")
    .setDescription("Log an event (restricted role)")
    .addStringOption((opt) =>
      opt
        .setName("type")
        .setDescription("Event type")
        .setRequired(true)
        .addChoices(
          { name: "Combat Training", value: "Combat Training" },
          { name: "Patrol", value: "Patrol" },
          { name: "Recruitment Session", value: "Recruitment Session" },
          { name: "Special Event", value: "Special Event" },
          { name: "Defense Training", value: "Defense Training" }
        )
    )
    .addStringOption((opt) =>
      opt.setName("attendees").setDescription("Comma separated attendees").setRequired(true)
    )
    .addStringOption((opt) => opt.setName("proof").setDescription("Ending proof").setRequired(true)),

  new SlashCommandBuilder()
    .setName("logselfpatrol")
    .setDescription("Log a self patrol")
    .addStringOption((opt) => opt.setName("start").setDescription("Start time").setRequired(true))
    .addStringOption((opt) => opt.setName("end").setDescription("End time").setRequired(true))
    .addStringOption((opt) => opt.setName("proof").setDescription("Proof").setRequired(true)),
];

function registerCommands(client) {
  // Put command handlers in collection
  client.commands.set("xp", {
    data: commandsData[0],
    execute: async (interaction) => {
      // ✅ Prevent timeout: reply instantly, edit later
      await interaction.deferReply({ flags: 64 }); // ephemeral

      const discordId = interaction.user.id;
      const guildId = interaction.guildId;

      const robloxUsername = await getRobloxUsernameFromRowifi(guildId, discordId);
      if (!robloxUsername) {
        return interaction.editReply(
          "❌ I couldn't get your Roblox username from RoWifi.\nMake sure you're verified with RoWifi in this server."
        );
      }

      const row = await getXpRowByRobloxUsername(robloxUsername);
      if (!row) {
        return interaction.editReply(
          `❌ No row found in **XP** tab for Roblox username: **${robloxUsername}**\n` +
          `Make sure XP!A contains Roblox usernames.`
        );
      }

      const xp = row.xp;
      const nextXp = row.nextXp;
      const rank = row.rank || "Unknown";
      const bar = nextXp ? blockBar(xp, nextXp) : "████████████████████";
      const needed = nextXp ? Math.max(0, nextXp - xp) : null;

      const embed = new EmbedBuilder()
        .setTitle(`${robloxUsername}`)
        .addFields(
          { name: "Rank", value: rank, inline: true },
          { name: "XP", value: String(xp), inline: true },
          {
            name: "Progress",
            value: nextXp ? `${bar}\n${xp}/${nextXp} (${needed} left)` : `${bar}\nNextXP not set`,
          }
        )
        .setColor(0x2f3136);

      return interaction.editReply({ embeds: [embed] });
    },
  });

  client.commands.set("log", {
    data: commandsData[1],
    execute: async (interaction) => {
      await interaction.deferReply({ flags: 64 }); // prevent timeout

      if (!hasRole(interaction.member, LOG_ROLE_ID)) {
        return interaction.editReply("❌ You don’t have permission to use **/log**.");
      }

      // Logged by Roblox username (consistent keys)
      const robloxUsername = await getRobloxUsernameFromRowifi(interaction.guildId, interaction.user.id);
      if (!robloxUsername) {
        return interaction.editReply("❌ Could not fetch your Roblox username from RoWifi.");
      }

      const type = interaction.options.getString("type"); // dropdown only
      const attendeesRaw = interaction.options.getString("attendees");
      const proof = interaction.options.getString("proof");
      const timestamp = new Date().toISOString();

      // LOG sheet: Time | RobloxUser | Type | Attendees | Proof
      await appendRow("LOG", [timestamp, robloxUsername, type, attendeesRaw, proof]);

      return interaction.editReply("✅ Logged to Google Sheets (LOG).");
    },
  });

  client.commands.set("logselfpatrol", {
    data: commandsData[2],
    execute: async (interaction) => {
      await interaction.deferReply({ flags: 64 }); // prevent timeout

      const robloxUsername = await getRobloxUsernameFromRowifi(interaction.guildId, interaction.user.id);
      if (!robloxUsername) {
        return interaction.editReply("❌ Could not fetch your Roblox username from RoWifi.");
      }

      const start = interaction.options.getString("start");
      const end = interaction.options.getString("end");
      const proof = interaction.options.getString("proof");
      const timestamp = new Date().toISOString();

      // SELF_PATROL sheet: Time | RobloxUser | Start | End | Proof
      await appendRow("SELF_PATROL", [timestamp, robloxUsername, start, end, proof]);

      return interaction.editReply("✅ Logged to Google Sheets (SELF_PATROL).");
    },
  });

  // Register slash commands to your guild
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  (async () => {
    try {
      console.log("Registering slash commands...");
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
        body: commandsData.map((c) => c.toJSON()),
      });
      console.log("Commands registered.");
    } catch (err) {
      console.error("Command registration error:", err);
    }
  })();
}

module.exports = { registerCommands };

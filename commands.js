const { SlashCommandBuilder, REST, Routes, EmbedBuilder } = require("discord.js");
const { appendRow, getXpRowByNickname } = require("./sheets");
const { blockBar } = require("./progress");
const { CLIENT_ID, GUILD_ID, LOG_ROLE_ID } = require("./config");

function getDisplayName(member) {
  return member.nickname || member.user.username;
}

function hasRole(member, roleId) {
  if (!roleId) return true; // if you forgot to set it, don't hard-lock you out
  return member.roles.cache.has(roleId);
}

const EVENT_TYPES = [
  "Combat Training",
  "Patrol",
  "Recruitment Session",
  "Special Event",
  "Defense Training",
];

const commandsData = [
  new SlashCommandBuilder().setName("xp").setDescription("Check XP (from Google Sheets)"),

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
  // /xp
  client.commands.set("xp", {
    data: commandsData[0],
    execute: async (interaction) => {
      const nickname = getDisplayName(interaction.member);

      const row = await getXpRowByNickname(nickname);
      if (!row) {
        return interaction.reply({
          content: `No XP row found for **${nickname}** in the **XP** tab (XP!A).`,
          ephemeral: true,
        });
      }

      const xp = row.xp;
      const nextXp = row.nextXp;
      const rank = row.rank || "Unknown";

      const bar = nextXp ? blockBar(xp, nextXp) : "████████████████████";
      const needed = nextXp ? Math.max(0, nextXp - xp) : null;

      const embed = new EmbedBuilder()
        .setTitle(`${nickname}`)
        .addFields(
          { name: "Rank", value: rank, inline: true },
          { name: "XP", value: String(xp), inline: true },
          {
            name: "Progress",
            value: nextXp ? `${bar}\n${xp}/${nextXp} (${needed} left)` : `${bar}\nNextXP not set in sheet`,
          }
        )
        .setColor(0x2f3136);

      return interaction.reply({ embeds: [embed] });
    },
  });

  // /log (✅ restricted role + ✅ dropdown choices)
  client.commands.set("log", {
    data: commandsData[1],
    execute: async (interaction) => {
      // ✅ Role restriction
      if (!hasRole(interaction.member, LOG_ROLE_ID)) {
        return interaction.reply({
          content: "❌ You don’t have permission to use **/log**.",
          ephemeral: true,
        });
      }

      const nickname = getDisplayName(interaction.member);
      const type = interaction.options.getString("type"); // from dropdown
      const attendeesRaw = interaction.options.getString("attendees"); // keep commas
      const proof = interaction.options.getString("proof");
      const timestamp = new Date().toISOString();

      // Writes ONLY to sheet (NO XP adding)
      await appendRow("LOG", [timestamp, nickname, type, attendeesRaw, proof]);

      return interaction.reply({ content: "✅ Logged to Google Sheets (LOG).", ephemeral: true });
    },
  });

  // /logselfpatrol (unchanged — still allowed for everyone)
  client.commands.set("logselfpatrol", {
    data: commandsData[2],
    execute: async (interaction) => {
      const nickname = getDisplayName(interaction.member);
      const start = interaction.options.getString("start");
      const end = interaction.options.getString("end");
      const proof = interaction.options.getString("proof");
      const timestamp = new Date().toISOString();

      await appendRow("SELF_PATROL", [timestamp, nickname, start, end, proof]);

      return interaction.reply({
        content: "✅ Logged to Google Sheets (SELF_PATROL).",
        ephemeral: true,
      });
    },
  });

  // Register slash commands to guild
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  (async () => {
    try {
      console.log("Registering slash commands...");
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
        body: commandsData.map((c) => c.toJSON()),
      });
      console.log("Commands registered.");
    } catch (err) {
      console.error(err);
    }
  })();
}

module.exports = { registerCommands };

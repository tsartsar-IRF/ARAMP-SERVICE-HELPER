const { SlashCommandBuilder, REST, Routes, EmbedBuilder } = require("discord.js");
const { appendRow, getXpRowByNickname } = require("./sheets");
const { blockBar } = require("./progress");
const { CLIENT_ID, GUILD_ID, LOG_ROLE_ID } = require("./config");

function getDisplayName(member) {
  return member.nickname || member.user.username;
}

function hasRole(member, roleId) {
  if (!roleId) return true;
  return member.roles?.cache?.has(roleId);
}

const ALLOWED_TYPES = [
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
      await interaction.deferReply({ ephemeral: true });

      const nickname = getDisplayName(interaction.member);
      const row = await getXpRowByNickname(nickname);

      if (!row) {
        return interaction.editReply(
          `No XP row found for **${nickname}** in **XP** tab.\nMake sure XP!A matches your server nickname exactly.`
        );
      }

      const { xp, nextXp, rank } = row;
      const bar = nextXp ? blockBar(xp, nextXp) : "████████████████████";
      const needed = nextXp ? Math.max(0, nextXp - xp) : null;

      const embed = new EmbedBuilder()
        .setTitle(`${nickname}`)
        .addFields(
          { name: "Rank", value: rank || "Unknown", inline: true },
          { name: "XP", value: String(xp), inline: true },
          {
            name: "Progress",
            value: nextXp ? `${bar}\n${xp}/${nextXp} (${needed} left)` : `${bar}\nNextXP not set in sheet`,
          }
        )
        .setColor(0x2f3136);

      return interaction.editReply({ embeds: [embed] });
    },
  });

  // /log
  client.commands.set("log", {
    data: commandsData[1],
    execute: async (interaction) => {
      await interaction.deferReply({ ephemeral: true });

      if (!hasRole(interaction.member, LOG_ROLE_ID)) {
        return interaction.editReply("❌ You don’t have permission to use **/log**.");
      }

      const nickname = getDisplayName(interaction.member);
      const type = interaction.options.getString("type");
      const attendeesRaw = interaction.options.getString("attendees");
      const proof = interaction.options.getString("proof");
      const timestamp = new Date().toISOString();

      // extra server-side validation (even though dropdown already restricts)
      if (!ALLOWED_TYPES.includes(type)) {
        return interaction.editReply("❌ Invalid event type.");
      }

      // Write ONLY logs (NO XP adding)
      await appendRow("LOG", [timestamp, nickname, type, attendeesRaw, proof]);

      return interaction.editReply("✅ Logged to Google Sheets (LOG).");
    },
  });

  // /logselfpatrol
  client.commands.set("logselfpatrol", {
    data: commandsData[2],
    execute: async (interaction) => {
      await interaction.deferReply({ ephemeral: true });

      const nickname = getDisplayName(interaction.member);
      const start = interaction.options.getString("start");
      const end = interaction.options.getString("end");
      const proof = interaction.options.getString("proof");
      const timestamp = new Date().toISOString();

      // Write ONLY logs (NO XP adding)
      await appendRow("SELF_PATROL", [timestamp, nickname, start, end, proof]);

      return interaction.editReply("✅ Logged to Google Sheets (SELF_PATROL).");
    },
  });

  // Register slash commands
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  (async () => {
    try {
      console.log("Registering slash commands...");
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
        body: commandsData.map((c) => c.toJSON()),
      });
      console.log("✅ Commands registered.");
    } catch (err) {
      console.error("❌ Command registration failed:", err);
    }
  })();
}

module.exports = { registerCommands };

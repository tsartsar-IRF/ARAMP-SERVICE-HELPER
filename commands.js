const { SlashCommandBuilder, REST, Routes, EmbedBuilder } = require("discord.js");
const { appendRow, getXpRowByNickname } = require("./sheets");
const { blockBar } = require("./progress");
const { CLIENT_ID, GUILD_ID, LOG_ROLE_ID } = require("./config");

function getDisplayName(member) {
  return member.nickname || member.user.username;
}

function hasRole(member, roleId) {
  if (!roleId) return true; // don’t lock you out if you forget env var
  return member.roles.cache.has(roleId);
}

// Hard timeout so the bot never hangs forever waiting on Sheets/network
async function withTimeout(promise, ms, label = "Operation") {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(t);
  }
}

const commandsData = [
  new SlashCommandBuilder()
    .setName("xp")
    .setDescription("Check your XP (from Google Sheets)"),

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
      // ✅ ACK immediately so Discord won’t timeout
      await interaction.deferReply({ ephemeral: true });

      const nickname = getDisplayName(interaction.member);

      try {
        const row = await withTimeout(
          getXpRowByNickname(nickname),
          12_000,
          "Google Sheets XP lookup"
        );

        if (!row) {
          return interaction.editReply(
            `No XP row found for **${nickname}** in the **XP** tab (XP!A).`
          );
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

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error(err);
        return interaction.editReply(
          `⚠️ Sheets request failed. Try again.\n\n**Error:** ${err.message}`
        );
      }
    },
  });

  // /log
  client.commands.set("log", {
    data: commandsData[1],
    execute: async (interaction) => {
      // ✅ ACK immediately
      await interaction.deferReply({ ephemeral: true });

      if (!hasRole(interaction.member, LOG_ROLE_ID)) {
        return interaction.editReply("❌ You don’t have permission to use **/log**.");
      }

      const nickname = getDisplayName(interaction.member);
      const type = interaction.options.getString("type"); // dropdown only
      const attendeesRaw = interaction.options.getString("attendees"); // keep commas
      const proof = interaction.options.getString("proof");
      const timestamp = new Date().toISOString();

      // extra safety (even though dropdown already restricts)
      const ALLOWED = [
        "Combat Training",
        "Patrol",
        "Recruitment Session",
        "Special Event",
        "Defense Training",
      ];
      if (!ALLOWED.includes(type)) {
        return interaction.editReply("❌ Invalid event type.");
      }

      try {
        await withTimeout(
          appendRow("LOG", [timestamp, nickname, type, attendeesRaw, proof]),
          12_000,
          "Google Sheets LOG append"
        );
        return interaction.editReply("✅ Logged to Google Sheets (LOG).");
      } catch (err) {
        console.error(err);
        return interaction.editReply(
          `⚠️ Logging failed. Try again.\n\n**Error:** ${err.message}`
        );
      }
    },
  });

  // /logselfpatrol
  client.commands.set("logselfpatrol", {
    data: commandsData[2],
    execute: async (interaction) => {
      // ✅ ACK immediately
      await interaction.deferReply({ ephemeral: true });

      const nickname = getDisplayName(interaction.member);
      const start = interaction.options.getString("start");
      const end = interaction.options.getString("end");
      const proof = interaction.options.getString("proof");
      const timestamp = new Date().toISOString();

      try {
        await withTimeout(
          appendRow("SELF_PATROL", [timestamp, nickname, start, end, proof]),
          12_000,
          "Google Sheets SELF_PATROL append"
        );
        return interaction.editReply("✅ Logged to Google Sheets (SELF_PATROL).");
      } catch (err) {
        console.error(err);
        return interaction.editReply(
          `⚠️ Self patrol logging failed. Try again.\n\n**Error:** ${err.message}`
        );
      }
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

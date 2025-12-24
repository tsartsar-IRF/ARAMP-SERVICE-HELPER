const { SlashCommandBuilder, REST, Routes, EmbedBuilder } = require("discord.js");
const { appendRow, getXpRowByNickname } = require("./sheets");
const { blockBar } = require("./progress");
const { CLIENT_ID, GUILD_ID } = require("./config");

function getDisplayName(member) {
  return member.nickname || member.user.username;
}

const commandsData = [
  new SlashCommandBuilder()
    .setName("xp")
    .setDescription("Check your XP and progress (from Google Sheets)"),

  new SlashCommandBuilder()
    .setName("log")
    .setDescription("Log an event")
    .addStringOption((opt) => opt.setName("type").setDescription("Event type").setRequired(true))
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
          content:
            `I couldn't find **${nickname}** in the **XP** tab.\n` +
            `Make sure XP!A has your nickname exactly.`,
          ephemeral: true,
        });
      }

      const { xp, nextXp, rank } = row;
      const bar = blockBar(xp, nextXp || null);

      const needed = nextXp ? Math.max(0, nextXp - xp) : 0;
      const progressLine = nextXp
        ? `${xp} / ${nextXp}  (**${needed}** left)`
        : `${xp}  (next rank not set)`;

      const embed = new EmbedBuilder()
        .setTitle(`${nickname}`)
        .addFields(
          { name: "Rank", value: rank || "Unknown", inline: true },
          { name: "XP", value: String(xp), inline: true },
          { name: "Progress", value: `${bar}\n${progressLine}` }
        )
        .setColor(0x2f3136);

      await interaction.reply({ embeds: [embed] });
    },
  });

  // /log -> append to LOG tab (NO XP ADDING)
  client.commands.set("log", {
    data: commandsData[1],
    execute: async (interaction) => {
      const nickname = getDisplayName(interaction.member);
      const type = interaction.options.getString("type");
      const attendeesRaw = interaction.options.getString("attendees"); // keep comma-separated
      const proof = interaction.options.getString("proof");
      const timestamp = new Date().toISOString();

      // Columns are up to you; this is a solid default:
      // Time | Nickname | Type | Attendees | Proof
      await appendRow("LOG", [timestamp, nickname, type, attendeesRaw, proof]);

      await interaction.reply({ content: "✅ Logged to Google Sheets.", ephemeral: true });
    },
  });

  // /logselfpatrol -> append to SELF_PATROL tab (NO XP ADDING)
  client.commands.set("logselfpatrol", {
    data: commandsData[2],
    execute: async (interaction) => {
      const nickname = getDisplayName(interaction.member);
      const start = interaction.options.getString("start");
      const end = interaction.options.getString("end");
      const proof = interaction.options.getString("proof");
      const timestamp = new Date().toISOString();

      // Time | Nickname | Start | End | Proof
      await appendRow("SELF_PATROL", [timestamp, nickname, start, end, proof]);

      await interaction.reply({ content: "✅ Self patrol logged to Google Sheets.", ephemeral: true });
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
      console.error(err);
    }
  })();
}

module.exports = { registerCommands };

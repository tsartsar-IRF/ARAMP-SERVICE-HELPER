const { SlashCommandBuilder, EmbedBuilder, REST, Routes } = require('discord.js');
const { getXP, appendLog } = require('./sheets');
const { addXP, getNextRank } = require('./progress');
const { CLIENT_ID, GUILD_ID, LOG_CHANNEL_ID } = require('./config');

const commandsData = [
  new SlashCommandBuilder()
    .setName('xp')
    .setDescription('Check your XP'),

  new SlashCommandBuilder()
    .setName('log')
    .setDescription('Log an event')
    .addStringOption(opt => opt.setName('type').setDescription('Event type').setRequired(true))
    .addStringOption(opt => opt.setName('attendees').setDescription('Comma separated attendees').setRequired(true))
    .addStringOption(opt => opt.setName('proof').setDescription('Proof link').setRequired(true)),

  new SlashCommandBuilder()
    .setName('logselfpatrol')
    .setDescription('Log your self patrol')
    .addStringOption(opt => opt.setName('start').setDescription('Start time').setRequired(true))
    .addStringOption(opt => opt.setName('end').setDescription('End time').setRequired(true))
    .addStringOption(opt => opt.setName('proof').setDescription('Proof link').setRequired(true))
];

const registerCommands = client => {
  // /xp command
  client.commands.set('xp', {
    data: commandsData[0],
    execute: async interaction => {
      const member = interaction.member;
      const nickname = member.nickname || member.user.username;

      const xp = await getXP(nickname);
      const { nextRank } = await addXP(client, nickname, 0); // just for display

      // Progress bar
      const totalBlocks = 20;
      const progress = Math.min(1, xp / nextRank.xp);
      const filledBlocks = Math.floor(totalBlocks * progress);
      const emptyBlocks = totalBlocks - filledBlocks;
      const bar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

      const embed = new EmbedBuilder()
        .setTitle(`${nickname} XP Progress`)
        .addFields(
          { name: 'Progression', value: `${nextRank.name}`, inline: true },
          { name: 'Total XP', value: `${xp}`, inline: true },
          { name: 'Rank Progress', value: `${bar} ${(progress * 100).toFixed(0)}%\n${nextRank.xp - xp} XP needed` }
        )
        .setColor('Blue');

      await interaction.reply({ embeds: [embed] });
    }
  });

  // /log command
  client.commands.set('log', {
    data: commandsData[1],
    execute: async interaction => {
      const member = interaction.member;
      const nickname = member.nickname || member.user.username;

      const type = interaction.options.getString('type');
      const attendees = interaction.options.getString('attendees').split(',').map(a => a.trim());
      const proof = interaction.options.getString('proof');

      await appendLog('LOG', [nickname, type, attendees.join(','), proof]);
      await addXP(client, nickname, 10); // example XP

      await interaction.reply({ content: 'Event logged!', ephemeral: true });
    }
  });

  // /logselfpatrol command
  client.commands.set('logselfpatrol', {
    data: commandsData[2],
    execute: async interaction => {
      const member = interaction.member;
      const nickname = member.nickname || member.user.username;

      const start = interaction.options.getString('start');
      const end = interaction.options.getString('end');
      const proof = interaction.options.getString('proof');

      await appendLog('SELF_PATROL', [nickname, start, end, proof]);
      await addXP(client, nickname, 5); // example XP

      await interaction.reply({ content: 'Self patrol logged!', ephemeral: true });
    }
  });

  // Register commands with Discord API
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  (async () => {
    try {
      console.log('Registering slash commands...');
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commandsData.map(c => c.toJSON()) }
      );
      console.log('Commands registered.');
    } catch (err) {
      console.error(err);
    }
  })();
};

module.exports = { registerCommands };

const { getXP, updateXP } = require('./sheets');
const { LOG_CHANNEL_ID } = require('./config');

const XP_RANKS = [
  { name: 'Junior Moderator', xp: 0 },
  { name: 'Moderator', xp: 50 },
  { name: 'Senior Moderator', xp: 190 },
  // Add more ranks here
];

function getNextRank(currentXP) {
  return XP_RANKS.find(r => r.xp > currentXP) || XP_RANKS[XP_RANKS.length - 1];
}

async function addXP(client, nickname, amount) {
  const oldXP = await getXP(nickname);
  await updateXP(nickname, amount);
  const newXP = oldXP + amount;

  const oldRank = getNextRank(oldXP);
  const newRank = getNextRank(newXP);

  // Notify on rank up
  if (oldRank.name !== newRank.name && LOG_CHANNEL_ID) {
    try {
      const channel = await client.channels.fetch(LOG_CHANNEL_ID);
      if (channel) {
        const totalBlocks = 20;
        const progress = Math.min(1, newXP / newRank.xp);
        const filledBlocks = Math.floor(totalBlocks * progress);
        const emptyBlocks = totalBlocks - filledBlocks;
        const bar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

        await channel.send(`🎉 **${nickname}** has reached rank **${newRank.name}**!\nProgress: ${bar} ${(progress * 100).toFixed(0)}%`);
      }
    } catch (err) {
      console.error('Failed to send rank notification:', err);
    }
  }

  return {
    oldXP,
    newXP,
    nextRank: newRank,
    progressBar: '█'.repeat(Math.floor(20 * Math.min(1, newXP / newRank.xp))) +
                 '░'.repeat(20 - Math.floor(20 * Math.min(1, newXP / newRank.xp)))
  };
}

module.exports = { getNextRank, addXP };

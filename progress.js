const { getXP, updateXP } = require('./sheets');
const { XP_RANKS, LOG_CHANNEL_ID } = require('./config');

function getNextRank(xp) {
  return XP_RANKS.find(r => r.xp > xp) || XP_RANKS[XP_RANKS.length - 1];
}

function getProgressBar(currentXP, nextXP) {
  const totalBlocks = 20;
  const progressBlocks = Math.min(totalBlocks, Math.floor((currentXP / nextXP) * totalBlocks));
  return '🟩'.repeat(progressBlocks) + '⬜'.repeat(totalBlocks - progressBlocks);
}

async function addXP(client, nickname, amount) {
  const oldXP = await getXP(nickname);
  await updateXP(nickname, amount);
  const newXP = oldXP + amount;

  const oldRank = getNextRank(oldXP);
  const newRank = getNextRank(newXP);

  // Notify if user leveled up
  if (oldRank.name !== newRank.name && LOG_CHANNEL_ID) {
    const channel = await client.channels.fetch(LOG_CHANNEL_ID);
    if (channel) {
      channel.send(`🎉 **${nickname}** has reached rank **${newRank.name}**!`);
    }
  }

  return {
    oldXP,
    newXP,
    nextRank: newRank,
    progressBar: getProgressBar(newXP, newRank.xp)
  };
}

module.exports = { getNextRank, getProgressBar, addXP };

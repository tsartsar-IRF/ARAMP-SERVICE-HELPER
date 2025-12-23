module.exports = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  GUILD_ID: process.env.GUILD_ID,
  SHEET_ID: process.env.GOOGLE_SHEET_ID,
  GOOGLE_JSON_B64: process.env.GOOGLE_JSON_B64,
  LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID || '',
  PORT: process.env.PORT || 10000,

  XP_RANKS: [
    { name: "Recruit", xp: 0 },
    { name: "Private", xp: 100 },
    { name: "Corporal", xp: 250 },
    { name: "Sergeant", xp: 500 },
    { name: "Lieutenant", xp: 900 }
  ]
};

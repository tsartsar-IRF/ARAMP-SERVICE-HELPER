module.exports = {
  TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  GUILD_ID: process.env.GUILD_ID,

  SHEET_ID: process.env.SHEET_ID, // make sure you add this in Render
  LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID || null,

  LOG_ROLE_ID: process.env.LOG_ROLE_ID || null,

  PORT: process.env.PORT || 3000,
};

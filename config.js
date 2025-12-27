module.exports = {
  TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  GUILD_ID: process.env.GUILD_ID,

  SHEET_ID: process.env.SHEET_ID,
  LOG_ROLE_ID: process.env.LOG_ROLE_ID,

  // optional but used for keep-alive
  PORT: process.env.PORT || 3000,

  // Google creds env var names (we support BOTH)
  GOOGLE_CREDS_BASE64: process.env.GOOGLE_CREDS_BASE64,
  GOOGLE_SERVICE_ACCOUNT: process.env.GOOGLE_SERVICE_ACCOUNT,
};

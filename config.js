module.exports = {
  TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  GUILD_ID: process.env.GUILD_ID,
  SHEET_ID: process.env.SHEET_ID,

  // Your existing env var name for Google creds:
  GOOGLE_CREDS_ENV: "GOOGLE_CREDS_BASE64",

  // RoWifi
  ROWIFI_TOKEN: process.env.ROWIFI_TOKEN,

  // Permissions
  LOG_ROLE_ID: process.env.LOG_ROLE_ID,
};

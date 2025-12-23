module.exports = {
    DISCORD_TOKEN: process.env.DISCORD_TOKEN,
    SHEET_ID: process.env.GOOGLE_SHEET_ID,
    GOOGLE_JSON_B64: process.env.GOOGLE_JSON_B64,
    LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID || '', // optional channel for rank notifications
    XP_RANKS: [
        { name: "Recruit", xp: 0 },
        { name: "Private", xp: 100 },
        { name: "Corporal", xp: 250 },
        { name: "Sergeant", xp: 500 },
        { name: "Lieutenant", xp: 900 }
    ]
};

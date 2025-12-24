const { google } = require('googleapis');
const { SHEET_ID } = require('./config');

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(
    Buffer.from(process.env.GOOGLE_CREDS_BASE64, 'base64').toString()
  ),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });
const XP_SHEET = 'XP';

async function getUserRow(nickname) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${XP_SHEET}!A2:C`
  });

  const rows = res.data.values || [];
  const index = rows.findIndex(r => r[0] === nickname);
  if (index === -1) return null;

  return { row: index + 2, data: rows[index] };
}

async function getUserData(nickname) {
  const user = await getUserRow(nickname);
  if (!user) return null;

  return {
    xp: Number(user.data[1]) || 0,
    rank: user.data[2]
  };
}

async function addXP(nickname, amount) {
  const user = await getUserRow(nickname);
  if (!user) return null;

  const newXP = Number(user.data[1] || 0) + amount;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${XP_SHEET}!B${user.row}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[newXP]] }
  });

  return true;
}

module.exports = { getUserData, addXP };

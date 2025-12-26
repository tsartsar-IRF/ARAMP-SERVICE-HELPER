const { google } = require("googleapis");
const { SHEET_ID } = require("./config");

// IMPORTANT: set this to whatever env var name you already use
const ENV_NAME = "GOOGLE_SERVICE_ACCOUNT";

if (!process.env[ENV_NAME]) {
  throw new Error(`Missing ${ENV_NAME} environment variable`);
}

const creds = JSON.parse(
  Buffer.from(process.env[ENV_NAME], "base64").toString("utf8")
);

const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

async function appendRow(tabName, valuesArray) {
  return sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${tabName}!A:Z`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [valuesArray] },
  });
}

// Expected XP layout: A=Nickname, B=XP, C=NextXP, D=Rank
async function getXpRowByNickname(nickname) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "XP!A2:D",
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const rows = res.data.values || [];
  const row = rows.find((r) => String(r[0] || "").trim() === String(nickname).trim());
  if (!row) return null;

  const xp = Number(row[1] ?? 0);
  const nextXp = row[2] === "" || row[2] == null ? null : Number(row[2]);
  const rank = String(row[3] ?? "").trim();

  return { nickname: row[0], xp, nextXp, rank };
}

module.exports = { appendRow, getXpRowByNickname };

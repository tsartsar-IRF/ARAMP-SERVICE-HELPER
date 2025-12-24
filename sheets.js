const { google } = require("googleapis");
const { SHEET_ID } = require("./config");

const ENV_NAME = "GOOGLE_SERVICE_ACCOUNT"; // <-- your new env var name

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
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${tabName}!A:Z`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [valuesArray] },
  });
}

/**
 * EXPECTED XP TAB LAYOUT (computed by formulas):
 * XP!A = Nickname
 * XP!B = XP (formula or value)
 * XP!C = NextXP (formula or value, e.g. next rank requirement)
 * XP!D = Rank (formula or value)
 *
 * Example row:
 * Nickname | XP | NextXP | Rank
 */
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

  return true;
}

module.exports = { getUserData, addXP };

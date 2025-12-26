const { google } = require("googleapis");
const { SHEET_ID, GOOGLE_CREDS_BASE64 } = require("./config");

if (!SHEET_ID) {
  throw new Error("Missing SHEET_ID environment variable");
}

if (!GOOGLE_CREDS_BASE64) {
  throw new Error("Missing GOOGLE_CREDS_BASE64 environment variable");
}

// Decode base64 service account JSON
const creds = JSON.parse(
  Buffer.from(GOOGLE_CREDS_BASE64, "base64").toString("utf8")
);

const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// Append a row to a sheet (LOG, SELF_PATROL, etc.)
async function appendRow(tabName, valuesArray) {
  return sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${tabName}!A:Z`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [valuesArray] },
  });
}

// XP tab layout expected:
// A = Nickname
// B = XP
// C = NextXP
// D = Rank
async function getXpRowByNickname(nickname) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "XP!A2:D",
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const rows = res.data.values || [];
  const row = rows.find(
    (r) => String(r[0] || "").trim() === String(nickname).trim()
  );

  if (!row) return null;

  return {
    nickname: row[0],
    xp: Number(row[1] ?? 0),
    nextXp: row[2] == null || row[2] === "" ? null : Number(row[2]),
    rank: String(row[3] ?? "").trim(),
  };
}

module.exports = {
  appendRow,
  getXpRowByNickname,
};

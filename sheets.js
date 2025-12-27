const { google } = require("googleapis");
const { SHEET_ID, GOOGLE_CREDS_BASE64, GOOGLE_SERVICE_ACCOUNT } = require("./config");

function getCredsB64() {
  // Prefer GOOGLE_CREDS_BASE64 if present, otherwise GOOGLE_SERVICE_ACCOUNT
  return GOOGLE_CREDS_BASE64 || GOOGLE_SERVICE_ACCOUNT || null;
}

const b64 = getCredsB64();
if (!b64) {
  throw new Error("Missing Google creds env var. Set GOOGLE_CREDS_BASE64 or GOOGLE_SERVICE_ACCOUNT.");
}

const creds = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));

const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// helper: timeout any Sheets call
async function withTimeout(promise, ms, label = "Google Sheets") {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(t);
  }
}

// Append one row to a given tab
async function appendRow(tabName, valuesArray) {
  return withTimeout(
    sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!A:Z`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [valuesArray] },
    }),
    15000,
    "appendRow"
  );
}

// Reads XP data from XP tab
// Expected columns: A=Nickname, B=XP, C=NextXP, D=Rank
async function getXpRowByNickname(nickname) {
  const res = await withTimeout(
    sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "XP!A2:D",
      valueRenderOption: "UNFORMATTED_VALUE",
    }),
    15000,
    "getXpRowByNickname"
  );

  const rows = res.data.values || [];
  const row = rows.find((r) => String(r[0] || "").trim() === String(nickname).trim());
  if (!row) return null;

  const xp = Number(row[1] ?? 0);
  const nextXp = row[2] === "" || row[2] == null ? null : Number(row[2]);
  const rank = String(row[3] ?? "").trim();

  return { nickname: row[0], xp, nextXp, rank };
}

module.exports = { appendRow, getXpRowByNickname };

const { google } = require("googleapis");
const { SHEET_ID } = require("./config");

// Accept multiple env var names so we never break again
const ENV_CANDIDATES = [
  "GOOGLE_CREDS_BASE64",      // ✅ recommended
  "GOOGLE_CRED_BASE64",
  "GOOGLE_SERVICE_ACCOUNT",
  "GOOGLE_JSON_B64",
  "GOOGLE_SHEETS_CREDS_B64",
];

function getCredsBase64() {
  for (const name of ENV_CANDIDATES) {
    if (process.env[name] && String(process.env[name]).trim().length > 0) {
      return { name, value: process.env[name].trim() };
    }
  }
  throw new Error(
    `Missing Google creds env var. Set ONE of: ${ENV_CANDIDATES.join(", ")}`
  );
}

const found = getCredsBase64();
console.log(`✅ Using Google creds env var: ${found.name}`);

let creds;
try {
  creds = JSON.parse(Buffer.from(found.value, "base64").toString("utf8"));
} catch (e) {
  throw new Error(
    `Google creds env var "${found.name}" is not valid base64 JSON. Re-generate base64 from the ORIGINAL service account JSON file.`
  );
}

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

// XP tab expected layout:
// A=Nickname, B=XP, C=NextXP, D=Rank  (B/C/D can be formulas)
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

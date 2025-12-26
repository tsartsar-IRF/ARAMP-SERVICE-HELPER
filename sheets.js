const { google } = require("googleapis");
const { SHEET_ID, GOOGLE_B64 } = require("./config");

if (!GOOGLE_B64) {
  throw new Error("Missing Google base64 creds env var (GOOGLE_SERVICE_ACCOUNT or GOOGLE_CREDS_BASE64).");
}

const creds = JSON.parse(Buffer.from(GOOGLE_B64, "base64").toString("utf8"));

const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

const sheets = google.sheets({ version: "v4", auth });

async function withRetry(fn, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const code = err?.code;
      const status = err?.response?.status;

      // retry on rate limit / transient server errors
      const retryable = code === 429 || status === 429 || (code >= 500 && code <= 599) || (status >= 500 && status <= 599);
      if (!retryable) throw err;

      const wait = 800 * Math.pow(2, i);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

// Append a row to a tab
async function appendRow(tabName, valuesArray) {
  return withRetry(() =>
    sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!A:Z`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [valuesArray] }
    })
  );
}

// Read XP row by nickname
// Expected XP layout: A=Nickname, B=XP, C=NextXP, D=Rank
async function getXpRowByNickname(nickname) {
  const res = await withRetry(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "XP!A2:D",
      valueRenderOption: "UNFORMATTED_VALUE"
    })
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

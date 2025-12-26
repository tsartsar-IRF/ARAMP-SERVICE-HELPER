const express = require("express");
const { PORT } = require("./config");

function startServer() {
  const app = express();

  app.get("/", (req, res) => res.status(200).send("Bot is alive ✅"));
  app.get("/health", (req, res) => res.status(200).json({ ok: true }));

  app.listen(PORT, () => {
    console.log(`Keep-alive server running on port ${PORT}`);
  });
}

module.exports = { startServer };

const express = require("express");

function startServer() {
  const app = express();
  const PORT = process.env.PORT || 10000;

  app.get("/", (req, res) => res.status(200).send("Bot is alive ✅"));

  app.listen(PORT, () => {
    console.log(`Keep-alive server running on port ${PORT}`);
  });
}

module.exports = { startServer };

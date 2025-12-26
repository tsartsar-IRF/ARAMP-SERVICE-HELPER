const express = require("express");

function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.get("/", (req, res) => res.send("Bot is alive ✅"));

  app.listen(PORT, () => {
    console.log(`Keep-alive server running on port ${PORT}`);
  });
}

module.exports = { startServer };

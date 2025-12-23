const express = require('express');
const app = express();
const { PORT } = require('./config');

module.exports = () => {
  app.get('/', (req, res) => res.send('Bot is alive!'));
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

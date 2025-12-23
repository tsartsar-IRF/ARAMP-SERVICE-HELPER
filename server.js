const express = require('express');

module.exports = function() {
    const app = express();
    const PORT = process.env.PORT || 3000;

    app.get('/health', (req, res) => res.send('Bot is alive!'));

    app.listen(PORT, () => console.log(`Keepalive server running on port ${PORT}`));
};

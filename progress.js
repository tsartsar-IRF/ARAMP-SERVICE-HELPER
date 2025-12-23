function createProgressBar(current, total, size = 20) {
    const percent = Math.min(current / total, 1);
    const filled = Math.round(percent * size);
    const empty = size - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const percentText = Math.round(percent * 100) + '%';
    return `${bar} ${percentText}`;
}

module.exports = { createProgressBar };

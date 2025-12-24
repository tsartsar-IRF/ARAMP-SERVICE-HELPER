function blockBar(current, target, size = 20) {
  if (!target || target <= 0) return "████████████████████";
  const pct = Math.max(0, Math.min(1, current / target));
  const filled = Math.round(pct * size);
  return "█".repeat(filled) + "░".repeat(size - filled);
}

module.exports = { blockBar };

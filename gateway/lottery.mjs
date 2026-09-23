function score(values) {
  if (!Array.isArray(values) || values.length === 0) return { signal: 1, basis: "No verified draw data supplied." };
  const nums = values.map(Number).filter(Number.isFinite);
  if (!nums.length) return { signal: 1, basis: "No usable numeric data." };
  const counts = new Map();
  for (const n of nums) counts.set(n, (counts.get(n) || 0) + 1);
  const concentration = Math.max(...counts.values()) / nums.length;
  const signal = Math.max(1, Math.min(10, Math.round(1 + concentration * 9)));
  return {
    signal,
    basis: "Heuristic research signal based only on supplied historical observations.",
    warning: "This is not a probability of winning and does not change the mathematical odds of a lottery draw."
  };
}

export function lotterySignal(game, recentNumbers = []) {
  return { game, generatedAt: new Date().toISOString(), ...score(recentNumbers) };
}

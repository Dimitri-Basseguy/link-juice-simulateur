import { clamp } from "./utils.js";

export function computeScores(state, params) {
  const n = state.titles.length;
  if (n === 0) return [];

  const damping = clamp(Number(params.damping ?? 0.85), 0.1, 0.99);
  const iters = Math.max(5, Math.min(500, Math.round(Number(params.iters ?? 40))));
  const pillarBoost = Math.max(1, Number(params.pillarBoost ?? 1.6));
  const classicBoost = Math.max(1, Number(params.classicBoost ?? 1.0));

  const out = Array.from({ length: n }, () => []);
  for (const l of state.links) {
    const boost = (l.type === "pillar") ? pillarBoost : classicBoost;
    out[l.from].push({ to: l.to, w: Number(l.weight || 1) * boost });
  }
  const outSum = out.map(arr => arr.reduce((a, e) => a + e.w, 0));

  let pr = Array.from({ length: n }, () => 1 / n);
  for (let k = 0; k < iters; k++) {
    const next = Array.from({ length: n }, () => (1 - damping) / n);

    for (let i = 0; i < n; i++) {
      if (outSum[i] <= 0) {
        const share = damping * pr[i] / n;
        for (let j = 0; j < n; j++) next[j] += share;
      } else {
        for (const e of out[i]) next[e.to] += damping * pr[i] * (e.w / outSum[i]);
      }
    }
    pr = next;
  }

  const sum = pr.reduce((a, b) => a + b, 0) || 1;
  return pr.map(v => (v / sum) * 100);
}

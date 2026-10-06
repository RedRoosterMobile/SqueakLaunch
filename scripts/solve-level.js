// Dev tool: brute-force search for arrow layouts that solve a level.
// Usage: node scripts/solve-level.js src/levels/level2.json [maxSolutionsToPrint]
import { readFileSync } from 'node:fs';
import { parseLevelJson } from '../src/core/level.js';
import { ArrowLayout } from '../src/core/arrows.js';
import { createSimulation, stepSimulation } from '../src/core/simulation.js';
import { cellKey, parseKey, DIRECTIONS } from '../src/core/constants.js';

const MAX_TICKS = 600;

/** Run to completion; returns { outcome, visited:Set<cellKey> }. Detects loops. */
export function runLevel(level, arrows) {
  const sim = createSimulation(level, arrows);
  const visited = new Set();
  const seen = new Set();
  const mark = () => {
    for (const e of [...sim.mice.filter((m) => m.status === 'active'), ...sim.cats]) visited.add(cellKey(e.x, e.y));
  };
  mark();
  while (sim.tick < MAX_TICKS) {
    const sig = `${sim.tick % 2}|${sim.mice.map((m) => `${m.x},${m.y},${m.direction},${m.status}`).join(';')}|${sim.cats.map((c) => `${c.x},${c.y},${c.direction}`).join(';')}`;
    if (seen.has(sig)) return { outcome: 'loop', visited, tick: sim.tick };
    seen.add(sig);
    const ev = stepSimulation(sim);
    mark();
    if (ev.outcome) return { outcome: ev.outcome, visited, tick: sim.tick, reason: ev.lossReason };
  }
  return { outcome: 'timeout', visited, tick: sim.tick };
}

export function solve(level, limit = 50) {
  const solutions = [];
  const tried = new Set();
  const layout = new ArrowLayout(level);
  const dfs = () => {
    if (solutions.length >= limit) return;
    const sig = [...layout.arrows].sort().join(' ');
    if (tried.has(sig)) return;
    tried.add(sig);
    const res = runLevel(level, layout.arrows);
    if (res.outcome === 'won') {
      solutions.push({ arrows: [...layout.arrows], ticks: res.tick });
      return;
    }
    for (const k of res.visited) {
      const { x, y } = parseKey(k);
      if (!layout.isEligible(x, y) || layout.get(x, y)) continue;
      for (const d of DIRECTIONS) {
        if (layout.inventory[d] <= 0) continue;
        layout.place(x, y, d);
        dfs();
        layout.remove(x, y);
      }
    }
  };
  dfs();
  return { solutions, explored: tried.size };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  const { ok, errors, level } = parseLevelJson(readFileSync(file, 'utf8'));
  if (!ok) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log(`${level.name}: no-arrow run ->`, runLevel(level, new Map()).outcome);
  const { solutions, explored } = solve(level, Number(process.argv[3] ?? 10));
  console.log(`explored ${explored} layouts, found ${solutions.length} solution(s)`);
  for (const s of solutions) console.log(`  ${s.ticks} ticks:`, s.arrows.map(([k, d]) => `${k}:${d}`).join('  '));
}

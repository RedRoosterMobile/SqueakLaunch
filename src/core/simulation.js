// Deterministic grid simulation. Pure JS, no rendering or timing concerns.
import {
  CAT_TICK_INTERVAL, DIRECTION_VECTORS, clockwise, cellKey, inBounds,
} from './constants.js';

/**
 * Create a fresh simulation from a validated level and a Map(cellKey -> direction) of arrows.
 */
export function createSimulation(level, arrows = new Map()) {
  return {
    tick: 0,
    walls: new Set(level.walls.map((w) => cellKey(w.x, w.y))),
    rockets: new Set(level.rockets.map((r) => cellKey(r.x, r.y))),
    arrows: new Map(arrows),
    mice: level.mice.map((m, i) => ({ id: `mouse-${i}`, x: m.x, y: m.y, direction: m.direction, status: 'active' })),
    cats: level.cats.map((c, i) => ({ id: `cat-${i}`, x: c.x, y: c.y, direction: c.direction })),
    savedCount: 0,
    outcome: null, // null | 'won' | 'lost'
    lossReason: null,
  };
}

export const isOpen = (sim, x, y) => inBounds(x, y) && !sim.walls.has(cellKey(x, y));
export const catsMoveOnTick = (tick) => tick > 0 && tick % CAT_TICK_INTERVAL === 0;

/**
 * Work out where an entity goes on its next movement opportunity:
 * adopt the arrow on the current tile, then turn clockwise until an open tile is found.
 * Depends only on walls/arrows (static while running), so it is also used for render look-ahead.
 */
export function planMove(sim, entity) {
  let direction = sim.arrows.get(cellKey(entity.x, entity.y)) ?? entity.direction;
  for (let i = 0; i < 4; i++) {
    const v = DIRECTION_VECTORS[direction];
    const nx = entity.x + v.x;
    const ny = entity.y + v.y;
    if (isOpen(sim, nx, ny)) return { x: nx, y: ny, direction, moved: true };
    direction = clockwise(direction);
  }
  // Fully enclosed: stay put (keeping any arrow-adopted direction).
  return { x: entity.x, y: entity.y, direction: sim.arrows.get(cellKey(entity.x, entity.y)) ?? entity.direction, moved: false };
}

/**
 * Advance one tick. Mutates `sim` and returns an events object describing what happened,
 * or null when the simulation has already finished.
 */
export function stepSimulation(sim) {
  if (sim.outcome) return null;
  const tick = sim.tick + 1;
  const catsMove = catsMoveOnTick(tick);

  // 1. Plan every move from the same pre-tick state.
  const mousePlans = sim.mice
    .filter((m) => m.status === 'active')
    .map((m) => ({ entity: m, from: { x: m.x, y: m.y }, to: planMove(sim, m) }));
  const catPlans = sim.cats.map((c) => ({
    entity: c,
    from: { x: c.x, y: c.y },
    to: catsMove ? planMove(sim, c) : { x: c.x, y: c.y, direction: c.direction, moved: false },
  }));

  // 2. Apply all moves simultaneously.
  for (const p of [...mousePlans, ...catPlans]) {
    p.entity.x = p.to.x;
    p.entity.y = p.to.y;
    p.entity.direction = p.to.direction;
  }
  sim.tick = tick;

  const events = { tick, catsMoved: catsMove, saved: [], eaten: [], catsInRocket: [], outcome: null, lossReason: null };

  // 3. Cat-related failures first.
  for (const c of sim.cats) {
    if (sim.rockets.has(cellKey(c.x, c.y))) events.catsInRocket.push(c.id);
  }
  for (const mp of mousePlans) {
    const m = mp.entity;
    const sameTile = sim.cats.some((c) => c.x === m.x && c.y === m.y);
    const swapped = catPlans.some((cp) =>
      cp.to.moved && mp.to.moved &&
      cp.from.x === mp.to.x && cp.from.y === mp.to.y &&
      cp.to.x === mp.from.x && cp.to.y === mp.from.y);
    if (sameTile || swapped) {
      m.status = 'eaten';
      events.eaten.push(m.id);
    }
  }
  if (events.catsInRocket.length || events.eaten.length) {
    sim.outcome = events.outcome = 'lost';
    sim.lossReason = events.lossReason = events.eaten.length
      ? 'A cat caught a mouse!'
      : 'A cat got into a rocket!';
    return events;
  }

  // 4. Save mice that reached a rocket.
  for (const mp of mousePlans) {
    const m = mp.entity;
    if (sim.rockets.has(cellKey(m.x, m.y))) {
      m.status = 'saved';
      sim.savedCount++;
      events.saved.push(m.id);
    }
  }

  // 5. Victory.
  if (sim.mice.every((m) => m.status === 'saved')) {
    sim.outcome = events.outcome = 'won';
  }
  return events;
}

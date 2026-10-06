// Play-mode state machine with a fixed-step clock. Pure JS; the renderer just reads it.
import { TICK_MS } from './constants.js';
import { cloneLevel } from './level.js';
import { ArrowLayout } from './arrows.js';
import { createSimulation, stepSimulation } from './simulation.js';

export const PlayState = Object.freeze({
  PLACEMENT: 'placement',
  RUNNING: 'running',
  PAUSED: 'paused',
  WON: 'won',
  LOST: 'lost',
});

/** Cap on catch-up after long frames (e.g. a backgrounded tab) to avoid big visual jumps. */
const MAX_FRAME_MS = TICK_MS * 4;

export class PlaySession {
  /** @param level a validated level; the session keeps its own copy. */
  constructor(level) {
    this.level = cloneLevel(level);
    this.layout = new ArrowLayout(this.level);
    this.listeners = new Set();
    this.reset();
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(type, payload) {
    for (const fn of this.listeners) fn(type, payload, this);
  }

  /** Restore initial entities/outcomes, keep the arrow layout, return to Placement. */
  reset() {
    this.sim = createSimulation(this.level, this.layout.arrows);
    this.state = PlayState.PLACEMENT;
    this.accumulator = 0;
    this.emit('reset');
  }

  get canEditArrows() {
    return this.state === PlayState.PLACEMENT;
  }

  get isFinished() {
    return this.state === PlayState.WON || this.state === PlayState.LOST;
  }

  /** Fraction (0..1) of the way to the next tick; used for interpolation. */
  get tickProgress() {
    return this.state === PlayState.RUNNING || this.state === PlayState.PAUSED ? this.accumulator / TICK_MS : 0;
  }

  start() {
    if (this.state !== PlayState.PLACEMENT) return false;
    // Arrows are frozen while running; rebuild the sim so it sees the final layout.
    this.sim = createSimulation(this.level, this.layout.arrows);
    this.accumulator = 0;
    this.state = PlayState.RUNNING;
    this.emit('state');
    return true;
  }

  pause() {
    if (this.state !== PlayState.RUNNING) return false;
    this.state = PlayState.PAUSED;
    this.emit('state');
    return true;
  }

  resume() {
    if (this.state !== PlayState.PAUSED) return false;
    this.state = PlayState.RUNNING; // accumulator is untouched, so no timing jump
    this.emit('state');
    return true;
  }

  /** Space-bar behaviour: start / pause / resume. */
  toggle() {
    if (this.state === PlayState.PLACEMENT) return this.start();
    if (this.state === PlayState.RUNNING) return this.pause();
    if (this.state === PlayState.PAUSED) return this.resume();
    return false;
  }

  placeArrow(x, y, direction) {
    if (!this.canEditArrows) return { ok: false, changed: false, reason: 'Reset to edit arrows.' };
    const result = this.layout.place(x, y, direction);
    if (result.changed) this.syncArrows();
    return result;
  }

  removeArrow(x, y) {
    if (!this.canEditArrows) return false;
    const removed = this.layout.remove(x, y);
    if (removed) this.syncArrows();
    return removed;
  }

  clearArrows() {
    if (!this.canEditArrows) return false;
    this.layout.clear();
    this.syncArrows();
    return true;
  }

  syncArrows() {
    this.sim.arrows = new Map(this.layout.arrows);
    this.emit('arrows');
  }

  /** Advance the clock by `deltaMs` of real time. Returns the tick events produced. */
  update(deltaMs) {
    if (this.state !== PlayState.RUNNING) return [];
    this.accumulator += Math.min(Math.max(deltaMs, 0), MAX_FRAME_MS);
    const produced = [];
    while (this.accumulator >= TICK_MS) {
      this.accumulator -= TICK_MS;
      const events = stepSimulation(this.sim);
      if (!events) break;
      produced.push(events);
      this.emit('tick', events);
      if (events.outcome) {
        this.state = events.outcome === 'won' ? PlayState.WON : PlayState.LOST;
        this.accumulator = 0;
        this.emit('state');
        break;
      }
    }
    return produced;
  }
}

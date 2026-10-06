// Player arrow layout + inventory rules. Pure JS.
import { cellKey, inBounds, isDirection } from './constants.js';

export class ArrowLayout {
  constructor(level) {
    this.initialInventory = { ...level.arrowInventory };
    this.inventory = { ...level.arrowInventory };
    this.arrows = new Map(); // cellKey -> direction
    this.blocked = new Set(
      [...level.walls, ...level.rockets, ...level.mice, ...level.cats].map((p) => cellKey(p.x, p.y)),
    );
  }

  /** Arrows may only go on empty floor (no wall, rocket or spawn tile). */
  isEligible(x, y) {
    return inBounds(x, y) && !this.blocked.has(cellKey(x, y));
  }

  get(x, y) {
    return this.arrows.get(cellKey(x, y)) ?? null;
  }

  /**
   * Place (or replace) an arrow. Returns { ok, changed, reason }.
   * Replacing refunds the old direction and consumes the new one, but only if the new one is available.
   */
  place(x, y, direction) {
    if (!isDirection(direction)) return { ok: false, changed: false, reason: 'Unknown direction.' };
    if (!this.isEligible(x, y)) return { ok: false, changed: false, reason: 'Arrows can only go on empty floor tiles.' };
    const k = cellKey(x, y);
    const existing = this.arrows.get(k);
    if (existing === direction) return { ok: true, changed: false, reason: null };
    if (this.inventory[direction] <= 0) {
      return { ok: false, changed: false, reason: `No ${direction} arrows left.` };
    }
    if (existing) this.inventory[existing]++;
    this.inventory[direction]--;
    this.arrows.set(k, direction);
    return { ok: true, changed: true, reason: null };
  }

  /** Remove an arrow and refund it. Returns true if something was removed. */
  remove(x, y) {
    const k = cellKey(x, y);
    const existing = this.arrows.get(k);
    if (!existing) return false;
    this.arrows.delete(k);
    this.inventory[existing]++;
    return true;
  }

  clear() {
    this.arrows.clear();
    this.inventory = { ...this.initialInventory };
  }

  get placedCount() {
    return this.arrows.size;
  }
}

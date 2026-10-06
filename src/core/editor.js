// Level editor draft state. Pure JS; the UI and renderer read from it.
import { DIRECTIONS, cellKey, parseKey, inBounds, isDirection } from './constants.js';
import { createEmptyLevel, normalizeLevel, validateLevel } from './level.js';

export const EDITOR_TOOLS = Object.freeze(['floor', 'wall', 'mouse', 'cat', 'rocket']);
/** Tools that support click-and-drag painting. */
export const PAINT_TOOLS = Object.freeze(['floor', 'wall']);

const LIST_FOR_TYPE = { wall: 'walls', rocket: 'rockets', mouse: 'mice', cat: 'cats' };

export class EditorState {
  constructor(level = createEmptyLevel()) {
    this.load(level);
  }

  /** Replace the whole draft (used by New Level / Import). Draft starts clean. */
  load(level) {
    this.name = level.name;
    this.inventory = { ...level.arrowInventory };
    this.cells = new Map(); // cellKey -> { type, direction? }
    for (const [type, list] of Object.entries(LIST_FOR_TYPE)) {
      for (const item of level[list]) {
        this.cells.set(cellKey(item.x, item.y), item.direction ? { type, direction: item.direction } : { type });
      }
    }
    this.dirty = false;
    this.revision = 0;
  }

  get(x, y) {
    return this.cells.get(cellKey(x, y)) ?? null;
  }

  /** Stamp a tool onto a cell, replacing its contents. Returns true if the draft changed. */
  stamp(tool, x, y, direction = 'right') {
    if (!inBounds(x, y) || !EDITOR_TOOLS.includes(tool)) return false;
    const k = cellKey(x, y);
    const current = this.cells.get(k);
    if (tool === 'floor') {
      if (!current) return false;
      this.cells.delete(k);
    } else {
      const next = tool === 'mouse' || tool === 'cat'
        ? { type: tool, direction: isDirection(direction) ? direction : 'right' }
        : { type: tool };
      if (current && current.type === next.type && current.direction === next.direction) return false;
      this.cells.set(k, next);
    }
    this.touch();
    return true;
  }

  setName(name) {
    if (name === this.name) return;
    this.name = name;
    this.touch();
  }

  /** Stores the raw numeric value; invalid values are reported by validate(). */
  setInventory(direction, value) {
    if (!DIRECTIONS.includes(direction) || Object.is(this.inventory[direction], value)) return;
    this.inventory[direction] = value;
    this.touch();
  }

  touch() {
    this.dirty = true;
    this.revision++;
  }

  markSaved() {
    this.dirty = false;
  }

  /** The draft as a level object (may be invalid). */
  toLevel() {
    const level = createEmptyLevel(this.name);
    level.arrowInventory = { ...this.inventory };
    for (const [k, cell] of this.cells) {
      const { x, y } = parseKey(k);
      level[LIST_FOR_TYPE[cell.type]].push(cell.direction ? { x, y, direction: cell.direction } : { x, y });
    }
    return normalizeLevel(level);
  }

  validate() {
    return validateLevel(this.toLevel());
  }
}

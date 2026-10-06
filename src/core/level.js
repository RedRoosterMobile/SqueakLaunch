// Level data model: creation, validation, (de)serialization. Pure JS.
import {
  GRID_WIDTH, GRID_HEIGHT, LEVEL_FORMAT_VERSION, DIRECTIONS, isDirection, cellKey, emptyInventory,
} from './constants.js';

export function createEmptyLevel(name = 'Untitled Level') {
  return {
    version: LEVEL_FORMAT_VERSION,
    name,
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
    walls: [],
    rockets: [],
    mice: [],
    cats: [],
    arrowInventory: emptyInventory(),
  };
}

const byPosition = (a, b) => a.y - b.y || a.x - b.x;
const point = ({ x, y }) => ({ x, y });
const actor = ({ x, y, direction }) => ({ x, y, direction });

/** Canonical copy containing only format fields, in a stable order. */
export function normalizeLevel(level) {
  return {
    version: level.version,
    name: level.name,
    width: level.width,
    height: level.height,
    walls: level.walls.map(point).sort(byPosition),
    rockets: level.rockets.map(point).sort(byPosition),
    mice: level.mice.map(actor).sort(byPosition),
    cats: level.cats.map(actor).sort(byPosition),
    arrowInventory: Object.fromEntries(DIRECTIONS.map((d) => [d, level.arrowInventory[d]])),
  };
}

export const cloneLevel = (level) => normalizeLevel(level);

export function serializeLevel(level) {
  return JSON.stringify(normalizeLevel(level), null, 2);
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNonNegInt = (v) => Number.isInteger(v) && v >= 0;

/**
 * Structural validation. Returns { ok, errors: string[], level } where `level`
 * is a normalized copy when ok. Does not check solvability.
 */
export function validateLevel(raw) {
  const errors = [];
  if (!isPlainObject(raw)) {
    return { ok: false, errors: ['Level must be a JSON object.'], level: null };
  }
  if (raw.version !== LEVEL_FORMAT_VERSION) {
    errors.push(`Unsupported version ${JSON.stringify(raw.version)}; expected "version": ${LEVEL_FORMAT_VERSION}.`);
  }
  if (typeof raw.name !== 'string' || raw.name.trim() === '') {
    errors.push('"name" must be a non-empty string.');
  } else if (raw.name.length > 60) {
    errors.push('"name" must be 60 characters or fewer.');
  }
  if (raw.width !== GRID_WIDTH || raw.height !== GRID_HEIGHT) {
    errors.push(`Grid must be ${GRID_WIDTH}x${GRID_HEIGHT} ("width": ${GRID_WIDTH}, "height": ${GRID_HEIGHT}); got ${JSON.stringify(raw.width)}x${JSON.stringify(raw.height)}.`);
  }

  const occupied = new Map(); // key -> label of first occupant
  const checkList = (field, withDirection) => {
    const list = raw[field];
    if (!Array.isArray(list)) {
      errors.push(`"${field}" must be an array.`);
      return;
    }
    list.forEach((item, i) => {
      const label = `${field}[${i}]`;
      if (!isPlainObject(item)) {
        errors.push(`${label} must be an object like {"x": 0, "y": 0${withDirection ? ', "direction": "up"' : ''}}.`);
        return;
      }
      const { x, y } = item;
      if (!Number.isInteger(x) || !Number.isInteger(y)) {
        errors.push(`${label} needs integer "x" and "y" (got ${JSON.stringify(x)}, ${JSON.stringify(y)}).`);
        return;
      }
      if (x < 0 || y < 0 || x >= GRID_WIDTH || y >= GRID_HEIGHT) {
        errors.push(`${label} at (${x}, ${y}) is out of bounds; x must be 0-${GRID_WIDTH - 1}, y must be 0-${GRID_HEIGHT - 1}.`);
        return;
      }
      if (withDirection && !isDirection(item.direction)) {
        errors.push(`${label} has invalid direction ${JSON.stringify(item.direction)}; use one of ${DIRECTIONS.join(', ')}.`);
      }
      const k = cellKey(x, y);
      if (occupied.has(k)) {
        errors.push(`${label} at (${x}, ${y}) overlaps ${occupied.get(k)}; each cell can hold only one object.`);
      } else {
        occupied.set(k, label);
      }
    });
  };
  checkList('walls', false);
  checkList('rockets', false);
  checkList('mice', true);
  checkList('cats', true);

  if (Array.isArray(raw.mice) && raw.mice.length === 0) errors.push('Level needs at least one mouse.');
  if (Array.isArray(raw.rockets) && raw.rockets.length === 0) errors.push('Level needs at least one rocket.');

  const inv = raw.arrowInventory;
  if (!isPlainObject(inv)) {
    errors.push('"arrowInventory" must be an object with up, right, down and left counts.');
  } else {
    for (const d of DIRECTIONS) {
      if (!isNonNegInt(inv[d])) {
        errors.push(`arrowInventory.${d} must be a nonnegative integer (got ${JSON.stringify(inv[d])}).`);
      } else if (inv[d] > 99) {
        errors.push(`arrowInventory.${d} must be 99 or less.`);
      }
    }
  }

  if (errors.length) return { ok: false, errors, level: null };
  return { ok: true, errors: [], level: normalizeLevel(raw) };
}

/** Parse + validate JSON text. */
export function parseLevelJson(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, errors: [`Invalid JSON: ${e.message}`], level: null };
  }
  return validateLevel(raw);
}

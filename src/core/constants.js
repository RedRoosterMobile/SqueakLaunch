// Shared grid/simulation constants and direction helpers. No Phaser imports here.
export const GRID_WIDTH = 12;
export const GRID_HEIGHT = 9;
export const TICK_MS = 250;
/** Cats move on every Nth tick, starting on tick N (tick 2, 4, 6, ...). */
export const CAT_TICK_INTERVAL = 2;
export const LEVEL_FORMAT_VERSION = 1;

/** Clockwise order. */
export const DIRECTIONS = Object.freeze(['up', 'right', 'down', 'left']);

export const DIRECTION_VECTORS = Object.freeze({
  up: Object.freeze({ x: 0, y: -1 }),
  right: Object.freeze({ x: 1, y: 0 }),
  down: Object.freeze({ x: 0, y: 1 }),
  left: Object.freeze({ x: -1, y: 0 }),
});

export const isDirection = (d) => DIRECTIONS.includes(d);
export const clockwise = (d) => DIRECTIONS[(DIRECTIONS.indexOf(d) + 1) % 4];
export const cellKey = (x, y) => `${x},${y}`;
export const parseKey = (k) => {
  const [x, y] = k.split(',').map(Number);
  return { x, y };
};
export const inBounds = (x, y) => x >= 0 && y >= 0 && x < GRID_WIDTH && y < GRID_HEIGHT;
export const emptyInventory = () => ({ up: 0, right: 0, down: 0, left: 0 });

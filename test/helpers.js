import { createEmptyLevel } from '../src/core/level.js';

/** Build a level from an ASCII map. # wall, R rocket, ^>v< mouse, AWSD... see legend below. */
// Legend: '#' wall, 'R' rocket, mouse: '^' '>' 'v' '<', cat: 'U' 'P'(right) 'N'(down) 'L'.
export function levelFromAscii(rows, inventory = {}) {
  const level = createEmptyLevel('Test');
  const mouseDirs = { '^': 'up', '>': 'right', v: 'down', '<': 'left' };
  const catDirs = { U: 'up', P: 'right', N: 'down', L: 'left' };
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '#') level.walls.push({ x, y });
      else if (ch === 'R') level.rockets.push({ x, y });
      else if (mouseDirs[ch]) level.mice.push({ x, y, direction: mouseDirs[ch] });
      else if (catDirs[ch]) level.cats.push({ x, y, direction: catDirs[ch] });
    });
  });
  level.arrowInventory = { up: 0, right: 0, down: 0, left: 0, ...inventory };
  return level;
}

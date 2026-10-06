// Built-in levels, in order of difficulty.
import level1 from './level1.json';
import level2 from './level2.json';
import level3 from './level3.json';

export const BUILTIN_LEVELS = [level1, level2, level3];

/** Optional coaching text shown under the board (UI only, not part of the level format). */
export const BUILTIN_HINTS = [
  'Tutorial: select ▲ (key 1) and click a tile in the rocket\'s column on the mouse\'s path, then press Start (Space).',
  'Both mice end up on the same outer loop — a single set of arrows can guide them both through the maze.',
  'The cat patrols the right side. The obvious shortcut runs straight into it — find a safer route.',
];

// Dev tool: convert an ASCII sketch (see test/helpers.js legend) on stdin to level JSON.
import { readFileSync } from 'node:fs';
import { levelFromAscii } from '../test/helpers.js';
import { serializeLevel } from '../src/core/level.js';
const [name, inv] = [process.argv[2], JSON.parse(process.argv[3] ?? '{}')];
const rows = readFileSync(0, 'utf8').split('\n').filter((r) => r.length);
const level = levelFromAscii(rows, inv);
level.name = name;
console.log(serializeLevel(level));

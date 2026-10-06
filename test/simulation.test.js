import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation, stepSimulation, planMove, catsMoveOnTick } from '../src/core/simulation.js';
import { levelFromAscii } from './helpers.js';

const pad = (rows) => [...rows, ...Array(9 - rows.length).fill('............')].map((r) => r.padEnd(12, '.'));
const sim = (rows, arrows = []) => createSimulation(levelFromAscii(pad(rows)), new Map(arrows));
const pos = (e) => [e.x, e.y, e.direction];

test('moves forward one tile per tick', () => {
  const s = sim(['', '..>.........', '', '', '', '', '', '...........R']);
  stepSimulation(s);
  assert.deepEqual(pos(s.mice[0]), [3, 1, 'right']);
});

test('turns clockwise when blocked by a wall', () => {
  const s = sim(['', '..>#', '', '', '', '', '', '...........R']);
  stepSimulation(s);
  assert.deepEqual(pos(s.mice[0]), [2, 2, 'down']);
});

test('keeps turning clockwise past multiple blocked sides', () => {
  // right and down blocked -> left
  const s = sim(['', '..>#', '..#', '', '', '', '', '...........R']);
  stepSimulation(s);
  assert.deepEqual(pos(s.mice[0]), [1, 1, 'left']);
});

test('grid boundary behaves as a wall (no wrapping)', () => {
  const s = sim(['...........>', '', '', '', '', '', '', 'R']);
  stepSimulation(s);
  assert.deepEqual(pos(s.mice[0]), [11, 1, 'down']);
});

test('fully enclosed entity stays still', () => {
  const s = sim(['', '.#', '#>#', '.#', '', '', '', '...........R']);
  for (let i = 0; i < 3; i++) stepSimulation(s);
  assert.deepEqual(pos(s.mice[0]), [1, 2, 'right']);
  assert.equal(s.outcome, null);
});

test('arrow redirects a mouse and is not consumed', () => {
  const s = sim(['', '.>..', '', '', '', '', '', '...........R'], [['2,1', 'down']]);
  stepSimulation(s); // onto arrow tile
  stepSimulation(s); // adopts arrow direction, moves down
  assert.deepEqual(pos(s.mice[0]), [2, 2, 'down']);
  assert.equal(s.arrows.get('2,1'), 'down');
});

test('arrow pointing into a wall still turns clockwise', () => {
  const s = sim(['', '.>.', '..#', '', '', '', '', '...........R'], [['2,1', 'down']]);
  stepSimulation(s);
  stepSimulation(s);
  assert.deepEqual(pos(s.mice[0]), [1, 1, 'left']);
});

test('cats move every second tick starting on tick two', () => {
  assert.deepEqual([1, 2, 3, 4].map(catsMoveOnTick), [false, true, false, true]);
  const s = sim(['P', '', '', '', '', '', '', '...........R', '>..........']);
  stepSimulation(s);
  assert.deepEqual(pos(s.cats[0]), [0, 0, 'right']);
  stepSimulation(s);
  assert.deepEqual(pos(s.cats[0]), [1, 0, 'right']);
  stepSimulation(s);
  assert.deepEqual(pos(s.cats[0]), [1, 0, 'right']);
  stepSimulation(s);
  assert.deepEqual(pos(s.cats[0]), [2, 0, 'right']);
});

test('arrows redirect cats too', () => {
  const s = sim(['.P.', '', '', '', '', '', '', '...........R', '>..........'], [['1,0', 'down']]);
  stepSimulation(s);
  stepSimulation(s);
  assert.deepEqual(pos(s.cats[0]), [1, 1, 'down']);
});

test('planMove is pure', () => {
  const s = sim(['', '..>#', '', '', '', '', '', '...........R']);
  const before = pos(s.mice[0]);
  planMove(s, s.mice[0]);
  assert.deepEqual(pos(s.mice[0]), before);
});

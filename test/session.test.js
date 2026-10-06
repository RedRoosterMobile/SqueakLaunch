import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PlaySession, PlayState } from '../src/core/session.js';
import { TICK_MS } from '../src/core/constants.js';
import { levelFromAscii } from './helpers.js';

const loadLevel = (n) => JSON.parse(readFileSync(new URL(`../src/levels/level${n}.json`, import.meta.url), 'utf8'));
const runToEnd = (s) => {
  for (let i = 0; i < 1000 && !s.isFinished; i++) s.update(TICK_MS);
};

test('state machine: placement -> running -> paused -> running', () => {
  const s = new PlaySession(loadLevel(1));
  assert.equal(s.state, PlayState.PLACEMENT);
  s.toggle();
  assert.equal(s.state, PlayState.RUNNING);
  s.toggle();
  assert.equal(s.state, PlayState.PAUSED);
  s.toggle();
  assert.equal(s.state, PlayState.RUNNING);
});

test('ticks are fixed-step and independent of frame size', () => {
  const a = new PlaySession(loadLevel(1));
  const b = new PlaySession(loadLevel(1));
  a.start();
  b.start();
  a.update(TICK_MS * 3);
  for (let i = 0; i < 46; i++) b.update(1000 / 60);
  assert.equal(a.sim.tick, 3);
  assert.equal(b.sim.tick, 3);
  assert.deepEqual(a.sim.mice, b.sim.mice);
});

test('pause freezes time and resume does not jump', () => {
  const s = new PlaySession(loadLevel(1));
  s.start();
  s.update(TICK_MS * 1.5);
  s.pause();
  s.update(TICK_MS * 10);
  assert.equal(s.sim.tick, 1);
  assert.equal(s.tickProgress, 0.5);
  s.resume();
  s.update(TICK_MS * 0.4);
  assert.equal(s.sim.tick, 1);
  s.update(TICK_MS * 0.1);
  assert.equal(s.sim.tick, 2);
});

test('arrows can only be edited during placement', () => {
  const s = new PlaySession(loadLevel(1));
  s.placeArrow(8, 4, 'up');
  s.start();
  assert.equal(s.placeArrow(5, 5, 'right').ok, false);
  assert.equal(s.removeArrow(8, 4), false);
  assert.equal(s.clearArrows(), false);
  assert.equal(s.layout.get(8, 4), 'up');
});

test('reset restores entities but keeps arrows', () => {
  const s = new PlaySession(loadLevel(1));
  s.placeArrow(8, 4, 'up');
  s.start();
  runToEnd(s);
  assert.equal(s.state, PlayState.WON);
  s.reset();
  assert.equal(s.state, PlayState.PLACEMENT);
  assert.equal(s.sim.tick, 0);
  assert.equal(s.sim.savedCount, 0);
  assert.deepEqual(s.sim.mice.map((m) => [m.x, m.y, m.direction, m.status]), [[1, 4, 'right', 'active']]);
  assert.equal(s.layout.get(8, 4), 'up');
  assert.equal(s.layout.inventory.up, 0);
  s.clearArrows();
  assert.equal(s.layout.inventory.up, 1);
});

test('session does not mutate the level it was given', () => {
  const level = loadLevel(3);
  const copy = structuredClone(level);
  const s = new PlaySession(level);
  s.placeArrow(0, 7, 'right');
  s.start();
  runToEnd(s);
  assert.deepEqual(level, copy);
});

test('a loss stops the simulation', () => {
  const s = new PlaySession(levelFromAscii(['>L', '', '', '', '', '', '', '', '...........R']));
  s.start();
  s.update(TICK_MS);
  assert.equal(s.state, PlayState.LOST);
  s.update(TICK_MS * 5);
  assert.equal(s.sim.tick, 1);
});

const SOLUTIONS = {
  1: [[8, 4, 'up']],
  2: [[5, 8, 'up'], [7, 6, 'up'], [7, 4, 'left']],
  3: [[0, 7, 'right'], [10, 7, 'up'], [10, 3, 'left']],
  4: [[6, 3, 'down'], [9, 0, 'down'], [11, 0, 'left'], [11, 8, 'up']],
  5: [[9, 5, 'up'], [5, 8, 'up'], [7, 6, 'up'], [7, 4, 'left']],
  6: [[0, 6, 'right'], [11, 1, 'left'], [2, 0, 'down'], [7, 1, 'down']],
};

for (const [n, arrows] of Object.entries(SOLUTIONS)) {
  test(`built-in level ${n} is solvable and fails without arrows`, () => {
    const s = new PlaySession(loadLevel(n));
    s.start();
    for (let i = 0; i < 400 && !s.isFinished; i++) s.update(TICK_MS);
    assert.notEqual(s.state, PlayState.WON);

    s.reset();
    for (const [x, y, d] of arrows) assert.equal(s.placeArrow(x, y, d).changed, true);
    s.start();
    runToEnd(s);
    assert.equal(s.state, PlayState.WON, s.sim.lossReason ?? '');
    assert.equal(s.sim.savedCount, s.sim.mice.length);
  });
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ArrowLayout } from '../src/core/arrows.js';
import { levelFromAscii } from './helpers.js';

const level = () => levelFromAscii(['>..#', '...R', '..L', '', '', '', '', '', ''], { up: 1, right: 2, down: 0, left: 1 });

test('placing consumes inventory; depleted direction is refused', () => {
  const a = new ArrowLayout(level());
  assert.equal(a.place(1, 0, 'up').changed, true);
  assert.equal(a.inventory.up, 0);
  const r = a.place(2, 0, 'up');
  assert.equal(r.ok, false);
  assert.equal(a.inventory.up, 0);
  assert.equal(a.get(2, 0), null);
  assert.equal(a.place(2, 0, 'down').ok, false);
});

test('cannot place on walls, rockets, spawns or out of bounds', () => {
  const a = new ArrowLayout(level());
  for (const [x, y] of [[3, 0], [3, 1], [0, 0], [2, 2], [-1, 0], [12, 0]]) {
    assert.equal(a.place(x, y, 'right').ok, false, `${x},${y}`);
  }
  assert.equal(a.inventory.right, 2);
});

test('right-click/eraser removal refunds', () => {
  const a = new ArrowLayout(level());
  a.place(1, 0, 'right');
  assert.equal(a.inventory.right, 1);
  assert.equal(a.remove(1, 0), true);
  assert.equal(a.inventory.right, 2);
  assert.equal(a.remove(1, 0), false);
  assert.equal(a.inventory.right, 2);
});

test('replacement refunds old direction and consumes new', () => {
  const a = new ArrowLayout(level());
  a.place(1, 0, 'right');
  const r = a.place(1, 0, 'left');
  assert.equal(r.changed, true);
  assert.equal(a.get(1, 0), 'left');
  assert.deepEqual(a.inventory, { up: 1, right: 2, down: 0, left: 0 });
});

test('replacement with unavailable direction leaves arrow unchanged', () => {
  const a = new ArrowLayout(level());
  a.place(1, 0, 'right');
  const before = { ...a.inventory };
  const r = a.place(1, 0, 'down');
  assert.equal(r.ok, false);
  assert.equal(a.get(1, 0), 'right');
  assert.deepEqual(a.inventory, before);
});

test('same direction on same tile is a no-op', () => {
  const a = new ArrowLayout(level());
  a.place(1, 0, 'up');
  const r = a.place(1, 0, 'up');
  assert.equal(r.changed, false);
  assert.equal(a.inventory.up, 0);
  assert.equal(a.placedCount, 1);
});

test('inventory never goes negative and clear restores everything', () => {
  const a = new ArrowLayout(level());
  for (let x = 0; x < 12; x++) for (let y = 3; y < 9; y++) a.place(x, y, 'right');
  assert.equal(a.inventory.right, 0);
  assert.equal(a.placedCount, 2);
  a.clear();
  assert.deepEqual(a.inventory, { up: 1, right: 2, down: 0, left: 1 });
  assert.equal(a.placedCount, 0);
});

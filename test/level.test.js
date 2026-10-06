import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateLevel, parseLevelJson, serializeLevel, createEmptyLevel } from '../src/core/level.js';
import { EditorState } from '../src/core/editor.js';

const valid = () => ({
  version: 1, name: 'T', width: 12, height: 9,
  walls: [{ x: 0, y: 0 }], rockets: [{ x: 5, y: 5 }],
  mice: [{ x: 1, y: 1, direction: 'right' }], cats: [{ x: 2, y: 2, direction: 'left' }],
  arrowInventory: { up: 1, right: 0, down: 2, left: 3 },
});
const errorsFor = (mutate) => {
  const l = valid();
  mutate(l);
  return validateLevel(l).errors.join('\n');
};

test('built-in levels validate', () => {
  for (const n of [1, 2, 3, 4, 5, 6]) {
    const r = parseLevelJson(readFileSync(new URL(`../src/levels/level${n}.json`, import.meta.url), 'utf8'));
    assert.equal(r.ok, true, r.errors.join());
  }
});

test('valid level passes', () => assert.equal(validateLevel(valid()).ok, true));

test('rejects invalid JSON', () => {
  const r = parseLevelJson('{nope');
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /Invalid JSON/);
});

test('rejects unsupported version', () => assert.match(errorsFor((l) => (l.version = 2)), /Unsupported version/));
test('rejects wrong dimensions', () => assert.match(errorsFor((l) => (l.width = 10)), /12x9/));
test('rejects out-of-bounds coordinates', () => assert.match(errorsFor((l) => l.walls.push({ x: 12, y: 0 })), /out of bounds/));
test('rejects non-integer coordinates', () => assert.match(errorsFor((l) => l.walls.push({ x: 1.5, y: 0 })), /integer/));
test('rejects overlapping objects', () => assert.match(errorsFor((l) => l.rockets.push({ x: 1, y: 1 })), /mice\[0\] at \(1, 1\) overlaps rockets\[1\]/));
test('rejects invalid directions', () => assert.match(errorsFor((l) => (l.cats[0].direction = 'north')), /invalid direction/));
test('rejects invalid inventory counts', () => {
  assert.match(errorsFor((l) => (l.arrowInventory.up = -1)), /arrowInventory.up/);
  assert.match(errorsFor((l) => (l.arrowInventory.left = 1.5)), /arrowInventory.left/);
  assert.match(errorsFor((l) => delete l.arrowInventory.down), /arrowInventory.down/);
});
test('requires a mouse and a rocket', () => {
  assert.match(errorsFor((l) => (l.mice = [])), /at least one mouse/);
  assert.match(errorsFor((l) => (l.rockets = [])), /at least one rocket/);
});

test('export omits runtime state and round-trips through import', () => {
  const editor = new EditorState(createEmptyLevel('Round Trip'));
  editor.stamp('wall', 3, 3);
  editor.stamp('rocket', 10, 1);
  editor.stamp('mouse', 1, 1, 'down');
  editor.stamp('cat', 6, 6, 'left');
  editor.setInventory('left', 4);
  const json = serializeLevel(editor.toLevel());
  const parsed = JSON.parse(json);
  assert.deepEqual(Object.keys(parsed), ['version', 'name', 'width', 'height', 'walls', 'rockets', 'mice', 'cats', 'arrowInventory']);
  const r = parseLevelJson(json);
  assert.equal(r.ok, true);
  const again = new EditorState(r.level);
  assert.equal(serializeLevel(again.toLevel()), json);
  assert.deepEqual(again.get(1, 1), { type: 'mouse', direction: 'down' });
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EditorState } from '../src/core/editor.js';
import { createEmptyLevel, serializeLevel } from '../src/core/level.js';
import { PlaySession } from '../src/core/session.js';
import { TICK_MS } from '../src/core/constants.js';

const draft = () => {
  const e = new EditorState(createEmptyLevel('Draft'));
  e.stamp('mouse', 0, 0, 'right');
  e.stamp('rocket', 5, 0);
  e.stamp('cat', 0, 8, 'up');
  e.setInventory('down', 2);
  e.markSaved();
  return e;
};

test('stamping replaces cell contents; one object per cell', () => {
  const e = draft();
  e.stamp('wall', 0, 0);
  assert.deepEqual(e.get(0, 0), { type: 'wall' });
  e.stamp('cat', 0, 0, 'left');
  assert.deepEqual(e.get(0, 0), { type: 'cat', direction: 'left' });
  e.stamp('floor', 0, 0);
  assert.equal(e.get(0, 0), null);
  assert.equal(e.toLevel().cats.length, 1);
});

test('dirty tracking', () => {
  const e = draft();
  assert.equal(e.dirty, false);
  assert.equal(e.stamp('floor', 3, 3), false); // no-op
  assert.equal(e.dirty, false);
  e.stamp('wall', 3, 3);
  assert.equal(e.dirty, true);
});

test('incomplete drafts are allowed but flagged invalid', () => {
  const e = new EditorState();
  e.stamp('wall', 1, 1);
  e.setInventory('up', Number.NaN);
  const v = e.validate();
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((m) => /mouse/.test(m)));
  assert.ok(v.errors.some((m) => /arrowInventory.up/.test(m)));
});

test('playtesting does not change the editor draft', () => {
  const e = draft();
  const before = serializeLevel(e.toLevel());
  const session = new PlaySession(e.validate().level);
  session.placeArrow(3, 3, 'down');
  session.start();
  for (let i = 0; i < 50; i++) session.update(TICK_MS);
  assert.equal(serializeLevel(e.toLevel()), before);
  assert.equal(e.dirty, false);
  assert.equal(e.get(3, 3), null);
});

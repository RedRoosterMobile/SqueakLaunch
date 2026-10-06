import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation, stepSimulation } from '../src/core/simulation.js';
import { levelFromAscii } from './helpers.js';

const pad = (rows) => [...rows, ...Array(9 - rows.length).fill('')].map((r) => r.padEnd(12, '.'));
const sim = (rows, arrows = []) => createSimulation(levelFromAscii(pad(rows)), new Map(arrows));

test('mouse moving onto a stationary cat is eaten (tick 1, cat does not move)', () => {
  const s = sim(['>L', '', '', '', '', '', '', '', '...........R']);
  const ev = stepSimulation(s);
  assert.equal(ev.tick, 1);
  assert.equal(ev.catsMoved, false);
  assert.deepEqual(ev.eaten, ['mouse-0']);
  assert.equal(s.outcome, 'lost');
});

test('cat and mouse moving into the same tile collide', () => {
  // tick 2: mouse (0,1) -> (1,1) while cat (1,0) -> (1,1)
  const s = sim(['.N', '>', '', '', '', '', '', '', '...........R']);
  s.tick = 1;
  const ev = stepSimulation(s);
  assert.deepEqual([s.cats[0].x, s.cats[0].y], [1, 1]);
  assert.deepEqual(ev.eaten, ['mouse-0']);
  assert.equal(ev.lossReason, 'A cat caught a mouse!');
});

test('cat and mouse swapping tiles in one tick is a collision', () => {
  // tick 2: mouse (2,0) -> (3,0), cat (3,0) -> (2,0)
  const s = sim(['.>.L', '', '', '', '', '', '', '', '...........R']);
  s.mice[0].x = 2; // put mouse directly beside the cat before tick 2
  s.tick = 1;
  const ev = stepSimulation(s);
  assert.equal(ev.tick, 2);
  assert.deepEqual(ev.eaten, ['mouse-0']);
  assert.equal(s.outcome, 'lost');
});

test('mouse reaching a rocket is saved and removed; rockets accept many mice', () => {
  const s = sim(['>R', '>.', '', '', '', '', '', '', '']);
  // second mouse at (0,1) right -> (1,1); then needs an arrow up to reach rocket
  s.arrows.set('1,1', 'up');
  const ev1 = stepSimulation(s);
  assert.deepEqual(ev1.saved, ['mouse-0']);
  assert.equal(s.outcome, null);
  const ev2 = stepSimulation(s);
  assert.deepEqual(ev2.saved, ['mouse-1']);
  assert.equal(s.savedCount, 2);
  assert.equal(s.outcome, 'won');
});

test('cat reaching a rocket is an immediate failure', () => {
  const s = sim(['.PR', '', '', '', '', '', '', '', '>..........']);
  stepSimulation(s);
  const ev = stepSimulation(s);
  assert.deepEqual(ev.catsInRocket, ['cat-0']);
  assert.equal(s.outcome, 'lost');
});

test('cat failure takes precedence over victory in the same tick', () => {
  // tick 2: last mouse reaches rocket A while a cat reaches rocket B
  const s = sim(['.>R', '', '', '', '', '', '', '', '.PR']);
  stepSimulation(s); // tick 1: mouse saved? mouse (1,0)->(2,0) rocket -> saved & won on tick 1
  assert.equal(s.outcome, 'won');

  const s2 = sim(['>.R', '', '', '', '', '', '', '', '.PR']);
  stepSimulation(s2); // mouse to (1,0)
  const ev = stepSimulation(s2); // mouse to rocket, cat to rocket
  assert.equal(ev.outcome, 'lost');
  assert.deepEqual(ev.saved, []);
  assert.equal(s2.mice[0].status, 'active');
});

test('mouse eaten on a rocket tile still loses', () => {
  const s = sim(['>RL', '', '', '', '', '', '', '', '']);
  s.tick = 1;
  // tick 2: mouse -> (1,0) rocket, cat -> (1,0) rocket
  const ev = stepSimulation(s);
  assert.equal(ev.outcome, 'lost');
  assert.deepEqual(ev.eaten, ['mouse-0']);
});

test('finished simulation does not advance', () => {
  const s = sim(['>R']);
  stepSimulation(s);
  assert.equal(stepSimulation(s), null);
  assert.equal(s.tick, 1);
});

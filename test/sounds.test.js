import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { App } from '../src/app.js';
import { SFX_VOLUMES, tickSound } from '../src/render/sounds.js';
import { levelFromAscii } from './helpers.js';

function setup() {
  const app = new App([levelFromAscii(['>..R'], { up: 2, right: 2 })]);
  const sounds = [];
  app.onSceneReady({ playSfx: (name) => sounds.push(name), clearEffects() {}, setEffectsPaused() {} });
  return { app, sounds };
}

test('arrow feedback only plays on real changes or rejections', () => {
  const { app, sounds } = setup();
  const click = (x, right = false) => app.handlePlayPointer({ x, y: 0 }, { type: 'down', right });
  click(1);
  click(1); // Same arrow is a no-op.
  app.selectPlayTool('right');
  click(1); // Replacement.
  click(1, true);
  click(1, true); // Empty removal is a no-op.
  click(0); // Spawn tile is blocked.
  app.clearArrows(); // Empty clear is a no-op.
  click(2);
  app.clearArrows();
  assert.deepEqual(sounds, ['place', 'select', 'place', 'remove', 'error', 'place', 'clear']);
});

test('session state sounds cover start, pause, resume and reset without duplicates', () => {
  const { app, sounds } = setup();
  app.toggleRun();
  app.handlePlayPointer({ x: 1, y: 0 }, { type: 'down' });
  app.toggleRun();
  app.toggleRun();
  app.reset();
  app.reset();
  assert.deepEqual(sounds, ['start', 'error', 'pause', 'resume', 'reset']);
});

test('editor stamps, erasures, validation and import have feedback', () => {
  const { app, sounds } = setup();
  app.switchToEditor();
  app.stamp('wall', { x: 1, y: 1 });
  app.stamp('wall', { x: 1, y: 1 });
  app.stamp('floor', { x: 1, y: 1 });
  app.testLevel(); // Empty draft.
  app.importLevel(levelFromAscii(['>R']));
  assert.deepEqual(sounds, ['select', 'stamp', 'remove', 'error', 'confirm']);
});

test('tick sounds batch rescues and prioritize one distinct outcome cue', () => {
  const events = { saved: [], eaten: [], catsInRocket: [], outcome: null };
  assert.equal(tickSound(events), null);
  assert.equal(tickSound({ ...events, saved: ['a', 'b'] }), 'save');
  assert.equal(tickSound({ ...events, saved: ['a'], outcome: 'won' }), 'win');
  assert.equal(tickSound({ ...events, eaten: ['a', 'b'], catsInRocket: ['c'], outcome: 'lost' }), 'chomp');
  assert.equal(tickSound({ ...events, catsInRocket: ['c'], outcome: 'lost' }), 'hijack');
  assert.equal(tickSound({ ...events, outcome: 'lost' }), 'lose');
});

test('every configured SFX has a nonempty PCM WAV asset', () => {
  for (const name of Object.keys(SFX_VOLUMES)) {
    const wav = readFileSync(new URL(`../public/sfx/${name}.wav`, import.meta.url));
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
    assert.equal(wav.readUInt16LE(20), 1);
    assert.equal(wav.readUInt32LE(24), 22050);
    assert.ok(wav.length > 1000);
  }
});

import * as Phaser from 'phaser';
import './style.css';
import { GRID_WIDTH, GRID_HEIGHT } from './core/constants.js';
import { BUILTIN_LEVELS, BUILTIN_HINTS } from './levels/index.js';
import { App } from './app.js';
import { BoardScene } from './render/BoardScene.js';
import { TILE, COLORS, toCss } from './render/theme.js';
import { bindStage } from './ui/stage.js';
import { bindPlayPanel } from './ui/playPanel.js';
import { bindEditorPanel } from './ui/editorPanel.js';
import { bindKeyboard } from './ui/keyboard.js';

const app = new App(BUILTIN_LEVELS, BUILTIN_HINTS);

const stage = bindStage(app);
const play = bindPlayPanel(app);
const editor = bindEditorPanel(app);
app.attachUi({
  refresh() {
    stage.refresh();
    play.refresh();
    editor.refresh();
  },
  toast: stage.toast,
});
bindKeyboard(app);

window.addEventListener('beforeunload', (e) => {
  if (app.editor.dirty) e.preventDefault();
});

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GRID_WIDTH * TILE,
  height: GRID_HEIGHT * TILE,
  backgroundColor: toCss(COLORS.background),
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { keyboard: false },
  banner: false,
  scene: [new BoardScene(app)],
});

// Handy for debugging in the console.
window.squeak = { app, game };

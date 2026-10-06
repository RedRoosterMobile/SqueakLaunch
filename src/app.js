// Application controller: owns mode, play session and editor draft; UI and scene call into it.
import { validateLevel, createEmptyLevel } from './core/level.js';
import { PlaySession, PlayState } from './core/session.js';
import { EditorState, PAINT_TOOLS } from './core/editor.js';
import { DIRECTIONS } from './core/constants.js';

export class App {
  constructor(levels, hints = []) {
    this.hints = hints;
    this.levels = levels.map((l, i) => {
      const r = validateLevel(l);
      if (!r.ok) throw new Error(`Built-in level ${i + 1} is invalid: ${r.errors.join(' ')}`);
      return r.level;
    });
    this.mode = 'play';
    this.levelIndex = 0;
    this.playtest = false; // true when the session is a copy of the editor draft
    this.session = null;
    this.playTool = 'up';
    this.editor = new EditorState(createEmptyLevel('My Level'));
    this.editorTool = 'wall';
    this.editorDirection = { mouse: 'right', cat: 'left' };
    this.painting = null; // { tool } while dragging in the editor
    this.scene = null;
    this.ui = { refresh() {}, toast() {} };
    this.unsubscribe = null;
    this.loadLevel(0);
  }

  attachUi(ui) {
    this.ui = ui;
    this.refresh();
  }

  onSceneReady(scene) {
    this.scene = scene;
  }

  refresh() {
    this.ui.refresh(this);
  }

  // ------------------------------------------------------------- play

  setSession(level) {
    this.unsubscribe?.();
    this.session = new PlaySession(level); // a fresh session = fresh (empty) arrow layout
    this.unsubscribe = this.session.onChange((type) => {
      if (type === 'state' || type === 'tick' || type === 'reset' || type === 'arrows') this.refresh();
      if (type === 'state') this.scene?.setEffectsPaused(this.session.state === PlayState.PAUSED);
    });
    this.scene?.clearEffects();
    this.selectPlayTool(this.firstAvailableTool());
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.playtest = false;
    this.setSession(this.levels[index]);
    this.refresh();
  }

  firstAvailableTool() {
    return DIRECTIONS.find((d) => this.session.layout.inventory[d] > 0) ?? 'eraser';
  }

  selectPlayTool(tool) {
    this.playTool = tool;
    this.refresh();
  }

  toggleRun() {
    if (this.mode !== 'play') return;
    this.session.toggle();
  }

  reset() {
    if (this.mode !== 'play') return;
    this.scene?.clearEffects();
    this.session.reset();
    this.ui.toast('Reset — arrows kept. Adjust them and press Start.');
  }

  clearArrows() {
    if (this.mode !== 'play') return;
    if (this.session.clearArrows()) this.ui.toast('Arrows cleared.');
    else this.ui.toast('Reset first to change arrows.', 'bad');
  }

  nextLevel() {
    if (!this.playtest && this.levelIndex < this.levels.length - 1) this.loadLevel(this.levelIndex + 1);
  }

  handlePlayPointer(cell, { type, right }) {
    if (type !== 'down') return;
    const { session } = this;
    if (!session.canEditArrows) {
      this.ui.toast(session.isFinished ? 'Level over — press Reset to try again.' : 'Arrows are locked while running. Press R to reset.', 'bad');
      return;
    }
    if (right || this.playTool === 'eraser') {
      if (session.removeArrow(cell.x, cell.y)) this.ui.toast('Arrow removed and refunded.');
      return;
    }
    const result = session.placeArrow(cell.x, cell.y, this.playTool);
    if (!result.ok) this.ui.toast(result.reason, 'bad');
  }

  // ------------------------------------------------------------- modes

  switchToEditor() {
    this.session.pause();
    this.mode = 'editor';
    this.refresh();
  }

  /** Back from a playtest: the draft was never touched, so just show it again. */
  backToEditor() {
    this.switchToEditor();
  }

  returnToPlay() {
    this.mode = 'play';
    this.painting = null;
    if (this.playtest) this.loadLevel(this.levelIndex);
    this.refresh();
  }

  /** Validate the draft and launch Play Mode with an independent copy of it. */
  testLevel() {
    const result = this.editor.validate();
    if (!result.ok) {
      this.ui.toast('Fix the listed problems before testing.', 'bad');
      this.refresh();
      return false;
    }
    this.playtest = true;
    this.setSession(result.level);
    this.mode = 'play';
    this.refresh();
    this.ui.toast('Playtesting your draft. Use "Back to Editor" to keep editing.');
    return true;
  }

  // ------------------------------------------------------------- editor

  selectEditorTool(tool) {
    this.editorTool = tool;
    this.refresh();
  }

  setEditorDirection(kind, dir) {
    this.editorDirection[kind] = dir;
    this.editorTool = kind;
    this.refresh();
  }

  handleEditorPointer(cell, { type, right }) {
    if (type === 'down') {
      const tool = right ? 'floor' : this.editorTool;
      this.painting = PAINT_TOOLS.includes(tool) ? { tool } : null;
      this.stamp(tool, cell);
    } else if (type === 'drag' && this.painting) {
      this.stamp(this.painting.tool, cell);
    }
  }

  stamp(tool, cell) {
    if (this.editor.stamp(tool, cell.x, cell.y, this.editorDirection[tool])) this.refresh();
  }

  newLevel() {
    this.editor.load(createEmptyLevel('My Level'));
    this.refresh();
  }

  importLevel(level) {
    this.editor.load(level);
    this.refresh();
  }

  // ------------------------------------------------------------- board input

  handleBoardPointer(cell, info) {
    if (this.mode === 'play') this.handlePlayPointer(cell, info);
    else this.handleEditorPointer(cell, info);
  }

  handleBoardPointerUp() {
    this.painting = null;
  }
}

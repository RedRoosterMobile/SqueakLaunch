// Global keyboard shortcuts. Ignored while typing or while a dialog is open
// (native <dialog> handles Escape itself).
import { isTypingTarget } from './dom.js';
import { isDialogOpen } from './dialogs.js';

const ARROW_KEYS = { 1: 'up', 2: 'right', 3: 'down', 4: 'left' };

export function bindKeyboard(app) {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isDialogOpen() || isTypingTarget(e.target)) return;
    if (app.mode !== 'play') return;
    const key = e.key.toLowerCase();
    if (ARROW_KEYS[key]) app.selectPlayTool(ARROW_KEYS[key]);
    else if (key === 'e') app.selectPlayTool('eraser');
    else if (key === ' ') {
      e.preventDefault();
      // Avoid a focused button also receiving this Space press as a click.
      if (e.target instanceof HTMLElement && e.target !== document.body) e.target.blur();
      if (!e.repeat) app.toggleRun();
    } else if (key === 'r') app.reset();
  });
}

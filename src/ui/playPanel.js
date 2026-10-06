// Play-mode sidebar: level selector, run controls, arrow inventory.
import { $, $$, el } from './dom.js';
import { PlayState } from '../core/session.js';
import { DIRECTIONS } from '../core/constants.js';

export function bindPlayPanel(app) {
  const panel = $('#play-panel');
  const select = $('#level-select');
  const startBtn = $('#btn-start');
  const resetBtn = $('#btn-reset');
  const clearBtn = $('#btn-clear');
  const toEditor = $('#btn-to-editor');
  const backToEditor = $('#btn-back-to-editor');
  const toolButtons = $$('#inventory [data-tool]');

  select.replaceChildren(...app.levels.map((l, i) => el('option', { value: String(i), textContent: `${i + 1}. ${l.name}` })));
  const customOption = el('option', { value: 'custom', textContent: '★ Your draft (testing)', disabled: true });
  select.append(customOption);
  select.addEventListener('change', () => {
    if (select.value !== 'custom') app.loadLevel(Number(select.value));
    select.blur();
  });

  startBtn.addEventListener('click', () => app.toggleRun());
  resetBtn.addEventListener('click', () => app.reset());
  clearBtn.addEventListener('click', () => app.clearArrows());
  toEditor.addEventListener('click', () => app.switchToEditor());
  backToEditor.addEventListener('click', () => app.backToEditor());
  for (const b of toolButtons) b.addEventListener('click', () => app.selectPlayTool(b.dataset.tool));

  function refresh() {
    panel.hidden = app.mode !== 'play';
    if (panel.hidden) return;
    const s = app.session;
    select.value = app.playtest ? 'custom' : String(app.levelIndex);
    customOption.hidden = !app.playtest;

    startBtn.textContent = { [PlayState.RUNNING]: 'Pause', [PlayState.PAUSED]: 'Resume' }[s.state] ?? 'Start';
    startBtn.disabled = s.isFinished;
    clearBtn.disabled = !s.canEditArrows || s.layout.placedCount === 0;
    resetBtn.disabled = s.state === PlayState.PLACEMENT && s.sim.tick === 0;
    toEditor.hidden = app.playtest;
    backToEditor.hidden = !app.playtest;

    for (const b of toolButtons) {
      const tool = b.dataset.tool;
      b.classList.toggle('selected', app.playTool === tool);
      b.classList.toggle('locked', !s.canEditArrows);
      if (DIRECTIONS.includes(tool)) {
        const n = s.layout.inventory[tool];
        $('.count', b).textContent = String(n);
        b.classList.toggle('depleted', n === 0);
        b.title = `${tool} arrows: ${n} left`;
      }
    }
  }

  return { refresh };
}

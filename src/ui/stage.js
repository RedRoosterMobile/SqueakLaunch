// Board header (title, state, saved count), toast line and the win/loss overlay.
import { $, el } from './dom.js';
import { PlayState } from '../core/session.js';

const STATE_LABEL = {
  [PlayState.PLACEMENT]: 'PLACEMENT',
  [PlayState.RUNNING]: 'RUNNING',
  [PlayState.PAUSED]: 'PAUSED',
  [PlayState.WON]: 'WON',
  [PlayState.LOST]: 'LOST',
};

export function bindStage(app) {
  const title = $('#level-title');
  const pill = $('#status-pill');
  const saved = $('#saved-count');
  const badge = $('#mode-badge');
  const overlay = $('#result-overlay');
  const card = $('.result-card', overlay);
  const resultTitle = $('#result-title');
  const resultText = $('#result-text');
  const actions = $('#result-actions');
  const toastEl = $('#toast');
  const hintEl = $('#level-hint');
  let toastTimer = 0;
  let overlayKey = '';

  const button = (label, onClick, cls = '') => el('button', { className: `btn ${cls}`, textContent: label, onclick: onClick });

  function toast(message, tone = '') {
    toastEl.textContent = message;
    toastEl.className = tone;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.textContent = '';
      toastEl.className = '';
    }, 3200);
  }

  function renderOverlay() {
    const s = app.session;
    const key = app.mode === 'play' && s.isFinished ? `${s.state}:${app.levelIndex}:${app.playtest}` : '';
    if (key === overlayKey) return;
    overlayKey = key;
    overlay.hidden = !key;
    if (!key) return;
    const won = s.state === PlayState.WON;
    card.classList.toggle('lost', !won);
    resultTitle.textContent = won ? 'LIFTOFF!' : 'MISSION FAILED';
    resultText.textContent = won
      ? `${s.sim.mice.length === 1 ? 'The mouse is' : `All ${s.sim.mice.length} mice are`} safe — solved with ${s.layout.placedCount} arrow${s.layout.placedCount === 1 ? '' : 's'}.`
      : s.sim.lossReason;
    const hasNext = !app.playtest && app.levelIndex < app.levels.length - 1;
    const btns = [];
    if (won && hasNext) btns.push(button('Next Level ▶', () => app.nextLevel(), 'primary'));
    if (won && !hasNext && !app.playtest) btns.push(button('Build your own ✎', () => app.switchToEditor(), 'primary'));
    btns.push(button(won ? 'Replay' : 'Retry (keep arrows)', () => app.reset(), won ? '' : 'primary'));
    if (!won) btns.push(button('Clear Arrows & Retry', () => { app.reset(); app.clearArrows(); }));
    if (app.playtest) btns.push(button('◀ Back to Editor', () => app.backToEditor(), 'accent'));
    actions.replaceChildren(...btns);
  }

  function refresh() {
    const isPlay = app.mode === 'play';
    badge.textContent = isPlay ? (app.playtest ? 'PLAYTEST' : 'PLAY MODE') : 'EDITOR';
    badge.classList.toggle('editor', !isPlay);
    if (isPlay) {
      const s = app.session;
      title.textContent = app.playtest ? `${s.level.name} (test)` : `${app.levelIndex + 1}. ${s.level.name}`;
      pill.textContent = STATE_LABEL[s.state];
      pill.className = `pill ${s.state}`;
      saved.hidden = false;
      saved.textContent = `🐭 ${s.sim.savedCount} / ${s.sim.mice.length} saved`;
    } else {
      title.textContent = `✎ ${app.editor.name || 'Untitled'}`;
      pill.textContent = app.editor.dirty ? 'UNSAVED' : 'EDITING';
      pill.className = 'pill editing';
      saved.hidden = true;
    }
    const hint = isPlay && !app.playtest ? app.hints[app.levelIndex] : '';
    hintEl.textContent = hint ?? '';
    hintEl.hidden = !hint;
    renderOverlay();
  }

  return { refresh, toast };
}

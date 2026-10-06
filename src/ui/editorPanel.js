// Editor sidebar: palette, direction pickers, metadata fields, file actions, live validation.
import { $, $$, el } from './dom.js';
import { confirmDiscard, openExportDialog, openImportDialog } from './dialogs.js';

export function bindEditorPanel(app) {
  const panel = $('#editor-panel');
  const toolButtons = $$('#palette [data-tool]');
  const pickers = $$('#palette .dir-picker');
  const nameInput = $('#ed-name');
  const invInputs = $$('[data-inv]');
  const status = $('#ed-status');

  for (const b of toolButtons) b.addEventListener('click', () => app.selectEditorTool(b.dataset.tool));
  for (const picker of pickers) {
    for (const b of $$('button', picker)) {
      b.addEventListener('click', () => app.setEditorDirection(picker.dataset.for, b.dataset.dir));
    }
  }

  nameInput.addEventListener('input', () => {
    app.editor.setName(nameInput.value);
    app.refresh();
  });
  for (const input of invInputs) {
    input.addEventListener('input', () => {
      // Keep whatever was typed; invalid values are flagged by validation instead of silently fixed.
      const value = input.value.trim() === '' ? Number.NaN : Number(input.value);
      app.editor.setInventory(input.dataset.inv, value);
      app.refresh();
    });
  }

  $('#ed-new').addEventListener('click', async () => {
    if (app.editor.dirty && !(await confirmDiscard('Start a new level? Your unsaved draft will be lost.'))) return;
    app.newLevel();
    app.ui.toast('New blank level.');
  });
  $('#ed-test').addEventListener('click', () => app.testLevel());
  $('#ed-export').addEventListener('click', () => {
    const result = app.editor.validate();
    if (!result.ok) {
      app.ui.toast('Only valid levels can be exported — see the problems listed.', 'bad');
      return;
    }
    openExportDialog(result.level, () => {
      app.editor.markSaved();
      app.refresh();
    });
  });
  $('#ed-import').addEventListener('click', () => {
    openImportDialog(async (level) => {
      if (app.editor.dirty && !(await confirmDiscard('Importing will replace your unsaved draft.'))) return false;
      app.importLevel(level);
      app.ui.toast(`Imported "${level.name}".`, 'good');
      return true;
    });
  });
  $('#btn-to-play').addEventListener('click', () => app.returnToPlay());

  let lastRevision = -1;
  function refresh() {
    panel.hidden = app.mode !== 'editor';
    if (panel.hidden) return;
    const { editor } = app;
    for (const b of toolButtons) b.classList.toggle('selected', app.editorTool === b.dataset.tool);
    for (const picker of pickers) {
      for (const b of $$('button', picker)) b.classList.toggle('selected', app.editorDirection[picker.dataset.for] === b.dataset.dir);
    }
    // Only overwrite inputs from state when the draft was replaced/changed elsewhere, so typing isn't disturbed.
    if (document.activeElement !== nameInput) nameInput.value = editor.name;
    for (const input of invInputs) {
      const v = editor.inventory[input.dataset.inv];
      if (document.activeElement !== input) input.value = Number.isFinite(v) ? String(v) : '';
      input.classList.toggle('invalid', !(Number.isInteger(v) && v >= 0 && v <= 99));
    }
    if (editor.revision === lastRevision && status.dataset.dirty === String(editor.dirty)) return;
    lastRevision = editor.revision;
    status.dataset.dirty = String(editor.dirty);
    const result = editor.validate();
    const nodes = [];
    if (result.ok) nodes.push(el('div', { className: 'ok', textContent: '✔ Valid level — ready to test or export.' }));
    else {
      nodes.push(el('div', { textContent: 'Draft is incomplete (editing is fine):' }));
      nodes.push(el('ul', {}, ...result.errors.map((e) => el('li', { textContent: e }))));
    }
    if (editor.dirty) nodes.push(el('div', { className: 'dirty', textContent: '● Unsaved changes (export to save)' }));
    status.replaceChildren(...nodes);
  }

  return { refresh };
}

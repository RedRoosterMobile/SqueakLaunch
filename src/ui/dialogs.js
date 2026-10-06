// Native <dialog> based modals: confirm, export, import. Escape closes them natively.
import { $, el } from './dom.js';
import { serializeLevel, parseLevelJson } from '../core/level.js';

const jsonDialog = () => $('#json-dialog');

export function isDialogOpen() {
  return [...document.querySelectorAll('dialog')].some((d) => d.open);
}

/** Resolves true if the user confirms discarding the draft. */
export function confirmDiscard(text) {
  const dialog = $('#confirm-dialog');
  $('#confirm-text').textContent = text;
  dialog.returnValue = 'cancel';
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
  });
}

function setupJsonDialog({ title, hint, text, readOnly, showFile }) {
  const dialog = jsonDialog();
  $('#json-title').textContent = title;
  $('#json-hint').textContent = hint;
  const textarea = $('#json-text');
  textarea.value = text;
  textarea.readOnly = readOnly;
  $('#json-file-row').hidden = !showFile;
  $('#json-file-name').textContent = '';
  $('#json-file').value = '';
  $('#json-errors').replaceChildren();
  setMessage('');
  return { dialog, textarea, actions: $('#json-actions') };
}

function setMessage(text, tone = '') {
  const msg = $('#json-msg');
  msg.textContent = text;
  msg.className = `dialog-msg ${tone}`;
}

const button = (label, cls, onClick) => el('button', { type: 'button', className: `btn ${cls}`, textContent: label, onclick: onClick });

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'level';

/** Show formatted JSON with Copy and Download. `onSaved` runs after either succeeds. */
export function openExportDialog(level, onSaved) {
  const json = serializeLevel(level);
  const { dialog, textarea, actions } = setupJsonDialog({
    title: 'Export Level',
    hint: 'Copy this JSON or download it as a file. You can import it again later.',
    text: json,
    readOnly: true,
    showFile: false,
  });
  actions.replaceChildren(
    button('Close', '', () => dialog.close()),
    button('Download JSON', '', () => {
      const url = URL.createObjectURL(new Blob([json + '\n'], { type: 'application/json' }));
      const a = el('a', { href: url, download: `${slug(level.name)}.json` });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Download started.', 'good');
      onSaved();
    }),
    button('Copy', 'primary', async () => {
      try {
        await navigator.clipboard.writeText(json);
        setMessage('Copied to clipboard!', 'good');
        onSaved();
      } catch {
        textarea.focus();
        textarea.select();
        setMessage('Clipboard unavailable — the text is selected; press Ctrl/Cmd+C to copy it.', 'bad');
      }
    }),
  );
  dialog.showModal();
  textarea.scrollTop = 0;
}

/**
 * Paste JSON or choose a file; validated before `onImport(level)` is called.
 * `onImport` may return/resolve false to keep the dialog open (e.g. user cancelled a confirm).
 */
export function openImportDialog(onImport) {
  const { dialog, textarea, actions } = setupJsonDialog({
    title: 'Import Level',
    hint: 'Paste level JSON below or choose a .json file. Your draft is only replaced if the level is valid.',
    text: '',
    readOnly: false,
    showFile: true,
  });
  const fileInput = $('#json-file');
  fileInput.onchange = async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    $('#json-file-name').textContent = file.name;
    try {
      textarea.value = await file.text();
      setMessage('File loaded — press Import to validate and load it.');
    } catch {
      setMessage('Could not read that file.', 'bad');
    }
  };
  const doImport = async () => {
    const errorsList = $('#json-errors');
    if (!textarea.value.trim()) {
      setMessage('Paste some JSON or choose a file first.', 'bad');
      return;
    }
    const result = parseLevelJson(textarea.value);
    if (!result.ok) {
      errorsList.replaceChildren(...result.errors.map((e) => el('li', { textContent: e })));
      setMessage(`Import failed (${result.errors.length} problem${result.errors.length === 1 ? '' : 's'}). Your current draft is unchanged.`, 'bad');
      return;
    }
    errorsList.replaceChildren();
    if ((await onImport(result.level)) !== false) dialog.close();
  };
  actions.replaceChildren(button('Cancel', '', () => dialog.close()), button('Import', 'primary', doImport));
  dialog.showModal();
  textarea.focus();
}

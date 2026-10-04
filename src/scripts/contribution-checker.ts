import { parseContractText, type Contract } from '../specification/contracts';
import { decodeMapUtf8 } from '../specification/strict-json.ts';

const form = document.querySelector<HTMLFormElement>('#contribution-form')!;
const editor = document.querySelector<HTMLTextAreaElement>('#contribution-json')!;
const fileInput = document.querySelector<HTMLInputElement>('#contribution-file')!;
const download = document.querySelector<HTMLButtonElement>('[data-download]')!;
const submit = document.querySelector<HTMLAnchorElement>('[data-submit]')!;
const submitLabel = submit.querySelector<HTMLElement>('[data-submit-label]')!;
const submitNote = document.querySelector<HTMLElement>('[data-submit-note]')!;
const status = form.querySelector<HTMLElement>('[data-check-status]')!;
const errors = form.querySelector<HTMLElement>('.contribution-errors')!;
const preview = document.querySelector<HTMLElement>('[data-preview]')!;
let checked: Contract | undefined;
let generation = 0;
const maxBytes = 256 * 1024;
function reset() {
  generation++;
  checked = undefined;
  download.disabled = true;
  submit.removeAttribute('href');
  submit.setAttribute('aria-disabled', 'true');
  submit.tabIndex = -1;
  preview.hidden = errors.hidden = true;
  status.textContent = '';
}
function showErrors(messages: string[]) {
  errors.querySelector('ul')!.replaceChildren(
    ...messages.slice(0, 12).map((message) => {
      const item = document.createElement('li');
      item.textContent = message;
      return item;
    }),
  );
  errors.hidden = false;
  status.textContent = 'The file needs changes.';
}
function filename(contract: Contract) {
  // A filename is an editor convenience, never an authority or ownership claim.
  const last = new URL(contract.id).pathname.split('/').filter(Boolean).pop() || 'new-type';
  return `${last.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 80)}.json`;
}
function fact(label: string, value: string) {
  const row = document.createElement('div');
  const term = document.createElement('dt');
  term.textContent = label;
  const description = document.createElement('dd');
  description.textContent = value;
  row.append(term, description);
  return row;
}
editor.addEventListener('input', reset);
fileInput.addEventListener('change', async () => {
  reset();
  const ticket = generation;
  const file = fileInput.files?.[0];
  if (!file) return;
  if (file.size > maxBytes) return showErrors(['Choose a JSON file smaller than 256 KiB.']);
  try {
    const text = decodeMapUtf8(new Uint8Array(await file.arrayBuffer()));
    if (ticket === generation) {
      editor.value = text;
      editor.focus();
    }
  } catch (error) {
    if (ticket === generation) showErrors([String(error)]);
  }
});
document.querySelectorAll<HTMLAnchorElement>('[data-example]').forEach((link) => {
  link.addEventListener('click', async (event) => {
    event.preventDefault();
    reset();
    const ticket = generation;
    try {
      const response = await fetch(link.href);
      if (!response.ok)
        throw new Error('Could not load the contract. Try the download link again.');
      const text = await response.text();
      if (ticket === generation) {
        editor.value = text;
        editor.focus();
      }
    } catch (error) {
      if (ticket === generation) showErrors([String(error)]);
    }
  });
});
form.addEventListener('submit', (event) => {
  event.preventDefault();
  reset();
  try {
    if (new TextEncoder().encode(editor.value).length > maxBytes)
      throw new Error('Use a contract smaller than 256 KiB.');
    const input = parseContractText(editor.value);
    checked = input;
    preview.querySelector('[data-preview-title]')!.textContent = input.name;
    preview.querySelector('[data-preview-summary]')!.textContent = input.summary;
    preview
      .querySelector('[data-preview-facts]')!
      .replaceChildren(
        fact('Identifier', input.id),
        fact('Version', input.version),
        fact('Operations', input.operations.map((operation) => operation.name).join(', ')),
        fact(
          'Effects',
          [...new Set(input.operations.flatMap((operation) => operation.effects))]
            .map((effect) => effect.split('/').pop())
            .join(', '),
        ),
      );
    const base = 'https://github.com/mailschema/mailschema';
    const path = 'specifications/map-0.3/contracts';
    const url = `${base}/new/main/${path}?filename=${encodeURIComponent(filename(input))}&value=${encodeURIComponent(JSON.stringify(input, null, 2) + '\n')}`;
    const prefill = url.length <= 7000;
    submit.href = prefill ? url : `${base}/upload/main/${path}`;
    submitLabel.textContent = prefill ? 'Continue in GitHub' : 'Upload in GitHub';
    submitNote.textContent = prefill
      ? 'GitHub will open with your checked contract. For an amendment, edit the existing file in your branch.'
      : 'Download the checked JSON, then upload it to your branch in GitHub. For an amendment, replace the existing file in that branch.';
    submit.removeAttribute('aria-disabled');
    submit.tabIndex = 0;
    download.disabled = false;
    preview.hidden = false;
    status.textContent = 'Contract checks passed. Ready for semantic review.';
  } catch (error) {
    showErrors(String(error).split('\n'));
  }
});
download.addEventListener('click', () => {
  if (!checked) return;
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(checked, null, 2) + '\n'], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename(checked);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
form.hidden = false;

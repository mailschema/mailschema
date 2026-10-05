import { parseContractText, type Contract } from '../specification/contracts';
import {
  parseImplementationText,
  type ImplementationRecord,
} from '../specification/implementations';
import { decodeMapUtf8 } from '../specification/strict-json.ts';

const form = document.querySelector<HTMLFormElement>('#contribution-form')!;
const editor = document.querySelector<HTMLTextAreaElement>('#contribution-json')!;
const kind = document.querySelector<HTMLSelectElement>('#contribution-kind')!;
const target = document.querySelector<HTMLSelectElement>('#contribution-target')!;
const targetField = document.querySelector<HTMLElement>('[data-service-target]')!;
const editorLabel = document.querySelector<HTMLElement>('[data-editor-label]')!;
const fileInput = document.querySelector<HTMLInputElement>('#contribution-file')!;
const download = document.querySelector<HTMLButtonElement>('[data-download]')!;
const submit = document.querySelector<HTMLAnchorElement>('[data-submit]')!;
const submitLabel = submit.querySelector<HTMLElement>('[data-submit-label]')!;
const submitNote = document.querySelector<HTMLElement>('[data-submit-note]')!;
const status = form.querySelector<HTMLElement>('[data-check-status]')!;
const errors = form.querySelector<HTMLElement>('.contribution-errors')!;
const preview = document.querySelector<HTMLElement>('[data-preview]')!;
let checked: Contract | ImplementationRecord | undefined;
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
function filename(value: Contract | ImplementationRecord) {
  // Filenames help review; the identifiers and exact contract digest remain authoritative.
  if ('service' in value) {
    const host = new URL(value.service).hostname.replace(/[^a-zA-Z0-9-]/g, '-');
    const slug = new URL(value.type.id).pathname.split('/').filter(Boolean).pop() || 'type';
    const binding = new URL(value.binding).pathname.split('/').filter(Boolean).pop() || 'binding';
    return `${host}-${slug}-${value.type.version}-${binding.replace(/[^a-zA-Z0-9-]/g, '-')}.json`;
  }
  const slug = new URL(value.id).pathname.split('/').filter(Boolean).pop() || 'new-type';
  return `${slug.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 80)}-${value.version}.json`;
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
kind.addEventListener('change', () => {
  reset();
  editor.value = '';
  targetField.hidden = kind.value !== 'implementation';
  editorLabel.textContent =
    kind.value === 'implementation' ? 'Service record JSON' : 'Contract JSON';
});
document
  .querySelector<HTMLButtonElement>('[data-service-starter]')!
  .addEventListener('click', () => {
    reset();
    const selected = target.selectedOptions[0];
    editor.value =
      JSON.stringify(
        {
          service: 'https://example.org',
          maintainer: { name: 'Service operator', url: 'https://example.org' },
          type: {
            id: selected.dataset.id,
            version: selected.dataset.version,
            contractDigest: selected.dataset.digest,
          },
          operations: (selected.dataset.operations || '').split(','),
          binding: 'https://example.org/docs/map-binding',
          status: 'Draft',
          documentation: 'https://example.org/docs/map',
          evidence: [
            {
              kind: 'declaration',
              url: 'https://example.org/docs/map',
              summary: 'Replace with the actual scope and source of this support claim.',
            },
          ],
        },
        null,
        2,
      ) + '\n';
    editor.focus();
  });
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
    kind.value = 'contract';
    targetField.hidden = true;
    editorLabel.textContent = 'Contract JSON';
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
      throw new Error('Use a file smaller than 256 KiB.');
    const input =
      kind.value === 'implementation'
        ? parseImplementationText(editor.value)
        : parseContractText(editor.value);
    if ('service' in input) {
      const match = [...target.options].some(
        (option) =>
          option.dataset.id === input.type.id &&
          option.dataset.version === input.type.version &&
          option.dataset.digest === input.type.contractDigest &&
          input.operations.every((operation) =>
            (option.dataset.operations || '').split(',').includes(operation),
          ),
      );
      if (!match) throw new Error('Select an exact Registry contract and its listed operations.');
    }
    checked = input;
    preview.querySelector('[data-preview-title]')!.textContent =
      'service' in input ? input.maintainer.name : input.name;
    preview.querySelector('[data-preview-summary]')!.textContent =
      'service' in input ? input.evidence.map((item) => item.summary).join(' ') : input.summary;
    preview
      .querySelector('[data-preview-facts]')!
      .replaceChildren(
        ...('service' in input
          ? [
              fact('Service', input.service),
              fact('Contract', `${input.type.id} · ${input.type.version}`),
              fact('Operations', input.operations.join(', ')),
              fact('Evidence', input.evidence.map((item) => item.kind).join(', ')),
            ]
          : [
              fact('Identifier', input.id),
              fact('Version', input.version),
              fact('Operations', input.operations.map((operation) => operation.name).join(', ')),
              fact(
                'Effects',
                [...new Set(input.operations.flatMap((operation) => operation.effects))]
                  .map((effect) => effect.split('/').pop())
                  .join(', '),
              ),
            ]),
      );
    const base = 'https://github.com/mailschema/mailschema';
    const path = `specifications/map-0.3/${'service' in input ? 'implementations' : 'contracts'}`;
    const url = `${base}/new/main/${path}?filename=${encodeURIComponent(filename(input))}&value=${encodeURIComponent(JSON.stringify(input, null, 2) + '\n')}`;
    const prefill = url.length <= 7000;
    submit.href = prefill ? url : `${base}/upload/main/${path}`;
    submitLabel.textContent = prefill ? 'Continue in GitHub' : 'Upload in GitHub';
    submitNote.textContent = prefill
      ? 'GitHub will open with the checked JSON. Add companion files in the same pull request.'
      : 'Download the checked JSON, then upload it to your branch in GitHub.';
    submit.removeAttribute('aria-disabled');
    submit.tabIndex = 0;
    download.disabled = false;
    preview.hidden = false;
    status.textContent = 'Structure checks passed. Ready for review.';
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

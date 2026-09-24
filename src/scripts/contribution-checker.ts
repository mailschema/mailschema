import { assertContribution, referenceErrors, type CatalogView } from '../registry/validation';
import type { Contribution } from '../registry/model';

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
let checked: Contribution | undefined;
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

function githubSubmission(input: Contribution) {
  const filename = `${input.id}.json`;
  const value = JSON.stringify(input, null, 2) + '\n';
  const prefilledUrl = `https://github.com/mailschema/mailschema/new/main/registry/contributions?filename=${encodeURIComponent(filename)}&value=${encodeURIComponent(value)}`;
  return prefilledUrl.length <= 7000
    ? {
        url: prefilledUrl,
        label: 'Continue in GitHub',
        note: 'The checked JSON will be prefilled in GitHub.',
      }
    : {
        url: 'https://github.com/mailschema/mailschema/upload/main/registry/contributions',
        label: 'Upload in GitHub',
        note: 'This contribution is too large to prefill. Download the checked JSON, then upload it in GitHub.',
      };
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
  const text = await file.text();
  if (generation === ticket) {
    editor.value = text;
    editor.focus();
  }
});
document.querySelectorAll<HTMLAnchorElement>('[data-example]').forEach((link) => {
  link.addEventListener('click', async (event) => {
    event.preventDefault();
    reset();
    const ticket = generation;
    try {
      const response = await fetch(link.href);
      if (!response.ok) throw new Error('Example unavailable. Try downloading the file again.');
      const text = await response.text();
      if (generation === ticket) {
        editor.value = text;
        editor.focus();
      }
    } catch (error) {
      if (generation === ticket) showErrors([String(error)]);
    }
  });
});
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  reset();
  const ticket = generation;
  try {
    if (new TextEncoder().encode(editor.value).length > maxBytes)
      throw new Error('Use a contribution smaller than 256 KiB.');
    let input: unknown;
    try {
      input = JSON.parse(editor.value);
    } catch {
      throw new Error('The file is not valid JSON. Check its quotes, commas and brackets.');
    }
    assertContribution(input);
    status.textContent = 'Checking Registry references…';
    const response = await fetch('/registry/catalog.json');
    if (!response.ok)
      throw new Error('Could not load the Registry. Try again before submitting this file.');
    const catalog = (await response.json()) as CatalogView & { contributions: { id: string }[] };
    if (generation !== ticket) return;
    const problems = referenceErrors(input, catalog);
    if (catalog.contributions.some((item) => item.id === input.id))
      problems.push('This contribution identifier is already in the Registry.');
    if (problems.length) return showErrors(problems);
    checked = input;
    preview.querySelector('[data-preview-title]')!.textContent =
      input.kind === 'implementation' ? input.product.name : input.record.name;
    preview.querySelector('[data-preview-summary]')!.textContent =
      input.kind === 'implementation' ? input.summary : input.record.summary;
    const facts = [
      fact(
        'Contribution',
        input.kind === 'new-type'
          ? 'New type'
          : input.kind === 'amendment'
            ? 'Amendment'
            : 'Implementation declaration',
      ),
      fact('Contributed by', input.contributor.name),
    ];
    if (input.kind === 'implementation')
      facts.push(
        fact('Type and version', `${input.type} · ${input.typeVersion}`),
        fact('Execution profile', input.profile),
        fact(
          'Evidence',
          input.evidence.kind === 'declaration' ? 'Support declaration' : 'Submitted test report',
        ),
        fact('Operations', input.operations.join(', ')),
      );
    else
      facts.push(
        fact('Maintained by', input.record.maintainers.map((party) => party.name).join(', ')),
        fact(
          'Proposed status',
          `${input.record.status}${input.record.version ? ` · ${input.record.version}` : ''}`,
        ),
        fact('Operations', input.record.operations.map((operation) => operation.name).join(', ')),
        fact('Example', input.record.example.title),
      );
    preview.querySelector('[data-preview-facts]')!.replaceChildren(...facts);
    preview.hidden = false;
    download.disabled = false;
    const submission = githubSubmission(input);
    submit.href = submission.url;
    submitLabel.textContent = submission.label;
    submitNote.textContent = submission.note;
    submit.removeAttribute('aria-disabled');
    submit.tabIndex = 0;
    status.textContent = 'File checks passed.';
  } catch (error) {
    if (generation === ticket)
      showErrors((error instanceof Error ? error.message : String(error)).split('\n'));
  }
});
download.addEventListener('click', () => {
  if (!checked) return;
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(checked, null, 2) + '\n'], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `${checked.id}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
form.hidden = false;

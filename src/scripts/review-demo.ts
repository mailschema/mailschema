import { reviewCopy } from '../data/review';

type Status = 'waiting' | 'feedback' | 'approved';
for (const root of document.querySelectorAll<HTMLElement>('[data-review-demo]')) {
  const get = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const request = get<HTMLButtonElement>('[data-request]');
  const approve = get<HTMLButtonElement>('[data-approve]');
  const revise = get<HTMLButtonElement>('[data-revise]');
  const form = get<HTMLFormElement>('[data-feedback-form]');
  const actions = get<HTMLElement>('[data-main-actions]');
  const role = get<HTMLSelectElement>('[data-role]');
  let revision = 3;
  let status: Status = 'waiting';
  // Approval decides the revision; feedback is repeatable, so it stays available.
  let decided = false;
  function result(text: string) {
    get('[data-result]').textContent = text;
  }
  function showPermissionHint() {
    get('[data-action-footnote]').textContent =
      status === 'feedback'
        ? decided
          ? 'The approval of this revision stands. You can send more feedback, or switch to the editor to create the next revision using a predetermined edit.'
          : 'You can send more feedback or approve this revision, or switch to the editor to create the next revision using a predetermined edit.'
        : role.value === 'editor'
          ? 'Switch to the reviewer to record a review decision.'
          : 'Approval applies to this revision. Sending is a separate action.';
  }
  role.addEventListener('change', showPermissionHint);
  function render() {
    root.querySelectorAll('[data-revision]').forEach((el) => {
      el.textContent = String(revision);
    });
    get('[data-quote]').textContent =
      `“${revision === 3 ? reviewCopy.original : reviewCopy.revised}”`;
    const details: Record<Status, string[]> = {
      waiting: [
        '↗',
        'Awaiting a decision',
        `Revision ${revision} is ready for review.`,
        'You can request changes or approve this revision. The service checks your permission when you submit the request.',
      ],
      feedback: [
        '↻',
        'Changes requested',
        'Feedback recorded.',
        `The feedback applies to revision ${revision}.${decided ? ' Its approval stands.' : ''} The content has not changed yet. An editor can now prepare the next revision.`,
      ],
      approved: [
        '✓',
        'Decision recorded',
        `Revision ${revision} approved.`,
        `The service has recorded approval of revision ${revision}. Sending the campaign requires separate permission.`,
      ],
    };
    ['symbol', 'label', 'title', 'description'].forEach((key, i) => {
      get(`[data-state-${key}]`).textContent = details[status][i];
    });
    root.dataset.status = status;
    revise.hidden = status !== 'feedback';
    get('[data-next-revision]').textContent = String(revision + 1);
    // Feedback is repeatable, so both operations stay available after it.
    actions.hidden = false;
    approve.disabled = decided;
    form.hidden = true;
    showPermissionHint();
  }
  function permitted(operation: 'review' | 'edit' = 'review') {
    const requiredRole = operation === 'edit' ? 'editor' : 'reviewer';
    if (role.value !== requiredRole) {
      result(
        operation === 'edit'
          ? 'You don’t have permission to edit this draft. No edit was made.'
          : 'You don’t have permission to review this draft. No decision was recorded.',
      );
      return false;
    }
    return true;
  }
  request.addEventListener('click', () => {
    if (!permitted()) return;
    form.hidden = false;
    actions.hidden = true;
    get<HTMLTextAreaElement>('#review-feedback').focus();
  });
  get('[data-cancel]').addEventListener('click', () => {
    form.hidden = true;
    actions.hidden = false;
    request.focus();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!permitted()) return;
    const feedback = get<HTMLTextAreaElement>('#review-feedback');
    if (!feedback.value.trim()) {
      feedback.setCustomValidity('Enter feedback for this revision.');
      feedback.reportValidity();
      return;
    }
    status = 'feedback';
    render();
    result(`Recorded feedback for revision ${revision}. The draft has not been edited.`);
    revise.focus();
  });
  get<HTMLTextAreaElement>('#review-feedback').addEventListener('input', (event) =>
    (event.target as HTMLTextAreaElement).setCustomValidity(''),
  );
  revise.addEventListener('click', () => {
    if (!permitted('edit')) return;
    revision += 1;
    status = 'waiting';
    decided = false;
    render();
    result(`Revision ${revision} created in this example. It needs its own approval.`);
    approve.focus();
  });
  approve.addEventListener('click', () => {
    if (!permitted()) return;
    status = 'approved';
    decided = true;
    render();
    result(
      `Recorded approval of revision ${revision}. Sending the campaign requires separate permission.`,
    );
    get<HTMLButtonElement>('[data-reset]').focus();
  });
  get<HTMLButtonElement>('[data-stale]').addEventListener('click', () => {
    if (!permitted()) return;
    result(
      `This request refers to revision ${revision - 1}. The current draft is revision ${revision}, so no decision was recorded.`,
    );
  });
  get<HTMLButtonElement>('[data-reset]').addEventListener('click', () => {
    revision = 3;
    status = 'waiting';
    decided = false;
    role.value = 'reviewer';
    form.reset();
    get<HTMLTextAreaElement>('#review-feedback').setCustomValidity('');
    render();
    result('Example reset. No request made yet.');
    request.focus();
  });
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-tab]')];
  function activate(tab: HTMLButtonElement) {
    tabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    root.querySelectorAll<HTMLElement>('[data-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.panel !== tab.dataset.tab;
    });
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next =
        event.key === 'Home'
          ? tabs[0]
          : event.key === 'End'
            ? tabs[tabs.length - 1]
            : tabs[(i + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      activate(next);
      next.focus();
    });
  });
  root.querySelectorAll<HTMLButtonElement>('button[disabled]').forEach((button) => {
    button.disabled = false;
  });
  role.disabled = false;
  get('[data-demo-fallback]').hidden = true;
  render();
}

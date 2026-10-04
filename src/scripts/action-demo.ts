import { approve, type Proposal } from '../examples/approval';

for (const root of document.querySelectorAll<HTMLElement>('[data-action-demo]')) {
  const get = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const read = get<HTMLButtonElement>('[data-read]');
  const confirmation = get<HTMLDivElement>('[data-confirmation]');
  const scenario = get<HTMLSelectElement>('[data-scenario]');
  const version = root.dataset.version!;
  let proposal: Proposal;
  function text(selector: string, value: string) {
    get(selector).textContent = value;
  }
  function reset() {
    proposal = { version, authorized: true, expired: false, decision: 'open', queued: 0 };
    read.disabled = false;
    read.hidden = false;
    confirmation.hidden = true;
    scenario.disabled = false;
    get<HTMLButtonElement>('[data-reset]').disabled = false;
    text('[data-stage]', 'Email received');
    text('[data-title]', 'The email is a starting point.');
    text(
      '[data-explanation]',
      'The connector checks the current proposal, recipient, tenant and permission with the service before offering a decision.',
    );
    text('[data-result]', 'No request made. No send queued.');
  }
  read.addEventListener('click', () => {
    read.hidden = true;
    confirmation.hidden = false;
    text('[data-stage]', 'Service readback');
    text('[data-title]', 'Confirm the exact proposal.');
    text(
      '[data-explanation]',
      'The host presents the service’s terms for your confirmation. The service must still check them atomically when recording the decision.',
    );
    text('[data-result]', 'Proposal read through the installed connector. No send queued.');
  });
  get('[data-confirm]').addEventListener('click', () => {
    if (confirmation.hidden) return;
    // Simulate a change between authoritative readback and the service's atomic decision.
    if (scenario.value === 'stale') proposal.version = 'changed-audience-snapshot';
    if (scenario.value === 'revoked') proposal.authorized = false;
    if (scenario.value === 'decided') proposal.decision = 'declined';
    if (scenario.value === 'expired') proposal.expired = true;
    const result = approve(proposal, version, true);
    const explanations = {
      accepted: [
        'Decision accepted.',
        'One send is queued with the accepted content, audience and delivery terms. Acceptance does not prove delivery is complete.',
      ],
      stale: [
        'The terms changed.',
        'The service rejects the decision. The connector must read the new proposal and obtain a new confirmation.',
      ],
      unauthorized: [
        'Permission was revoked.',
        'Earlier readback and human confirmation do not override the service’s current authorization check.',
      ],
      'already-decided': [
        'The proposal is closed.',
        'Another decision won the race. This approval cannot queue a send.',
      ],
      expired: [
        'The proposal expired.',
        'The service checks expiry at the decision boundary and refuses this approval.',
      ],
      'confirmation-required': [
        'Confirmation required.',
        'The host must obtain a person’s confirmation before proceeding.',
      ],
    };
    const [title, explanation] = explanations[result];
    confirmation.hidden = true;
    scenario.disabled = true;
    text('[data-stage]', 'Atomic service decision');
    text('[data-title]', title);
    text('[data-explanation]', explanation);
    text(
      '[data-result]',
      `${result} · ${proposal.queued} ${proposal.queued === 1 ? 'send' : 'sends'} queued.`,
    );
  });
  get('[data-cancel]').addEventListener('click', () => {
    reset();
    text('[data-result]', 'Confirmation cancelled. No send queued.');
  });
  get('[data-reset]').addEventListener('click', reset);
  reset();
}

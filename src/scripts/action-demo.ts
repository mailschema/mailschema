import { decide, type Proposal } from '../examples/approval';

for (const root of document.querySelectorAll<HTMLElement>('[data-action-demo]')) {
  const get = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const read = get<HTMLButtonElement>('[data-read]');
  const scenario = get<HTMLSelectElement>('[data-scenario]');
  const confirmation = get('[data-confirmation]');
  const outcome = get('[data-outcome]');
  const originalVersion = root.dataset.version!;
  const originalAudience = Number(root.dataset.audience);
  const format = (value: number) => value.toLocaleString('en');
  let proposal: Proposal & { audience: number };
  let reviewedVersion: string;
  let reviewedAudience: number;
  let phase: 'email' | 'reading' | 'ready' | 'result';
  let generation = 0;

  function text(selector: string, value: string) {
    get(selector).textContent = value;
  }
  function step(name: string, state: 'done' | 'waiting' | 'active' | 'refused') {
    const item = get(`[data-step="${name}"]`);
    item.dataset.state = state;
    item.querySelector('.activity-marker')!.textContent =
      state === 'done' ? '✓' : state === 'refused' ? '!' : name === 'review' ? '2' : '3';
  }
  function reset(selected = 'current') {
    generation++;
    phase = 'email';
    root.dataset.state = phase;
    root.removeAttribute('aria-busy');
    proposal = {
      version: originalVersion,
      audience: originalAudience,
      authorized: true,
      expired: false,
      decision: 'open',
      queued: 0,
    };
    reviewedVersion = originalVersion;
    reviewedAudience = originalAudience;
    read.disabled = false;
    text('[data-read-label]', 'Review request');
    get('[data-start]').hidden = false;
    confirmation.hidden = true;
    outcome.hidden = true;
    delete outcome.dataset.resolution;
    get('[data-change]').hidden = true;
    get('[data-review-again]').hidden = true;
    scenario.disabled = false;
    scenario.value = selected;
    get<HTMLButtonElement>('[data-reset]').disabled = false;
    step('review', 'waiting');
    step('decision', 'waiting');
    text('[data-review-activity]', 'Ready to check with the service.');
    text('[data-decision-activity]', 'Waiting for your choice.');
    text('[data-result]', 'Nothing has been approved or queued.');
    text(
      '[data-local-call]',
      'Review the request, then choose an action to inspect the local call.',
    );
  }

  async function review() {
    if (phase === 'reading' || phase === 'ready') return;
    const run = generation;
    phase = 'reading';
    root.dataset.state = phase;
    root.setAttribute('aria-busy', 'true');
    read.disabled = true;
    scenario.disabled = true;
    text('[data-read-label]', 'Checking proposal…');
    step('review', 'active');
    text('[data-review-activity]', 'Reading through the connected account.');
    // Let the pending state paint. This illustration performs no network request.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    if (run !== generation) return;
    if (outcome.dataset.resolution === 'stale') scenario.value = 'current';
    reviewedVersion = proposal.version;
    reviewedAudience = proposal.audience;
    text('[data-reviewed-audience]', format(reviewedAudience));
    phase = 'ready';
    root.dataset.state = phase;
    root.removeAttribute('aria-busy');
    get('[data-start]').hidden = true;
    outcome.hidden = true;
    confirmation.hidden = false;
    scenario.disabled = false;
    get('[data-change]').hidden = true;
    step('review', 'done');
    step('decision', 'waiting');
    text(
      '[data-review-activity]',
      `Content, sender and ${format(reviewedAudience)} subscribers read from the service.`,
    );
    text('[data-decision-activity]', 'Waiting for your approval or decline.');
    text('[data-result]', 'Current proposal reviewed. Nothing queued.');
    get('[data-review-heading]').focus({ preventScroll: true });
  }

  function submit(choice: 'approve' | 'decline') {
    if (phase !== 'ready') return;
    phase = 'result';
    // Model a change after readback, before the service records this exact decision.
    if (scenario.value === 'stale') {
      proposal.version = `${proposal.version}:audience-changed`;
      proposal.audience += 120;
    }
    if (scenario.value === 'revoked') proposal.authorized = false;
    if (scenario.value === 'decided') proposal.decision = 'declined';
    if (scenario.value === 'expired') proposal.expired = true;
    const current = { ...proposal };
    const result = decide(proposal, reviewedVersion, choice, true);
    const responses = {
      accepted: {
        title: 'Approved. Send queued.',
        body: `The service recorded your approval for this email to ${format(reviewedAudience)} subscribers. Delivery is still pending.`,
        activity: 'Permission and terms checked. One send queued.',
        result: 'Approval recorded · 1 send queued',
      },
      declined: {
        title: 'Declined. Nothing queued.',
        body: 'The service recorded your decline and closed this proposal.',
        activity: 'Permission and terms checked. Proposal declined.',
        result: 'Decline recorded · No send queued',
      },
      stale: {
        title: 'The audience changed.',
        body: `You reviewed ${format(reviewedAudience)} subscribers. The service now has ${format(proposal.audience)}. Review the updated request before deciding.`,
        activity: 'The reviewed terms no longer match. Decision refused.',
        result: 'Terms changed · No send queued',
      },
      unauthorized: {
        title: 'Sending permission was revoked.',
        body: 'Your account can no longer authorize this send. The service refused the decision.',
        activity: 'Current account permission refused the decision.',
        result: 'Permission revoked · No send queued',
      },
      'already-decided': {
        title: 'Someone already declined.',
        body: 'The proposal is closed. Your decision cannot queue another action.',
        activity: 'An earlier decision closed the proposal.',
        result: 'Already decided · No send queued',
      },
      expired: {
        title: 'This request expired.',
        body: 'The service refused the decision because the proposal is no longer available.',
        activity: 'The proposal expired before the decision.',
        result: 'Request expired · No send queued',
      },
      'confirmation-required': {
        title: 'Your confirmation is required.',
        body: 'Review the current proposal before choosing an action.',
        activity: 'No confirmed decision was supplied.',
        result: 'Confirmation required · No send queued',
      },
    };
    const response = responses[result];
    const recorded = result === 'accepted' || result === 'declined';
    root.dataset.state = result;
    outcome.dataset.resolution = result;
    confirmation.hidden = true;
    outcome.hidden = false;
    scenario.disabled = true;
    text('[data-outcome-mark]', recorded ? '✓' : '!');
    text('[data-outcome-title]', response.title);
    text('[data-outcome-body]', response.body);
    text('[data-decision-activity]', response.activity);
    text('[data-result]', response.result);
    step('decision', recorded ? 'done' : 'refused');
    get('[data-review-again]').hidden = result !== 'stale';
    get('[data-change]').hidden = !recorded;
    text(
      '[data-local-call]',
      `const proposal = ${JSON.stringify(current, null, 2)};\n\ndecide(proposal, ${JSON.stringify(reviewedVersion)}, '${choice}', true);\n// ${result}\n// ${proposal.queued} sends queued`,
    );
    get('[data-outcome-title]').focus();
  }

  read.addEventListener('click', review);
  get('[data-confirm]').addEventListener('click', () => submit('approve'));
  get('[data-decline]').addEventListener('click', () => submit('decline'));
  get('[data-review-again]').addEventListener('click', review);
  get('[data-change]').addEventListener('click', () => {
    reset('stale');
    void review();
  });
  for (const button of [get('[data-back]'), get('[data-reset]')]) {
    button.addEventListener('click', () => {
      reset();
      read.focus();
    });
  }
  reset();
  root.dataset.ready = '';
}

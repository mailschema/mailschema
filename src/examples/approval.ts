// A local teaching model of one service decision. It is not a MAP implementation.
export interface Proposal {
  version: string;
  authorized: boolean;
  expired: boolean;
  decision: 'open' | 'accepted' | 'declined';
  queued: number;
}
export function decide(
  proposal: Proposal,
  expected: string,
  choice: 'approve' | 'decline',
  confirmed: boolean,
) {
  if (!confirmed) return 'confirmation-required';
  if (!proposal.authorized) return 'unauthorized';
  if (proposal.expired) return 'expired';
  if (proposal.version !== expected) return 'stale';
  if (proposal.decision !== 'open') return 'already-decided';
  proposal.decision = choice === 'approve' ? 'accepted' : 'declined';
  if (choice === 'approve') proposal.queued++;
  return proposal.decision;
}

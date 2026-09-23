export const typeStages = [
  { status: 'Draft', singular: 'draft', plural: 'drafts' },
  { status: 'Proposal', singular: 'proposal', plural: 'proposals' },
  { status: 'Reuse assessment', singular: 'reuse assessment', plural: 'reuse assessments' },
] as const;

export interface Party {
  name: string;
  url?: string;
}
export interface TypeDefinition {
  slug: string;
  name: string;
  summary: string;
  category: string;
  status: (typeof typeStages)[number]['status'];
  version: string | null;
  profile: string;
  overview: string;
  target: string;
  operations: { name: string; description: string }[];
  inputs: string;
  results: string;
  permissions: string;
  humanRoute: string;
  example: { title: string; steps: string[]; exception: string };
  references: { title: string; href: string; description: string }[];
  openQuestions: string[];
  maintainers: Party[];
  definition?: { label: string; href: string };
}
export interface TypeRecord extends TypeDefinition {
  origin: string;
  contributors: Party[];
  history: { label: string; description: string; contributionId?: string }[];
}
interface Submission {
  format: 'mailschema-contribution/1';
  id: string;
  contributor: Party;
  source?: string;
  summary: string;
}
export type Contribution = Submission &
  (
    | { kind: 'new-type'; record: TypeDefinition }
    | { kind: 'amendment'; baseDigest: string; record: TypeDefinition }
    | {
        kind: 'implementation';
        type: string;
        typeVersion: string;
        typeDigest: string;
        profile: string;
        product: Party;
        operations: string[];
        evidence: {
          kind: 'declaration' | 'test-report';
          url?: string;
          reproduction?: string;
          results?: string;
        };
      }
  );
export type Implementation = Extract<Contribution, { kind: 'implementation' }>;

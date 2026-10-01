/** The documents MAP 0.2 defines and the type contracts that give them meaning. */

export type JsonObject = Record<string, unknown>;
export type Authority = 'credential' | 'possession';
export type ResultState = 'accepted' | 'completed' | 'failed' | 'pending' | 'approval-required';
export type Consequence =
  'refusal' | 'protection' | 'record' | 'disclosure' | 'commitment' | 'authorization' | 'assertion';

export interface SchemaReference {
  url: string;
  canonicalDigest: string;
}

export interface ContractOperation {
  id: string;
  effect: string;
  authority: Authority[];
  consequences: Consequence[];
  repeatable?: boolean;
  fieldBindings?: { input: string; fields: string }[];
  results: { state: ResultState; reasons?: string[]; outputSchema: JsonObject }[];
}

export interface TypeContract {
  kind: 'MapTypeContract';
  id: string;
  version: string;
  profile: string;
  target: string;
  dependencies?: SchemaReference[];
  detailsSchema?: JsonObject;
  requestSchema: SchemaReference;
  operations: ContractOperation[];
}

/** The exact type a description and its requests name. */
export type TypeReference = { id: string; version: string; contractDigest: string };
export type Target = { id: string; revision: string; digest: string; title?: string };

export type MapDescription = {
  '@context': string;
  '@type': 'MailAction';
  '@id': string;
  profile: string;
  type: TypeReference;
  describedAt: string;
  expiresAt: string;
  service: {
    id: string;
    name: string;
    authority: Authority;
    resource?: string;
    execution: { url: string; resultUrlTemplate: string; resultRetentionSeconds: number };
    onBehalfOf?: { id: string; name: string };
    humanUrl: string;
  };
  recipient?: string;
  target: Target;
  details?: JsonObject;
  operations: { id: string; name: string; description: string }[];
};

export type MapRequest = {
  kind: 'MapRequest';
  profile: string;
  requestId: string;
  interactionId: string;
  descriptionDigest: string;
  type: TypeReference;
  operation: string;
  input: JsonObject;
};

export type MapResult = {
  kind: 'MapResult';
  profile: string;
  requestId: string;
  interactionId: string;
  descriptionDigest: string;
  type: TypeReference;
  operation: string;
  state: ResultState;
  target: Target;
  recordedAt: string;
  resultUrl: string;
  actor?: string;
  approvalUrl?: string;
  reason?: string;
  output: JsonObject;
};

/** An RFC 9457 problem, with MAP's correlation members when it is correlated. */
export type MapProblem = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  profile?: string;
  requestId?: string;
  interactionId?: string;
  code?: string;
  target?: Target;
  errors?: InputError[];
};

/** One way a request's input fails its contract, with a JSON Pointer into the input. */
export type InputError = { detail: string; pointer: string };

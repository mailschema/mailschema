// Mail Action Protocol 0.2 processing. It parses, canonicalizes, digests and validates MAP
// documents, checks the type contracts an implementation vendors, and builds results and
// problems. It does not establish endpoint trust, verify email authentication, grant
// authority or send email.
export {
  MAP_PROFILE,
  CORE_SCHEMA,
  FORMS_SCHEMA,
  CONTRACT_FORMAT,
  CONTEXT,
  mapErrors,
  descriptionErrors,
  requestErrors,
  resultErrors,
  problemErrors,
  isRequestId,
  reached,
} from './artifacts.ts';
export { InvalidDocument, parse, canonicalize, digest } from './document.ts';
export { APPROVAL_REASONS, Contract, InvalidContract, type RequestProblem } from './contract.ts';
export {
  PROBLEM_STATUS,
  type ProblemCode,
  result,
  transition,
  problem,
  resultStatus,
  retainUntil,
  settle,
} from './documents.ts';
export {
  DESCRIPTION_MEDIA_TYPE,
  isDescriptionPart,
  capability,
  writtenPath,
  isJsonRequest,
  resultUrl,
} from './binding.ts';
export type {
  Authority,
  Consequence,
  ContractOperation,
  InputError,
  JsonObject,
  MapDescription,
  MapProblem,
  MapRequest,
  MapResult,
  ResultState,
  SchemaReference,
  Target,
  TypeContract,
  TypeReference,
} from './types.ts';

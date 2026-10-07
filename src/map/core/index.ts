// Mail Action Protocol 0.3 processing: one implementation, run unchanged by the repository's
// site and checks and shipped as the npm package.
export {
  PROFILE,
  CONTEXT,
  DESCRIPTION_MEDIA_TYPE,
  DESCRIPTION_MAX_BYTES,
  CONTRACT_MAX_BYTES,
  EFFECTS,
  FORMATS,
  coreSchema,
  contractSchema,
  implementationSchema,
} from './artifacts.ts';
export { InvalidDocument, MAX_DEPTH, decodeUtf8, parse, canonicalize, digest } from './json.ts';
export { sha256 } from './sha256.ts';
export { descriptionErrors, parseDescription, type Description } from './description.ts';
export {
  CAPABILITY_KINDS,
  Contract,
  contractErrors,
  type CapabilityKind,
  type ContractDocument,
  type Operation,
} from './contract.ts';
export {
  implementationErrors,
  parseImplementation,
  type ImplementationRecord,
} from './implementation.ts';
export { unportablePattern } from './patterns.ts';

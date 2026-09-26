// Builds MAP 0.2 documents from the example data. Shared by the fixture
// generator and the conformance suite so both read exactly the same bytes.
import { MAP_PROFILE, descriptionDigest, mapArtifacts } from '../../src/map/reference.ts';
import {
  credentialContext,
  describedAt,
  digestOf,
  examples,
  expiresAt,
  retention,
  uuid,
} from './examples.mjs';

export { examples };

export const example = (slug) => {
  const found = examples.find((candidate) => candidate.slug === slug);
  if (!found) throw new Error(`No example for ${slug}`);
  return found;
};

export function service(entry) {
  const base = `https://${entry.host}`;
  const execution =
    entry.authority === 'possession'
      ? {
          url: `${base}/map/c/${entry.capability}`,
          resultUrlTemplate: `${base}/map/c/${entry.capability}/results/{requestId}`,
          resultRetentionSeconds: retention,
        }
      : {
          url: `${base}/map/actions`,
          resultUrlTemplate: `${base}/map/results/{requestId}`,
          resultRetentionSeconds: retention,
        };
  return {
    id: `${base}/service`,
    name: entry.name,
    authority: entry.authority,
    ...(entry.onBehalfOf ? { onBehalfOf: entry.onBehalfOf } : {}),
    ...(entry.authority === 'credential' ? { resource: `${base}/` } : {}),
    execution,
    humanUrl: `${base}${entry.humanPath}`,
  };
}

/** The exact contract reference for an example's type. */
export function typeReference(entry) {
  const contract = mapArtifacts().contractFor(entry.slug, entry.version);
  if (!contract) throw new Error(`No contract for ${entry.slug}@${entry.version}`);
  return {
    id: contract.contract.id,
    version: contract.contract.version,
    contractDigest: contract.contractDigest,
  };
}

/** A fresh description for an example; callers may change it freely. */
export function describe(entry) {
  const { representation, ...target } = entry.target;
  return structuredClone({
    '@context': 'https://mailschema.org/contexts/map-0.2.jsonld',
    '@type': 'MailAction',
    '@id': entry.interaction,
    profile: MAP_PROFILE,
    type: typeReference(entry),
    describedAt,
    expiresAt,
    service: service(entry),
    ...(entry.authority === 'possession' ? { recipient: entry.recipient } : {}),
    target: { ...target, digest: digestOf(entry.calendar ?? representation) },
    ...(entry.details ? { details: entry.details } : {}),
    operations: entry.operations,
  });
}

/** Deterministic request identifiers: one block of 100 per example. */
export const requestId = (entry, n = 1) => uuid(1000 + examples.indexOf(entry) * 100 + n);

// Each offered operation has its own identifiers, ten apart, as a real client never
// reuses one for another request.
export function request(
  entry,
  operation,
  {
    description = describe(entry),
    input = entry.inputs[operation],
    n = 1 +
      10 *
        Math.max(
          0,
          description.operations.findIndex((offered) => offered.id === operation),
        ),
  } = {},
) {
  return structuredClone({
    kind: 'MapRequest',
    profile: MAP_PROFILE,
    requestId: requestId(entry, n),
    interactionId: description['@id'],
    descriptionDigest: descriptionDigest(description),
    type: description.type,
    operation,
    input,
  });
}

/** The server-established context for an example: credential principal, or the issued capability. */
export const contextOf = (entry) =>
  entry.authority === 'possession' ? { capability: entry.capability } : credentialContext;

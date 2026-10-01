// The HTTP and Structured Email bindings: capability URLs, the requests the execution URL
// admits, where results live and which message part carries a description.
import { MAP_PROFILE } from './artifacts.ts';
import type { MapDescription } from './types.ts';

/** The Content-Type of the part that carries a description, labelled with the profile. */
export const DESCRIPTION_MEDIA_TYPE = `application/ld+json; profile="${MAP_PROFILE}"`;

/**
 * Whether a designated part carries a description of this profile: its media type is
 * application/ld+json, compared case-insensitively, and its profile parameter lists the
 * profile among its space-separated URIs.
 */
export const isDescriptionPart = (mediaType: string, profileParameter: string | undefined) =>
  mediaType.toLowerCase() === 'application/ld+json' &&
  (profileParameter ?? '').split(/[ \t]+/).includes(MAP_PROFILE);

/** The path of an absolute URL exactly as written, with no dot segments removed and nothing decoded. */
export const writtenPath = (url: string) =>
  /^[A-Za-z][A-Za-z0-9+.-]*:\/\/[^/?#]*([^?#]*)/.exec(url)?.[1] ?? '';

/** The possession capability: the last segment of the execution URL path, as written. */
export const capability = (description: MapDescription) =>
  writtenPath(description.service.execution.url).split('/').at(-1) ?? '';

const UNGUESSABLE = /^[A-Za-z0-9_-]{22,}$/;
const dotSegment = (url: string) =>
  writtenPath(url)
    .split('/')
    .some((segment) => /^(?:\.|%2e){1,2}$/i.test(segment));

/** The rules a possession description's capability URLs meet when it is issued. */
export function capabilityProblems(description: MapDescription) {
  const { url, resultUrlTemplate } = description.service.execution;
  const issued = capability(description);
  const problems: string[] = [];
  if (!UNGUESSABLE.test(issued)) problems.push('The capability is too short to be unguessable.');
  if ([url, resultUrlTemplate].some(dotSegment))
    problems.push('A capability URL must not contain dot segments.');
  if (!resultUrlTemplate.startsWith(`${url}/`))
    problems.push('The result template must extend the execution URL and its capability.');
  if (description.service.humanUrl.includes(issued))
    problems.push('The human route must not carry the capability.');
  return problems;
}

/**
 * Whether a Content-Type admits a request rather than a 415: the media type
 * application/json, compared case-insensitively, with no parameter other than a UTF-8
 * charset. Only HTTP's optional whitespace, spaces and tabs, may surround each part, and
 * empty parameter slots are ignored, as RFC 9110 permits.
 */
export function isJsonRequest(contentType: string | undefined) {
  const [type, ...parameters] = (contentType ?? '')
    .split(';')
    .map((part) => part.replace(/^[ \t]+|[ \t]+$/g, '').toLowerCase());
  return (
    type === 'application/json' &&
    parameters.every(
      (parameter) => parameter === '' || /^charset=(?:utf-8|"utf-8")$/.test(parameter),
    )
  );
}

/** The result resource of a request: the description's template with the identifier encoded. */
export const resultUrl = (description: MapDescription, requestId: string) =>
  description.service.execution.resultUrlTemplate.replace('{requestId}', () =>
    encodeURIComponent(requestId),
  );

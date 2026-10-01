// MAP documents within the core limits, with lengths counted in code points as JSON
// Schema counts them.
import { MAX_BYTES } from './document.ts';
import { codePoints, within } from './pointer.ts';
import type { InputError, JsonObject } from './types.ts';

const TITLE = 240;
const DETAIL = 4000;
const POINTER = 1000;
const ERROR_DETAIL = 2000;
const ERRORS = 100;

/** The text, or its first limit - 1 code points and an ellipsis. */
export const cut = (text: string, limit: number) =>
  codePoints(text) > limit ? `${[...text].slice(0, limit - 1).join('')}…` : text;

/**
 * An input error within the core problem's limits. A pointer too long to report names its
 * nearest ancestor that fits, with a detail that says so, and a detail too long is cut.
 */
export function inputError(detail: string, pointer: string): InputError {
  if (codePoints(pointer) > POINTER)
    return {
      detail: 'A member within this value does not satisfy the contract.',
      pointer: within(pointer, POINTER),
    };
  return { detail: cut(detail, ERROR_DETAIL), pointer };
}

/**
 * A problem's title, detail and input errors within the core limits. An empty or overlong
 * title, an empty detail or an empty error list is the caller's mistake.
 */
export function problemMembers(title: string, detail: string, errors?: InputError[]) {
  if (codePoints(title) < 1 || codePoints(title) > TITLE)
    throw new RangeError(`A problem title is 1 to ${TITLE} characters.`);
  if (!detail) throw new RangeError('A problem detail is not empty.');
  if (errors) {
    if (!errors.length) throw new RangeError('Errors, when given, name at least one input error.');
    if (errors.some((error) => !error.detail)) throw new RangeError('An input error has a detail.');
  }
  return {
    title,
    detail: cut(detail, DETAIL),
    errors: errors?.slice(0, ERRORS).map((error) => inputError(error.detail, error.pointer)),
  };
}

/** The problem with as many of its errors, in order, as fit within the document limit. */
export function withinDocument(problem: JsonObject): JsonObject {
  const errors = problem.errors as InputError[] | undefined;
  if (!errors) return problem;
  const kept = [...errors];
  const size = () => new TextEncoder().encode(JSON.stringify({ ...problem, errors: kept })).length;
  while (kept.length > 1 && size() > MAX_BYTES) kept.pop();
  return { ...problem, errors: kept };
}

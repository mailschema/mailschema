// The regular expressions a contract's schemas may use: the subset that ECMA-262 (with the
// u flag) and other engines read alike, so every implementation enforces the same contract.

const SYNTAX_CHARACTERS = '^$\\.*+?()[]{}|/';
const CONTROL_ESCAPES: Record<string, number> = { t: 0x09, n: 0x0a, f: 0x0c, r: 0x0d };
const QUANTIFIERS = '*+?{';

/**
 * Why a pattern is outside the portable subset, or undefined. The subset is printable ASCII
 * text, with any other code point written as \uXXXX. It has literal characters and escaped
 * syntax characters; \t, \n, \f, \r and \d, the ASCII digits; non-empty classes of literal or
 * escaped members and ranges, with a literal hyphen only first or last; (?: groups;
 * alternation; ^ and $; and one *, +, ?, {n}, {n,} or {n,m} after an atom. Other class
 * escapes and the dot match different characters in different engines, and brackets, && or a
 * stray brace inside a class, or a quantifier on a quantifier, are read differently or refused
 * by one of them. ^ and $ anchor the whole value, as in ECMA-262; an engine whose anchors also
 * match at line breaks must read them so.
 */
export function unportablePattern(pattern: string): string | undefined {
  if (!/^[\x20-\x7e]*$/.test(pattern)) return 'a character outside printable ASCII';
  let at = 0;

  // One escaped code point, the digit class outside a class, or a problem.
  const escape = (inClass: boolean): number | string => {
    const next = pattern[at + 1];
    if (next === undefined) return 'a trailing backslash';
    if (next === 'u') {
      const digits = pattern.slice(at + 2, at + 6);
      if (!/^[0-9a-fA-F]{4}$/.test(digits)) return 'a malformed \\u escape';
      const code = parseInt(digits, 16);
      if (code >= 0xd800 && code <= 0xdfff) return 'a surrogate \\u escape';
      at += 6;
      return code;
    }
    at += 2;
    if (next === 'd' && !inClass) return -1;
    if (Object.hasOwn(CONTROL_ESCAPES, next)) return CONTROL_ESCAPES[next];
    if (SYNTAX_CHARACTERS.includes(next) || (inClass && next === '-')) return next.charCodeAt(0);
    return `the escape \\${next}`;
  };

  const characterClass = (): string | undefined => {
    at += pattern[at + 1] === '^' ? 2 : 1;
    // Each member's code point, or null for an unescaped hyphen.
    const members: (number | null)[] = [];
    while (pattern[at] !== ']') {
      const char = pattern[at];
      if (char === undefined) return 'an unclosed character class';
      if (char === '[') return 'a bracket inside a class';
      if (char === '&' && pattern[at + 1] === '&') return '&& inside a class';
      if (char === '\\') {
        const code = escape(true);
        if (typeof code === 'string') return code;
        members.push(code);
      } else {
        members.push(char === '-' ? null : char.charCodeAt(0));
        at += 1;
      }
    }
    at += 1;
    if (!members.length) return 'an empty character class';
    for (let index = 0; index < members.length; index += 1) {
      const low = members[index];
      if (low === null) {
        if (index !== 0 && index !== members.length - 1) return 'an ambiguous hyphen in a class';
        continue;
      }
      if (members[index + 1] !== null || index + 2 >= members.length) continue;
      const high = members[index + 2];
      if (high === null) return 'an ambiguous hyphen in a class';
      if (high < low) return 'a class range out of order';
      index += 2;
      if (members[index + 1] === null && index + 1 !== members.length - 1)
        return 'an ambiguous hyphen in a class';
    }
  };

  const quantifier = (): string | undefined => {
    if (pattern[at] === '{') {
      const bounds = /^\{([0-9]{1,4})(?:(,)([0-9]{1,4})?)?\}/.exec(pattern.slice(at));
      if (!bounds) return 'a malformed {n,m} quantifier';
      if (bounds[3] !== undefined && Number(bounds[3]) < Number(bounds[1]))
        return 'a {n,m} quantifier with m below n';
      at += bounds[0].length;
    } else at += 1;
    const next = pattern[at];
    if (next !== undefined && QUANTIFIERS.includes(next)) return 'a quantifier on a quantifier';
  };

  const disjunction = (depth: number): string | undefined => {
    let quantifiable = false;
    while (at < pattern.length) {
      const char = pattern[at];
      if (char === '|') {
        at += 1;
        quantifiable = false;
      } else if (char === ')') {
        if (depth === 0) return 'an unmatched )';
        return;
      } else if (char === '^' || char === '$') {
        at += 1;
        quantifiable = false;
      } else if (QUANTIFIERS.includes(char)) {
        if (!quantifiable)
          return char === '{' ? 'an unescaped {' : 'a quantifier with nothing to repeat';
        const problem = quantifier();
        if (problem) return problem;
        quantifiable = false;
      } else if (char === '(') {
        if (!pattern.startsWith('(?:', at)) return 'a group other than (?:';
        at += 3;
        const problem = disjunction(depth + 1);
        if (problem) return problem;
        if (pattern[at] !== ')') return 'an unclosed group';
        at += 1;
        quantifiable = true;
      } else if (char === '[') {
        const problem = characterClass();
        if (problem) return problem;
        quantifiable = true;
      } else if (char === '\\') {
        const code = escape(false);
        if (typeof code === 'string') return code;
        quantifiable = true;
      } else if (char === '.') return 'an unescaped dot';
      else if (char === ']' || char === '}') return `an unescaped ${char}`;
      else {
        at += 1;
        quantifiable = true;
      }
    }
  };

  return disjunction(0);
}

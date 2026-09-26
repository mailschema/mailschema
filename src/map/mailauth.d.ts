// The header parser mailauth's DKIM verifier uses. mailauth does not declare this module.
declare module 'mailauth/lib/tools.js' {
  export function parseHeaders(headers: Buffer): {
    parsed: { key: string | null; casedKey?: string; line: Buffer }[];
    original: Buffer;
  };
}

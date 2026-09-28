---
title: Type contracts
description: How a type is defined, reviewed and published, and the rules every contract meets.
navTitle: Type contracts
---

A type contract defines what an interaction means: its target, details and operations, with each operation's authority, consequences, inputs and results. Its canonical digest is what descriptions and requests name, so a contract never changes once published. The [MAP 0.2 profile](/specification/profile#type-contracts) lists a contract's members and how clients obtain one.

## Adding a type

A type is proposed to the [Registry](/registry) as a pull request. The pull request carries the Registry record, the contract and its request schema, and any new shared block. Review covers the interaction's scope, its overlap with existing standards and the exact contract bytes. The Registry compiles the contract against these rules and refuses it if any is broken.

Once merged, the contract is published at its address and listed in the [Registry catalogue](/registry/catalog.json) with its canonical digest and its request schema's. Clients that resolve contracts from the catalogue can act on the type without a release, and services implement it when they choose. A changed type is a new version with a new digest; the earlier version stays published.

## Contract rules

- Each operation declares exactly one success state, `accepted` or `completed`.
- Only `failed` carries reasons, and always at least one.
- An operation that declares `approval-required` never permits possession, and only such an operation uses the reserved reasons `declined`, `stale-target` and `expired`. A decision among them also declares `superseded`, and only such a decision uses it.
- An operation that declares `pending` declares how it fails.
- `refusal` and `protection` stand alone among an operation's consequences.
- Each field binding names a form fields block in the details and a field values input.
- The request schema extends the core request, binds the type identifier and version, and has one branch for each operation of the contract and no other.
- Details member names are ASCII identifiers: a letter, then at most 63 letters, digits or underscores.
- Every schema the contract refers to is pinned by canonical digest, and the core schema always is.
- Shared blocks, such as [form fields](/schemas/forms-0.1.schema.json), are never edited in place; a changed block is a new file.

## Strict compilation

The Registry compiles every schema strictly, so validators in any language reach the same verdict:

- Every keyword belongs to a JSON Schema 2020-12 vocabulary. Earlier or vendor keywords, such as `additionalItems`, `dependencies`, `definitions` and `nullable`, are refused. The one annotation beyond them, `autocomplete`, belongs to the form fields block and never to a contract's own schemas.
- `type` names one type, never a list.
- A keyword that constrains one JSON type has that `type` declared in the same schema, or in an enclosing one that applies to the same value through `allOf`, `anyOf`, `oneOf`, `not`, `if`, `then`, `else` or `dependentSchemas`. The `type` of a referenced schema does not count.
- No keyword is left without effect: `if` has `then` or `else`, `then` and `else` have `if`, and `minContains` and `maxContains` have `contains`.
- `prefixItems` with n schemas sets `minItems` to n, and `items` to `false` or `maxItems` to n.
- Every `$ref` is a pinned URL with an empty fragment or a plain JSON Pointer to a schema, never a relative reference, an anchor or a dynamic reference. No schema declares `$anchor`, `$dynamicAnchor`, a nested `$id` or a nested `$schema`, and the request schema declares JSON Schema 2020-12.
- Every `multipleOf` is an integer, since validators round fractional divisors differently.

## Portable patterns

Every pattern in a MAP schema is printable ASCII in a subset that ECMA-262 with the `u` flag and other regular expression engines read alike, with any other code point written as `\uXXXX`.

- **Escapes:** an escaped syntax character, `\t`, `\n`, `\f`, `\r`, `\uXXXX` outside the surrogates, and within a class `\-`. No class escape such as `\s`, `\d` or `\w`.
- **Atoms:** literal and escaped characters, non-empty character classes with a hyphen only in a range or at either end, and `(?:` groups. No unescaped dot, and no bracket or `&&` inside a class.
- **Operators:** alternation, `^` and `$`, and one `*`, `+`, `?`, `{n}`, `{n,}` or `{n,m}` after an atom, with bounds of at most four digits and `n` no greater than `m`. No quantifier on a quantifier.

`^` and `$` anchor the whole value, as the [profile](/specification/profile#email-representation) requires of every validator. The [shared lexical vectors](/fixtures/map-0.2/lexical-vectors.json) pin each core form.

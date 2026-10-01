# MAP 0.3 conformance material

This is a drafting bundle, not an executable runtime conformance suite. It makes the intended assertions reviewable before product adapters are written. It does not relabel MAP 0.2 evidence as 0.3 evidence.

- `shape-vectors.json` contains executable valid and invalid mutations of the four generated examples. `npm run spec:check` runs them against the draft Core shape and concrete details schemas. Paths are JSON Pointers; `replace` sets a member, including an unknown member used in a negative case, and `remove` removes it. These checks establish shape only.
- `scenarios.json` contains runtime skeletons with stable IDs, role labels, source-section links, preconditions, actions, and expected observations. Every entry is explicitly `unimplemented`. The draft check verifies the structure and requirement links; it does not execute the scenario or report it as passed.

Each runtime adapter must supply synthetic messages, receiver evidence, service state, recorded network requests, and an observable effect ledger as applicable. Use independent barriers around read and commit for race cases. A negative decision case must show zero committed effects, not just a returned error. A timeout case must distinguish client observation from actual service state.

Before claiming runtime coverage, split parameterized skeletons into individual boundary cases and record the exact implementation revision, contract digest, setup, observations, and verdict. Keep producer facts that a receiver cannot observe, such as exclusive envelope delivery, separate from consumer checks. Bind adapter evidence to these IDs without copying the specification into another authority.

Coverage includes MIME nesting, lexical limits, signature coverage, receiving gateways, forwarding, catalogue resolution, tenant isolation, service readback, policy, atomic races, asynchronous snapshots, native HTTP revisions, lost responses, capability scope and leakage, safe human navigation, and review-to-publication migration. This is a starting coverage map, not a claim that every normative requirement is already covered.

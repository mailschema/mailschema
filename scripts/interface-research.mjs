// The readable research report is a projection of the evidence catalogue.
export function interfaceLandscape(catalogue) {
  const roles = {
    'Service APIs': 'Native read and decision operations.',
    'Agent protocols': 'Tool calls, typed requests, delegation and native tasks.',
    Messaging: 'Command delivery, correlated replies and updates.',
    'Streams and federation':
      'Channels or application protocols that may carry service interactions.',
    'Descriptions and discovery': 'Existing descriptions and vocabulary to reuse.',
    'Email and human interfaces':
      'Proposal delivery, mailbox access and existing interaction surfaces.',
    'Identity and authorization': 'Existing account access, identity and request authentication.',
    'Existing workflows': 'Established domain protocols to reuse.',
  };
  const groups = [...new Set(catalogue.entries.map((entry) => entry.group))];
  return [
    '| Area | Interfaces examined | Relationship to MAP |',
    '| --- | --- | --- |',
    ...groups.map(
      (group) =>
        `| ${group} | ${catalogue.entries
          .filter((entry) => entry.group === group)
          .map((entry) => entry.name)
          .join(', ')} | ${roles[group] ?? 'Service-specific integration.'} |`,
    ),
  ].join('\n');
}

export function interfaceResearch(catalogue) {
  const links = (ids) => ids.map((id) => `[${id}](${catalogue.sources[id].url})`).join(' · ');
  const groups = [...new Set(catalogue.entries.map((entry) => entry.group))];
  const lines = [
    '# MAP interface research',
    '',
    '<!-- Generated from map-interfaces.json by npm run spec:generate. -->',
    '',
    catalogue.scope,
    '',
    catalogue.method,
    '',
    `${catalogue.entries.length} entries across ${groups.length} groups; ${Object.keys(catalogue.sources).length} primary-source documents. Source retrieval URLs, times and byte hashes are recorded in [the evidence catalogue](map-interfaces.json).`,
    '',
    '## Architecture decision',
    '',
    catalogue.decision,
    '',
    'The earlier draft x-map extension and companion schema have been removed. Native OpenAPI examples remain; they define no MAP mapping language. Service bindings is now an informative implementation chapter, excluded from the generated Internet-Draft. Core explicitly accommodates correlated asynchronous reads and preserves the original principal through delegated decisions.',
    '',
    ...catalogue.conclusions.flatMap((item) => [
      `### ${item.title}`,
      '',
      item.assessment,
      '',
      `Sources: ${links(item.sources)}.`,
      '',
    ]),
    '## Reuse comparison',
    '',
    '| Existing work | Already supplies | MAP association still needed | Assessment |',
    '| --- | --- | --- | --- |',
    ...catalogue.reuseComparison.map(
      (item) =>
        `| ${item.name} (${links(item.sources)}) | ${item.existing} | ${item.remaining} | ${item.decision} |`,
    ),
    '',
    '## Evaluation questions',
    '',
    ...catalogue.questions.map((question) => `- ${question}`),
    '',
  ];
  for (const group of groups) {
    lines.push(`## ${group}`, '');
    for (const entry of catalogue.entries.filter((entry) => entry.group === group)) {
      lines.push(
        `### ${entry.name}`,
        '',
        `${entry.status}. **${entry.disposition}.**`,
        '',
        `**Existing capability.** ${entry.provides}`,
        '',
        `**Possible MAP use.** ${entry.mapping}`,
        '',
        `**Unresolved requirement.** ${entry.gap}`,
        '',
        `Primary sources: ${links(entry.sources)}.`,
        '',
      );
    }
  }
  lines.push(
    '## Open implementation questions',
    '',
    ...catalogue.openQuestions.map((question) => `- ${question}`),
    '',
  );
  return lines.join('\n');
}

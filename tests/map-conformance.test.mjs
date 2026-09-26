import test from 'node:test';
import { conformanceCases } from '../conformance/map-0.2/cases.mjs';

for (const entry of conformanceCases) test(`${entry.id}: ${entry.title}`, entry.run);

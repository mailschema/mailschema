import test from 'node:test';
import { conformanceCases } from '../conformance/map-0.1/cases.mjs';

for (const entry of conformanceCases) test(`${entry.id}: ${entry.title}`, entry.run);

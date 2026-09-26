import { defineConfig } from 'vitest/config';

// Registry, release-evidence and worker logic; the MAP conformance suite runs under node:test.
export default defineConfig({ test: { include: ['tests/*.test.ts'] } });

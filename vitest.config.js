import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/backend/**/*.test.js'],
    reporters: ['default', ['junit', { outputFile: 'test-reports/backend-junit.xml' }]],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage/backend',
      include: ['api/recommendation-engine.js', 'api/middleware.js'],
      thresholds: { lines: 90, functions: 90, statements: 90, branches: 85 },
    },
  },
});

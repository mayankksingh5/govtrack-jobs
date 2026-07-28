import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.test.{js,jsx}'],
    reporters: ['default', ['junit', { outputFile: '../test-reports/public-junit.xml' }]],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: '../coverage/public',
      include: [
        'src/components/JobCard.jsx',
        'src/components/Pagination.jsx',
        'src/auth/ProtectedRoute.jsx',
        'src/utils.js',
      ],
      thresholds: { lines: 90, functions: 90, statements: 90, branches: 80 },
    },
  },
});

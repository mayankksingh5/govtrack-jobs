import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.test.{js,jsx}'],
    reporters: ['default', ['junit', { outputFile: '../test-reports/admin-junit.xml' }]],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: '../coverage/admin',
      include: ['src/auth/ProtectedAdmin.jsx', 'src/components/UI.jsx', 'src/utils.js'],
      thresholds: { lines: 90, functions: 90, statements: 90, branches: 80 },
    },
  },
});

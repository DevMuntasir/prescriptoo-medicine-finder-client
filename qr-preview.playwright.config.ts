import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://127.0.0.1:3107', headless: true },
  workers: 1,
  webServer: {
    command: 'node node_modules/next/dist/bin/next start -p 3107 -H 127.0.0.1',
    url: 'http://127.0.0.1:3107',
    timeout: 60000,
  },
});

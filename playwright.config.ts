import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(__dirname, '.output/chrome-mv3');

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    // Launch Chromium with the extension loaded.
    // Extensions require a persistent context (not incognito).
    headless: false,
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'chrome-extension',
      use: {
        launchOptions: {
          args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
            '--no-first-run',
            '--no-default-browser-check',
          ],
        },
      },
    },
  ],
});

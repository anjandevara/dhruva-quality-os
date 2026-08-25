import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Resolve environment profile safely
const targetEnvironment = process.env.ENV || 'qa';
const envFilePath = path.resolve(__dirname, `config/.env.${targetEnvironment}`);

if (fs.existsSync(envFilePath)) {
  dotenv.config({ path: envFilePath });
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,

  // Dual-mode reporting configuration
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['allure-playwright', { outputFolder: 'allure-results' }]
  ],

  use: {
    baseURL: process.env.BASE_URL || 'https://demo.playwright.dev',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    // Project 1: Sequential Chained Workflows (Strictly 1 worker)
    {
      name: 'chained-suites',
      testMatch: /.*chained\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      workers: 1,
    },

    // Project 2: Independent Parallel Test Suites (2 to 3 workers max)
    {
      name: 'independent-suites',
      testIgnore: /.*chained\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      workers: process.env.CI ? 2 : 3,
    },
  ],
});

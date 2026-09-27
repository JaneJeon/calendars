import { defineConfig, devices } from '@playwright/test'

const localBaseURL = 'http://127.0.0.1:4173'
const deployedBaseURL = process.env.DEPLOYED_FRONTEND_URL

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: deployedBaseURL ?? localBaseURL,
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      grepInvert: /@touch-critical/,
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'webkit',
      grep: /@webkit-critical/,
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'webkit-touch',
      grep: /@touch-critical/,
      use: {
        ...devices['iPhone 13 Mini'],
        viewport: { width: 320, height: 1000 }
      }
    }
  ],
  webServer: deployedBaseURL
    ? undefined
    : {
        command: 'npm run dev -- --host 127.0.0.1 --port 4173',
        url: localBaseURL,
        reuseExistingServer: !process.env.CI
      }
})

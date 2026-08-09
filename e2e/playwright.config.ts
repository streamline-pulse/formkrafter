import { defineConfig, devices } from '@playwright/test'

const PORT = 4179
const VUE_PORT = 4180

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Two apps are exercised: the React/TanStack showcase (baseURL) and the Vue
  // example, which is the only runtime coverage the Vue wrappers get.
  webServer: [
    {
      command: `bun run preview -- --port ${PORT} --strictPort`,
      cwd: '../examples/tanstack-start',
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `bun run preview -- --port ${VUE_PORT} --strictPort`,
      cwd: '../examples/vue',
      url: `http://localhost:${VUE_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})

export { VUE_PORT }

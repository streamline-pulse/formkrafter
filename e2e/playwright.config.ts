import { defineConfig, devices } from '@playwright/test'

const PORT = 4179
const VUE_PORT = 4180
const HTML_PORT = 4181
const FIXTURES_PORT = 4182

// Overridden when the browser runs elsewhere than the servers — e.g. the
// Linux snapshot container reaching the host via host.docker.internal.
const HOST = process.env.E2E_HOST ?? 'localhost'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    trace: 'on-first-retry',
  },
  expect: {
    // Screenshot baselines are committed per-platform (darwin for local
    // work, linux for CI); the tolerance absorbs antialiasing noise only.
    toHaveScreenshot: {
      maxDiffPixels: 100,
      animations: 'disabled',
      caret: 'hide',
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Two apps are exercised: the React/TanStack showcase (baseURL) and the Vue
  // example, which is the only runtime coverage the Vue wrappers get.
  webServer: [
    {
      command: `bun run preview -- --port ${PORT} --strictPort`,
      cwd: '../examples/tanstack-start',
      url: `http://${HOST}:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `bun run preview -- --port ${VUE_PORT} --strictPort`,
      cwd: '../examples/vue',
      url: `http://${HOST}:${VUE_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `bun serve.mjs`,
      cwd: '../examples/html',
      env: { PORT: String(HTML_PORT) },
      url: `http://${HOST}:${HTML_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `bun serve-fixtures.mjs`,
      env: { PORT: String(FIXTURES_PORT) },
      url: `http://${HOST}:${FIXTURES_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})

export { VUE_PORT, HTML_PORT, FIXTURES_PORT }

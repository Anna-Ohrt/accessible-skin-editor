import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
// Set BASE_URL to test a deployed copy, like the GitHub Pages site, instead of a local build.
const external = process.env.BASE_URL

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: external ?? `http://127.0.0.1:${PORT}/`,
  },
  projects: [
    {
      name: 'chromium',
      // Locally this uses the installed Microsoft Edge. CI installs Playwright's Chromium, and its
      // machines have no graphics card, so WebGL for the 3D model has to run in software there.
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env.CI ? undefined : 'msedge',
        launchOptions: process.env.CI ? { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] } : {},
      },
    },
  ],
  webServer: external
    ? undefined
    : {
        command: `npm run build && npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
        url: `http://127.0.0.1:${PORT}/`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})

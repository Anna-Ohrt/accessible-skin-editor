import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative paths, so the built page also works from a plain folder.
  base: './',
  server: { port: 5180, strictPort: true },
  test: {
    environment: 'jsdom',
    // Browser tests in e2e/ run with Playwright, not here.
    include: ['tests/**/*.test.{js,jsx}'],
    setupFiles: ['./tests/setup.js'],
    testTimeout: 15000,
  },
})

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// React and the other packages bundled into the site are MIT licensed, and the MIT license says its
// notice "shall be included in all copies or substantial portions of the Software". The minifier
// drops license comments, so this writes the license of every package in the bundle to
// third-party-notices.txt, next to the site.
function thirdPartyNotices() {
  return {
    name: 'third-party-notices',
    apply: 'build',
    generateBundle(_options, bundle) {
      const roots = new Set()
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue
        for (const id of output.moduleIds ?? Object.keys(output.modules ?? {})) {
          const match = /^(.*\/node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(id.replaceAll('\\', '/'))
          if (match) roots.add(match[1])
        }
      }
      if (roots.size === 0) throw new Error('Found no packages in the bundle, so the notices would be empty.')
      const sections = [...roots].sort().map((root) => {
        const meta = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
        const file = readdirSync(root).find((name) => /^licen[cs]e/i.test(name))
        if (!file) throw new Error(`No license file in ${root}`)
        const repository = typeof meta.repository === 'string' ? meta.repository : (meta.repository?.url ?? '')
        return [
          `${meta.name} ${meta.version} (${meta.license})`,
          repository.replace(/^git\+/, '').replace(/\.git$/, ''),
          '',
          readFileSync(join(root, file), 'utf8').trim(),
        ].join('\n')
      })
      const intro = 'Third-party notices\n\nThis site includes the open source software below, each with its license.'
      this.emitFile({
        type: 'asset',
        fileName: 'third-party-notices.txt',
        source: `${intro}\n\n${sections.join(`\n\n${'='.repeat(72)}\n\n`)}\n`,
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), thirdPartyNotices()],
  // Relative paths, so the built page also works from a plain folder.
  base: './',
  // three.js, for the 3D model, is most of the bundle: about 790 KB, or 215 KB compressed.
  build: { chunkSizeWarningLimit: 1000 },
  server: { port: 5180, strictPort: true },
  test: {
    environment: 'jsdom',
    // Browser tests in e2e/ run with Playwright, not here.
    include: ['tests/**/*.test.{js,jsx}'],
    setupFiles: ['./tests/setup.js'],
    testTimeout: 15000,
  },
})

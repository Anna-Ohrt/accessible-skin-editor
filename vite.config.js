import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Every package bundled into the site asks for its license to travel with copies of it. MIT says
// its notice "shall be included in all copies or substantial portions of the Software", and Apache
// 2.0 asks for "a readable copy of the attribution notices" in a package's NOTICE file too. The
// minifier drops license comments, so this writes the license of every package in the bundle, and
// its NOTICE file if it has one, to third-party-notices.txt, next to the site.
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
      // Some packages publish their files with Windows line endings. The notices use one kind.
      const text = (path) => readFileSync(path, 'utf8').replace(/\r\n?/g, '\n').trim()
      const sections = [...roots].sort().map((root) => {
        const meta = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
        const files = readdirSync(root)
        const license = files.find((name) => /^licen[cs]e/i.test(name))
        const notice = files.find((name) => /^notice/i.test(name))
        if (!license) throw new Error(`No license file in ${root}`)
        const repository = typeof meta.repository === 'string' ? meta.repository : (meta.repository?.url ?? '')
        return [
          `${meta.name} ${meta.version} (${meta.license})`,
          repository.replace(/^git\+/, '').replace(/\.git$/, ''),
          '',
          text(join(root, license)),
          ...(notice ? ['', `NOTICE file from ${meta.name}:`, '', text(join(root, notice))] : []),
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

// A Content Security Policy for the built site, as a <meta> tag, since GitHub Pages can't send
// headers. Scripts may come only from the site itself, so an injected <script> or event handler
// can't run, and Trusted Types stop code from turning text into HTML or script. Inline styles are
// allowed so people's own tools still work, like the WCAG text spacing bookmarklet, which adds its
// CSS to the page's <head> as an element; the CSP spec says policies "SHOULD NOT interfere with the
// operation of user-agent features like addons, extensions, or bookmarklets". It's left out of the
// dev server, which needs inline scripts for hot reloading. scripts/inline-build.mjs swaps 'self'
// for a hash in the one-file copy, whose script is inline.
export const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
  "require-trusted-types-for 'script'",
  "trusted-types 'none'",
].join('; ')

function contentSecurityPolicy() {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml(html) {
      // It has to come before any script or style in the page to cover them.
      const charset = '<meta charset="UTF-8" />'
      if (!html.includes(charset)) throw new Error('index.html has no charset tag to put the policy after.')
      return html.replace(charset, `${charset}\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`)
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), thirdPartyNotices(), contentSecurityPolicy()],
  // Relative paths, so the built page also works from a plain folder.
  base: './',
  build: {
    // Babylon.js, for the 3D model, is in its own file of about 740 KB, which loads only when the
    // model is shown. The one-file copy has everything in one script.
    chunkSizeWarningLimit: mode === 'single' ? 1500 : 800,
    // The one-file copy (npm run build:single) needs all the code in one script. It builds into
    // its own folder, so it never replaces the site in dist.
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    rolldownOptions: mode === 'single' ? { output: { codeSplitting: false } } : {},
  },
  server: { port: 5180, strictPort: true },
  test: {
    environment: 'jsdom',
    // Browser tests in e2e/ run with Playwright, not here.
    include: ['tests/**/*.test.{js,jsx}'],
    setupFiles: ['./tests/setup.js'],
    testTimeout: 15000,
  },
}))

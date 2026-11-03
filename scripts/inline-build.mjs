// Turns the Vite build into skin-editor.html, which opens with a double-click: module scripts can't load from
// file:// URLs, but inline ones run. Run it with npm run build:single.
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist-single')
const assets = readdirSync(join(dist, 'assets'))
const js = assets.filter((name) => name.endsWith('.js'))
const css = assets.filter((name) => name.endsWith('.css'))
if (js.length !== 1 || css.length !== 1) {
  throw new Error(`Expected one JS and one CSS file, found ${assets.join(', ')}. Build with --mode single.`)
}

let html = readFileSync(join(dist, 'index.html'), 'utf8')
const script = `\n${readFileSync(join(dist, 'assets', js[0]), 'utf8').replace(/<\/script/gi, '<\\/script')}\n`
const style = readFileSync(join(dist, 'assets', css[0]), 'utf8')

const scriptTag = /<script type="module" crossorigin src="[^"]+"><\/script>/
const styleTag = /<link rel="stylesheet" crossorigin href="[^"]+">/
if (!scriptTag.test(html) || !styleTag.test(html)) throw new Error('The built index.html has an unexpected shape.')
html = html.replace(styleTag, () => `<style>\n${style}\n</style>`)
html = html.replace(scriptTag, () => `<script type="module">${script}</script>`)

// The script is inline now, so the Content Security Policy allows it by its hash instead of by
// where it comes from. Any other inline script, injected or not, still can't run.
const hash = createHash('sha256').update(script, 'utf8').digest('base64')
const policy = "script-src 'self'"
if (!html.includes(policy)) throw new Error('The built index.html has no Content Security Policy to update.')
html = html.replace(policy, `script-src 'sha256-${hash}'`)

// This one file carries React's code, so it carries React's license too, as a comment at the top.
const notices = readFileSync(join(dist, 'third-party-notices.txt'), 'utf8').replaceAll('-->', '-- >')
html = html.replace(/^<!doctype html>/i, (doctype) => `${doctype}\n<!--\n${notices}-->`)
if (!html.includes('Permission is hereby granted'))
  throw new Error('The third-party notices did not make it into the file.')

const out = join(root, 'skin-editor.html')
writeFileSync(out, html)
console.log(`Wrote ${out} (${Math.round(html.length / 1024)} KB)`)

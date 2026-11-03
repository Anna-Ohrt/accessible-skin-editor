// Turns the Vite build into one HTML file that opens with a double-click, with no server.
// Module scripts can't load from file:// URLs, but inline ones run fine.
// usage: npm run build:single  (writes skin-editor.html next to package.json)
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const assets = readdirSync(join(dist, 'assets'))
const js = assets.filter((name) => name.endsWith('.js'))
const css = assets.filter((name) => name.endsWith('.css'))
if (js.length !== 1 || css.length !== 1) throw new Error(`Expected one JS and one CSS file, found ${assets.join(', ')}`)

let html = readFileSync(join(dist, 'index.html'), 'utf8')
const script = readFileSync(join(dist, 'assets', js[0]), 'utf8').replace(/<\/script/gi, '<\\/script')
const style = readFileSync(join(dist, 'assets', css[0]), 'utf8')

const scriptTag = /<script type="module" crossorigin src="[^"]+"><\/script>/
const styleTag = /<link rel="stylesheet" crossorigin href="[^"]+">/
if (!scriptTag.test(html) || !styleTag.test(html)) throw new Error('The built index.html has an unexpected shape.')
html = html.replace(styleTag, () => `<style>\n${style}\n</style>`)
html = html.replace(scriptTag, () => `<script type="module">\n${script}\n</script>`)

const out = join(root, 'skin-editor.html')
writeFileSync(out, html)
console.log(`Wrote ${out} (${Math.round(html.length / 1024)} KB)`)

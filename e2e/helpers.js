import { test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// WCAG 2.0, 2.1 and 2.2 at levels A and AA, plus axe-core's best practices.
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

export const grid = (page) => page.getByRole('grid')
export const cell = (page, row, col) => grid(page).locator(`[data-row="${row - 1}"][data-col="${col - 1}"]`)
export const status = (page) => page.getByRole('status')
// The 3D model's canvas, found by class so it works in every language.
export const modelCanvas = (page) => page.locator('canvas.model-3d')

export async function scan(page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  // "Incomplete" means axe couldn't decide and a person has to look, so they go in the report.
  for (const item of results.incomplete) {
    const where = item.nodes.map((node) => node.target.join(' ')).join(', ')
    test.info().annotations.push({ type: 'axe: needs a person to check', description: `${item.id}: ${where}` })
  }
  return results.violations.map((item) => `${item.id}: ${item.nodes.map((node) => node.target.join(' ')).join(', ')}`)
}

// Screenshots for a person to look at, only when SHOTS_DIR is set.
export async function shot(page, name) {
  if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/${name}.png`, fullPage: true })
}

export async function centerOf(locator) {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  return [box.x + box.width / 2, box.y + box.height / 2]
}

// The page's width, and anything sticking out past the right edge. The pixel grid may scroll
// inside its own box, so what's inside it doesn't count.
export function overflow(page) {
  return page.evaluate(() => {
    const edge = document.documentElement.clientWidth
    const stickingOut = [...document.querySelectorAll('body *')].filter((element) => {
      const box = element.getBoundingClientRect()
      return (box.right > edge + 0.5 || box.left < -0.5) && !element.parentElement.closest('.grid-wrap')
    })
    return {
      width: document.documentElement.scrollWidth,
      outside: stickingOut
        .slice(0, 5)
        .map((element) => element.tagName.toLowerCase() + (element.className ? `.${element.className}` : '')),
    }
  })
}

// The colors in a screenshot, as a Set of "r,g,b" strings. The page decodes the PNG itself, since
// the tests have no image library.
export async function colorsIn(page, png) {
  const colors = await page.evaluate(async (data) => {
    const image = new Image()
    image.src = `data:image/png;base64,${data}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')
    context.drawImage(image, 0, 0)
    const bytes = context.getImageData(0, 0, canvas.width, canvas.height).data
    const found = new Set()
    for (let i = 0; i < bytes.length; i += 4) found.add(`${bytes[i]},${bytes[i + 1]},${bytes[i + 2]}`)
    return [...found]
  }, png.toString('base64'))
  return new Set(colors)
}

// Records Content Security Policy violations, uncaught errors and console errors from the page.
export async function watchForProblems(page) {
  const problems = []
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.error(`CSP violation: ${event.violatedDirective} ${event.blockedURI}`)
    })
  })
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`)
  })
  return problems
}

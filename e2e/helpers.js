import { test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// WCAG 2.0, 2.1 and 2.2 at levels A and AA, axe-core's level AAA rules (such as 7:1 text contrast), plus
// its best practices.
const TAGS = ['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

export const grid = (page) => page.getByRole('grid')
export const cell = (page, row, col) => grid(page).locator(`[data-row="${row - 1}"][data-col="${col - 1}"]`)
export const status = (page) => page.getByRole('status')
// The 3D model's canvas, found by class so it works in every language.
export const modelCanvas = (page) => page.locator('canvas.model-3d')

// axe's violations. With includeReview, also what axe couldn't decide and left for a person to review.
export async function scan(page, { includeReview = false } = {}) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  // "Incomplete" means axe couldn't decide and a person has to look, so they go in the report.
  for (const item of results.incomplete) {
    const where = item.nodes.map((node) => node.target.join(' ')).join(', ')
    test.info().annotations.push({ type: 'axe: needs a person to check', description: `${item.id}: ${where}` })
  }
  const found = includeReview ? [...results.violations, ...results.incomplete] : results.violations
  return found.map((item) => `${item.id}: ${item.nodes.map((node) => node.target.join(' ')).join(', ')}`)
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

// Opens a file the way people do: the Open button at the top brings up the browser's file picker.
export async function openSkin(page, files) {
  const choosing = page.waitForEvent('filechooser')
  await page.getByRole('banner').getByRole('button', { name: 'Open a skin' }).click()
  await (await choosing).setFiles(files)
}

// Presses Tab or Shift+Tab until focus leaves the page, listing each stop. A keyboard trap (WCAG 2.1.2) shows
// as focus coming back to a stop before it gets out.
export async function tabWalk(page, key) {
  const stops = []
  for (let i = 0; i < 200; i += 1) {
    await page.keyboard.press(key)
    const stop = await page.evaluate(() => {
      const element = document.activeElement
      if (!element || element === document.body) return null
      window.stopIds ??= new WeakMap()
      if (!window.stopIds.has(element)) {
        window.stopCount = (window.stopCount ?? 0) + 1
        window.stopIds.set(element, window.stopCount)
      }
      const name = element.getAttribute('aria-label') ?? element.labels?.[0]?.textContent ?? element.textContent
      return `${window.stopIds.get(element)}: ${name.trim().replace(/\s+/g, ' ').slice(0, 40)}`
    })
    if (!stop) return { stops, left: true }
    if (stops.includes(stop)) return { stops, trappedAt: stop }
    stops.push(stop)
  }
  return { stops, trappedAt: 'more than 200 stops' }
}

// The page's width, and anything sticking out past its edge or out of its panel, which can happen without
// sideways scrolling. The pixel grid scrolls inside its own box, so what's inside it doesn't count.
export function overflow(page) {
  return page.evaluate(() => {
    const edge = document.documentElement.clientWidth
    const name = (element) => element.tagName.toLowerCase() + (element.className ? `.${element.className}` : '')
    const elements = [...document.querySelectorAll('body *')].filter(
      (element) => !element.parentElement.closest('.grid-wrap'),
    )
    const stickingOut = elements.filter((element) => {
      const box = element.getBoundingClientRect()
      return box.right > edge + 0.5 || box.left < -0.5
    })
    const outOfPanel = elements.filter((element) => {
      const panel = element.parentElement.closest('.panel')
      const box = element.getBoundingClientRect()
      if (!panel || (box.width === 0 && box.height === 0)) return false
      const outer = panel.getBoundingClientRect()
      return box.right > outer.right + 0.5 || box.left < outer.left - 0.5
    })
    return {
      width: document.documentElement.scrollWidth,
      outside: stickingOut.slice(0, 5).map(name),
      outOfPanel: outOfPanel.slice(0, 5).map(name),
    }
  })
}

// Pairs of panels, the header and the footer that cover each other, checked every half window down the page.
// Only the visible part of each counts, since a box with its own scrollbar clips what's in it.
export function overlappingPanels(page) {
  return page.evaluate(async () => {
    const visible = (element) => {
      let { left, top, right, bottom } = element.getBoundingClientRect()
      for (let parent = element.parentElement; parent !== document.body; parent = parent.parentElement) {
        const style = getComputedStyle(parent)
        if (style.overflowX === 'visible' && style.overflowY === 'visible') continue
        const clip = parent.getBoundingClientRect()
        left = Math.max(left, clip.left)
        top = Math.max(top, clip.top)
        right = Math.min(right, clip.right)
        bottom = Math.min(bottom, clip.bottom)
      }
      return { left, top, right, bottom }
    }
    const found = new Set()
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) {
      scrollTo(0, y)
      await new Promise(requestAnimationFrame)
      const boxes = [...document.querySelectorAll('.panel, .app-header, .app-footer')].map((element) => ({
        name: element.querySelector('h1, h2')?.textContent ?? 'the footer',
        box: visible(element),
      }))
      boxes.forEach((a, index) => {
        for (const b of boxes.slice(index + 1)) {
          const across = Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left)
          const down = Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top)
          if (across > 1 && down > 1) found.add(`${a.name} and ${b.name}`)
        }
      })
    }
    scrollTo(0, 0)
    return [...found]
  })
}

// Boxes with their own scrollbar that hide part of what's in them. The pixel grid may scroll sideways.
export function scrollBoxes(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('body *')]
      .filter((element) => {
        const style = getComputedStyle(element)
        const down = /auto|scroll/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1
        const across = /auto|scroll/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 1
        return down || (across && !element.matches('.grid-wrap'))
      })
      .map((element) => element.tagName.toLowerCase() + (element.className ? `.${element.className}` : '')),
  )
}

// Tabs through the page from the top, and names each stop that's partly off screen or covered by something
// else while it has focus (WCAG 2.4.11).
export async function hiddenTabStops(page) {
  const hidden = []
  for (let stop = 0; stop < 100; stop += 1) {
    await page.keyboard.press('Tab')
    const result = await page.evaluate(() => {
      const element = document.activeElement
      window.seenStops ??= new Set()
      if (element === document.body || window.seenStops.has(element)) return { done: true }
      window.seenStops.add(element)
      // A link that wraps has a box for each line.
      const inline = getComputedStyle(element).display === 'inline'
      const boxes = inline ? [...element.getClientRects()] : [element.getBoundingClientRect()]
      const { clientWidth, clientHeight } = document.documentElement
      const shown = boxes.every((box) => {
        const inset = Math.min(3, box.width / 4, box.height / 4)
        const points = [
          [(box.left + box.right) / 2, (box.top + box.bottom) / 2],
          [box.left + inset, box.top + inset],
          [box.right - inset, box.top + inset],
          [box.left + inset, box.bottom - inset],
          [box.right - inset, box.bottom - inset],
        ]
        return points.every(
          ([x, y]) =>
            x >= 0 &&
            y >= 0 &&
            x < clientWidth &&
            y < clientHeight &&
            element.contains(document.elementFromPoint(x, y)),
        )
      })
      const name = element.getAttribute('aria-label') || element.labels?.[0]?.textContent || element.textContent
      return { done: false, hidden: shown ? null : name.trim().slice(0, 40) }
    })
    if (result.done) break
    if (result.hidden) hidden.push(result.hidden)
  }
  return hidden
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

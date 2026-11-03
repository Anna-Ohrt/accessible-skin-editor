import { test, expect } from '@playwright/test'
import { cell, grid, modelCanvas, overflow, scan, shot } from './helpers.js'

// The pseudo-locales from src/i18n/pseudo.js stand in for real translations: en-XA makes every
// message longer and accented, and ar-XB lays the page out right to left.

// Text nodes and accessible names with plain English in them, which in en-XA means text that
// skipped the messages. Names and addresses aren't translated. "and" joins lists and comes from
// the browser's list formatting for the language (Intl.ListFormat), not from the messages.
function untranslated(page) {
  return page.evaluate(() => {
    const allowed = ['Anna Ohrt', 'github.com/Anna-Ohrt/accessible-skin-editor', 'skin.png', ' and ']
    const english = (text) => /[A-Za-z]{2,}/.test(allowed.reduce((rest, word) => rest.replaceAll(word, ' '), text))
    const found = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.parentElement.closest('noscript')) continue
      if (english(node.textContent)) found.push(node.textContent.trim())
    }
    for (const element of document.querySelectorAll('[aria-label]')) {
      const label = element.getAttribute('aria-label')
      if (english(label)) found.push(label)
    }
    if (english(document.title)) found.push(document.title)
    return found
  })
}

test.describe('en-XA, longer accented text', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./?lang=en-XA')
    await expect(grid(page)).toBeVisible()
    await expect(modelCanvas(page)).toBeVisible()
  })

  test('shows no text that skipped the messages, including the 3D model controls', async ({ page }) => {
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('en-XA')
    // Pointing at the model shows another message.
    await modelCanvas(page).hover()
    expect(await untranslated(page)).toEqual([])
    await shot(page, 'pseudo-en-XA')
  })

  test('passes axe and reflows at 320 CSS pixels with the longer text', async ({ page }) => {
    expect(await scan(page)).toEqual([])
    await page.setViewportSize({ width: 320, height: 640 })
    // Fonts differ between systems, so it's checked with the default font and with a wide one.
    for (const font of ['default', 'wide']) {
      if (font === 'wide') await page.addStyleTag({ content: "* { font-family: Verdana, 'DejaVu Sans', sans-serif !important; }" })
      const { width, outside } = await overflow(page)
      expect(width, `${font} font, sticking out: ${outside.join(', ')}`).toBeLessThanOrEqual(320)
    }
  })
})

test.describe('ar-XB, right to left', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./?lang=ar-XB')
    await expect(grid(page)).toBeVisible()
  })

  test('lays the page out right to left, keeps the pixels left to right, and passes axe', async ({ page }) => {
    expect(await page.evaluate(() => document.documentElement.dir)).toBe('rtl')
    // The first column of panels is on the right.
    const choose = await page.locator('#choose-heading').boundingBox()
    const pixels = await page.locator('#pixels-heading').boundingBox()
    expect(choose.x).toBeGreaterThan(pixels.x)
    // The grid is a picture, so column 2 is still to the right of column 1, and the right arrow
    // key still moves right.
    const [first, second] = [await cell(page, 1, 1).boundingBox(), await cell(page, 1, 2).boundingBox()]
    expect(second.x).toBeGreaterThan(first.x)
    await cell(page, 1, 1).focus()
    await page.keyboard.press('ArrowRight')
    await expect(cell(page, 1, 2)).toBeFocused()
    expect(await scan(page)).toEqual([])
    await shot(page, 'pseudo-ar-XB')
  })

  test('reflows at 320 CSS pixels', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    for (const font of ['default', 'wide']) {
      if (font === 'wide') await page.addStyleTag({ content: "* { font-family: Verdana, 'DejaVu Sans', sans-serif !important; }" })
      const { width, outside } = await overflow(page)
      expect(width, `${font} font, sticking out: ${outside.join(', ')}`).toBeLessThanOrEqual(320)
    }
  })
})

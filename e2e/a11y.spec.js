import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// WCAG 2.0, 2.1 and 2.2 at levels A and AA, plus axe-core's best practices.
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

const grid = (page) => page.getByRole('grid')
const cell = (page, row, col) => grid(page).locator(`[data-row="${row - 1}"][data-col="${col - 1}"]`)
const status = (page) => page.getByRole('status')

async function scan(page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  // "Incomplete" means axe couldn't decide and a person has to look, so they go in the report.
  for (const item of results.incomplete) {
    const where = item.nodes.map((node) => node.target.join(' ')).join(', ')
    test.info().annotations.push({ type: 'axe: needs a person to check', description: `${item.id}: ${where}` })
  }
  return results.violations.map((item) => `${item.id}: ${item.nodes.map((node) => node.target.join(' ')).join(', ')}`)
}

// Screenshots for a person to look at, only when SHOTS_DIR is set.
async function shot(page, name) {
  if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/${name}.png`, fullPage: true })
}

async function centerOf(locator) {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  return [box.x + box.width / 2, box.y + box.height / 2]
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await expect(grid(page)).toBeVisible()
})

test.describe('axe-core', () => {
  for (const colorScheme of ['light', 'dark']) {
    test(`finds no violations in the ${colorScheme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      await shot(page, `theme-${colorScheme}`)
      expect(await scan(page)).toEqual([])
    })
  }

  test('finds no violations with errors showing and other options chosen', async ({ page }) => {
    const hex = page.getByRole('textbox', { name: 'Hex code' })
    await hex.fill('#12345')
    await page.getByRole('button', { name: 'Add color' }).click()
    await expect(hex).toHaveAttribute('aria-invalid', 'true')
    await page.getByLabel('Open a skin (a 64 by 64 PNG)').setInputFiles({
      name: 'skin.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('not a skin'),
    })
    await expect(page.getByText('Choose a PNG file. Minecraft skins are PNG images.')).toBeVisible()
    await page.getByRole('combobox', { name: 'Body part' }).selectOption('rightArm')
    await page.getByRole('radio', { name: 'Slim, 3 pixels' }).check()
    await page.getByRole('radio', { name: 'Outer layer (right sleeve)' }).check()
    await page.getByRole('checkbox', { name: 'Say hex codes after color names' }).check()
    await page.getByRole('checkbox', { name: 'Show grid lines' }).uncheck()
    await page.getByRole('combobox', { name: 'Pixel size on screen' }).selectOption('48')
    await shot(page, 'options')
    expect(await scan(page)).toEqual([])
  })
})

test('Windows contrast themes keep the pixel colors and show focus and disabled buttons', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await page.getByRole('link', { name: 'Skip to the pixels' }).focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  await expect(cell(page, 1, 1)).toBeFocused()
  const pixel = await cell(page, 1, 1).evaluate((element) => {
    const css = getComputedStyle(element)
    return { background: css.backgroundColor, outline: `${css.outlineStyle} ${css.outlineWidth}`, adjust: css.forcedColorAdjust }
  })
  expect(pixel).toEqual({ background: 'rgb(74, 50, 32)', outline: 'solid 3px', adjust: 'none' })
  const [undo, grayText] = await page.evaluate(() => {
    const probe = document.createElement('span')
    probe.style.color = 'GrayText'
    document.body.append(probe)
    const gray = getComputedStyle(probe).color
    probe.remove()
    return [getComputedStyle(document.querySelector('button[aria-disabled="true"]')).color, gray]
  })
  expect(undo).toBe(grayText)
  await shot(page, 'forced-colors')
  expect(await scan(page)).toEqual([])
})

test('reflows at 320 CSS pixels wide, like 400% zoom, with no sideways page scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  // Fonts differ between systems, so it's checked with the default font and with a wide one.
  for (const font of ['default', 'wide']) {
    if (font === 'wide') await page.addStyleTag({ content: "* { font-family: Verdana, 'DejaVu Sans', sans-serif !important; }" })
    for (const size of ['24', '32', '48']) {
      await page.getByRole('combobox', { name: 'Pixel size on screen' }).selectOption(size)
      const { width, outside } = await page.evaluate(() => {
        const edge = document.documentElement.clientWidth
        const stickingOut = [...document.querySelectorAll('body *')].filter(
          (element) => element.getBoundingClientRect().right > edge + 0.5 && !element.parentElement.closest('.grid-wrap'),
        )
        return {
          width: document.documentElement.scrollWidth,
          outside: stickingOut.map((element) => element.tagName.toLowerCase() + (element.className ? `.${element.className}` : '')),
        }
      })
      expect(width, `${font} font, pixel size ${size}, sticking out: ${outside.slice(0, 5).join(', ')}`).toBeLessThanOrEqual(320)
    }
  }
  await page.getByRole('combobox', { name: 'Pixel size on screen' }).selectOption('32')
  await shot(page, 'reflow-320')
})

test('text spacing can be increased without cutting off text (WCAG 1.4.12)', async ({ page }) => {
  await page.addStyleTag({
    content:
      '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }',
  })
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll('body *:not(input, select, textarea, option)')]
      .filter((element) => {
        const css = getComputedStyle(element)
        const hides = /hidden|clip/.test(`${css.overflowX} ${css.overflowY}`)
        return hides && (element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1)
      })
      .map((element) => element.outerHTML.slice(0, 80)),
  )
  expect(clipped).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
})

test("follows the browser's default font size instead of fixing it at 16 pixels", async ({ page }) => {
  const session = await page.context().newCDPSession(page)
  await session.send('Page.setFontSizes', { fontSizes: { standard: 24 } })
  await page.reload()
  await expect(grid(page)).toBeVisible()
  expect(await page.evaluate(() => getComputedStyle(document.body).fontSize)).toBe('24px')
})

test('lets two fingers zoom over the pixels, while one finger draws', async ({ page }) => {
  expect(await grid(page).evaluate((element) => getComputedStyle(element).touchAction)).toBe('pinch-zoom')
})

test('Tab reaches every control with a visible focus ring, and the grid is one stop', async ({ page }) => {
  const stops = []
  for (let i = 0; i < 100; i += 1) {
    await page.keyboard.press('Tab')
    const stop = await page.evaluate(() => {
      const element = document.activeElement
      if (!element || element === document.body || element.dataset.visited) return null
      element.dataset.visited = 'yes'
      const css = getComputedStyle(element)
      const ring = (css.outlineStyle !== 'none' && parseFloat(css.outlineWidth) > 0) || css.boxShadow !== 'none'
      const kind = element.getAttribute('role') ?? `${element.tagName.toLowerCase()}${element.type ? ` ${element.type}` : ''}`
      const name = element.getAttribute('aria-label') ?? element.labels?.[0]?.textContent ?? element.textContent
      return { kind, name: name.trim().replace(/\s+/g, ' ').slice(0, 60), ring }
    })
    if (!stop) break
    stops.push(stop)
  }
  test.info().annotations.push({ type: 'Tab stops', description: stops.map((stop) => `${stop.kind}: ${stop.name}`).join(' | ') })
  expect(stops.filter((stop) => !stop.ring)).toEqual([])
  const gridStops = stops.filter((stop) => stop.kind === 'gridcell')
  expect(gridStops).toHaveLength(1)
  const gridIndex = stops.indexOf(gridStops[0])
  // Changing sides and getting back to the pixels is short: Side, Layer, Arm width, then the grid.
  expect(gridIndex - stops.findIndex((stop) => stop.name === 'Side')).toBe(3)
  // The paint colors are the very next stop, so changing color from the grid is Tab, then Shift+Tab back.
  expect(stops[gridIndex + 1]).toMatchObject({ kind: 'input radio', name: 'black' })
})

test('pointer targets are at least 24 by 24 CSS pixels (WCAG 2.5.8)', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Pixel size on screen' }).selectOption('24')
  const small = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        'button, select, input:not([type=radio]):not([type=checkbox]):not([type=file]), label.choice, label.swatch, [role=gridcell]',
      ),
    ]
      .map((element) => {
        const box = element.getBoundingClientRect()
        const name = element.getAttribute('aria-label') ?? element.textContent.trim().slice(0, 40)
        return { name: name || element.tagName, width: box.width, height: box.height }
      })
      .filter((target) => target.width < 24 || target.height < 24),
  )
  expect(small).toEqual([])
})

test('the grid works from the keyboard, and Chromium exposes it as a named grid of named cells', async ({ page }) => {
  await page.getByRole('link', { name: 'Skip to the pixels' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Pixels: Head, front, base layer' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(cell(page, 1, 1)).toBeFocused()
  await expect(grid(page)).toHaveAccessibleDescription(/^8 by 8 pixels\. Seen from the front, so column 1 is on the character's right/)
  await expect(grid(page)).toMatchAriaSnapshot(`
    - grid "Head, front, base layer":
      - row:
        - gridcell "dark brown, row 1, column 1"
        - gridcell "dark brown, row 1, column 2"
  `)
  await page.keyboard.press('ArrowRight')
  await expect(cell(page, 1, 2)).toBeFocused()
  await page.keyboard.press('Space')
  await expect(status(page)).toHaveText(/Painted black\./)
  await expect(cell(page, 1, 2)).toHaveAccessibleName('black, row 1, column 2')
  await page.keyboard.press('r')
  await expect(status(page)).toHaveText(/Row 1, left to right: dark brown, black, 6 dark brown\./)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('radio', { name: 'black' })).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Shift+Tab')
  await expect(cell(page, 1, 2)).toBeFocused()
  await page.keyboard.press('Space')
  await expect(status(page)).toHaveText(/Painted dark gray\./)
})

test('ships the license text of every open source package in the site, and links to it', async ({ page, request }) => {
  const response = await request.get('third-party-notices.txt')
  expect(response.ok()).toBe(true)
  const notices = await response.text()
  const packages = ['react', 'react-dom', 'scheduler', 'skinview-utils', 'skinview3d', 'three']
  for (const name of packages) expect(notices).toMatch(new RegExp(`^${name} \\S+ \\(MIT\\)$`, 'm'))
  expect(notices.match(/Permission is hereby granted/g)).toHaveLength(packages.length)
  await expect(page.getByRole('link', { name: 'third-party notices' })).toHaveAttribute('href', /third-party-notices\.txt$/)
})

test.describe('3D model', () => {
  const model = (page) => page.getByRole('img', { name: /^3D model of the skin/ })

  test('turns with the View and Angle choices or by dragging, and shows painting at once', async ({ page }) => {
    // With reduced motion the model turns at once, which also makes screenshots steady.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await model(page).scrollIntoViewIfNeeded()
    await expect(model(page)).toHaveAccessibleName('3D model of the skin, seen from the front')
    const front = await model(page).screenshot()

    await page.getByRole('radio', { name: 'Back' }).check()
    await expect(model(page)).toHaveAccessibleName('3D model of the skin, seen from the back')
    const back = await model(page).screenshot()
    expect(back.equals(front)).toBe(false)
    await page.waitForTimeout(400)
    expect((await model(page).screenshot()).equals(back), 'no animation with reduced motion').toBe(true)

    await page.getByRole('radio', { name: 'From above' }).check()
    await expect(model(page)).toHaveAccessibleName('3D model of the skin, seen from the back and above')

    // Dragging 180 pixels turns it 90 degrees, and the View choice follows to the nearest side.
    const [x, y] = await centerOf(model(page))
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 180, y, { steps: 6 })
    await page.mouse.up()
    await expect(page.getByRole('radio', { name: 'Left side' })).toBeChecked()
    await expect(model(page)).toHaveAccessibleName('3D model of the skin, seen from the left side and above')

    await page.getByRole('radio', { name: 'Front' }).check()
    await page.getByRole('radio', { name: 'Straight on' }).check()
    await expect(model(page)).toHaveAccessibleName('3D model of the skin, seen from the front')
    const before = await model(page).screenshot()
    await page.getByRole('link', { name: 'Skip to the pixels' }).focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Space')
    await expect(status(page)).toHaveText(/Painted black\./)
    expect((await model(page).screenshot()).equals(before), 'the model shows the new pixel').toBe(false)

    // Choosing another side to edit turns the model to it.
    await page.getByRole('combobox', { name: 'Side', exact: true }).selectOption('back')
    await expect(model(page)).toHaveAccessibleName('3D model of the skin, seen from the back')
    await page.getByRole('combobox', { name: 'Side', exact: true }).selectOption('top')
    await expect(model(page)).toHaveAccessibleName('3D model of the skin, seen from the back and above')
  })

  test('names the spot under the pointer, and a click opens it in the grid', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Body part' }).selectOption('body')
    await expect(grid(page)).toHaveAccessibleName('Body, front, base layer')
    await model(page).scrollIntoViewIfNeeded()
    const box = await model(page).boundingBox()
    const hint = page.getByText(/^(Pointing at|Drag the model)/)
    await expect(hint).toHaveText('Drag the model to turn it. Click a spot on it to edit that spot.')

    // Move down the middle of the model until the hint names the head's front.
    let target = null
    for (let y = box.y + 8; y < box.y + box.height / 2 && target === null; y += 6) {
      await page.mouse.move(box.x + box.width / 2, y)
      await page.waitForTimeout(60)
      if (/^Pointing at Head, front, base layer, row \d+, column \d+\.$/.test(await hint.textContent())) target = y
    }
    expect(target, 'the pointer found the front of the head').not.toBeNull()

    await page.mouse.click(box.x + box.width / 2, target)
    await expect(grid(page)).toHaveAccessibleName('Head, front, base layer')
    await expect(status(page)).toHaveText(/^Editing Head, front, base layer, at row \d+, column \d+\./)
    const [, row, col] = /row (\d+), column (\d+)/.exec(await status(page).textContent())
    await expect(grid(page).locator('[tabindex="0"]')).toHaveAccessibleName(new RegExp(`, row ${row}, column ${col}$`))
  })
})

test('a click paints on release, sliding off cancels, and a fast drag paints a gapless line undone in one step', async ({ page }) => {
  await page.getByRole('radio', { name: 'red' }).check()
  const undo = page.getByRole('button', { name: 'Undo' })

  // Press and release on one pixel: nothing on the press, painted on the release.
  await page.mouse.move(...(await centerOf(cell(page, 2, 2))))
  await page.mouse.down()
  await expect(cell(page, 2, 2)).toHaveAccessibleName('dark brown, row 2, column 2')
  await page.mouse.up()
  await expect(cell(page, 2, 2)).toHaveAccessibleName('red, row 2, column 2')
  await expect(status(page)).toHaveText(/Painted red\./)
  await undo.click()

  // Press on the top row, slide straight up off the grid without crossing another pixel, and
  // release: nothing is painted.
  const [x, y] = await centerOf(cell(page, 1, 4))
  const gridBox = await grid(page).boundingBox()
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, gridBox.y - 30, { steps: 3 })
  await page.mouse.up()
  await expect(cell(page, 1, 4)).toHaveAccessibleName('dark brown, row 1, column 4')
  await expect(undo).toHaveAttribute('aria-disabled', 'true')

  // A fast drag across row 3 skips cells between pointer events, and still paints every one.
  const start = await centerOf(cell(page, 3, 1))
  const end = await centerOf(cell(page, 3, 8))
  await page.mouse.move(...start)
  await page.mouse.down()
  await page.mouse.move(...end, { steps: 2 })
  await page.mouse.up()
  for (let col = 1; col <= 8; col += 1) await expect(cell(page, 3, col)).toHaveAccessibleName(`red, row 3, column ${col}`)
  await undo.click()
  for (let col = 1; col <= 8; col += 1) await expect(cell(page, 3, col)).toHaveAccessibleName(`tan, row 3, column ${col}`)
  await expect(undo).toHaveAttribute('aria-disabled', 'true')
})

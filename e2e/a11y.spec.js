import { test, expect } from '@playwright/test'
import {
  cell,
  centerOf,
  colorsIn,
  grid,
  hiddenTabStops,
  openSkin,
  overflow,
  overlappingPanels,
  scan,
  scrollBoxes,
  shot,
  status,
  tabWalk,
} from './helpers.js'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await expect(grid(page)).toBeVisible()
})

const model = (page) => page.getByRole('img', { name: /^3D model of the skin/ })

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
    await openSkin(page, {
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
    return {
      background: css.backgroundColor,
      outline: `${css.outlineStyle} ${css.outlineWidth}`,
      adjust: css.forcedColorAdjust,
    }
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
  // axe reads the page's own text color against the system background, so light-on-dark parts need system colors.
  expect(await scan(page, { includeReview: true })).toEqual([])
})

test('reflows at 320 CSS pixels wide, like 400% zoom, with no sideways page scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  // Open and Download go under the name, so the name isn't squeezed beside them.
  const [name, actions] = [await page.locator('h1').boundingBox(), await page.locator('.file-actions').boundingBox()]
  expect(actions.y, 'Open and Download under the name').toBeGreaterThanOrEqual(name.y + name.height)
  // Fonts differ between systems, so it's checked with the default font, a wide one, and text twice as big.
  for (const font of ['default', 'wide', 'twice as big']) {
    if (font === 'wide') {
      await page.addStyleTag({ content: "* { font-family: Verdana, 'DejaVu Sans', sans-serif !important; }" })
      // The site's Content Security Policy allows added styles, so tools like this one still work.
      expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toMatch(/^Verdana/)
    }
    if (font === 'twice as big') await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
    for (const size of ['24', '32', '48', '64']) {
      await page.getByRole('combobox', { name: 'Pixel size on screen' }).selectOption(size)
      const { width, outside, outOfPanel } = await overflow(page)
      expect(width, `${font} font, pixel size ${size}, sticking out: ${outside.join(', ')}`).toBeLessThanOrEqual(320)
      expect(outOfPanel, `${font} font, pixel size ${size}, sticking out of a panel`).toEqual([])
    }
  }
  await page.getByRole('combobox', { name: 'Pixel size on screen' }).selectOption('32')
  await shot(page, 'reflow-320')
})

// Zoom shrinks the window in CSS pixels. Two columns on a 1920 by 1080 screen, one on a MacBook Air, and three
// in a short, wide window.
for (const [width, height, what] of [
  [1097, 542, 'at 175% zoom of a 1920 by 1080 screen'],
  [960, 475, 'at 200% zoom of a 1920 by 1080 screen'],
  [720, 395, 'at 200% zoom of a MacBook Air'],
  [1280, 420, 'in a short, wide window'],
]) {
  test(`${what}, nothing covers anything else and every Tab stop shows in full`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    const { width: pageWidth, outOfPanel } = await overflow(page)
    expect(pageWidth, 'no sideways scrolling').toBeLessThanOrEqual(width)
    expect(outOfPanel, 'sticking out of a panel').toEqual([])
    expect(await overlappingPanels(page), 'panels covering each other').toEqual([])
    expect(await scrollBoxes(page), "boxes hiding part of what's in them").toEqual([])
    expect(await hiddenTabStops(page), 'Tab stops off screen or covered').toEqual([])
  })
}

// Other skin editors show a live 3D model beside the texture, so a change shows in both at once.
test('puts the 3D model beside the pixels with three columns, and the side picker compact with one', async ({
  page,
}) => {
  for (const [width, height, bothInView] of [
    [1440, 790, true],
    [1097, 542, true],
    [960, 475, false],
  ]) {
    await page.setViewportSize({ width, height })
    await expect(model(page)).toBeVisible()
    const [pixels, shown] = [await grid(page).boundingBox(), await model(page).boundingBox()]
    const where = `${width} by ${height}`
    // Open and Download sit beside the name, so they don't push the pixels and the model down.
    const [name, actions] = [await page.locator('h1').boundingBox(), await page.locator('.file-actions').boundingBox()]
    expect(actions.y, `${where}: Open and Download beside the name`).toBeLessThan(name.y + name.height)
    expect(shown.x, `${where}: right of the pixels`).toBeGreaterThanOrEqual(pixels.x + pixels.width)
    const bottom = Math.max(pixels.y + pixels.height, shown.y + shown.height)
    expect(bottom - Math.min(pixels.y, shown.y), `${where}: fit in the window together`).toBeLessThanOrEqual(height)
    if (bothInView) expect(bottom, `${where}: both in view without scrolling`).toBeLessThanOrEqual(height)
  }
  // A MacBook Air's screen at 200% zoom: the menus share a row, and each choice is as tall as a menu, so its
  // label fits on one line.
  await page.setViewportSize({ width: 720, height: 395 })
  const picker = page.locator('.panel', { has: page.locator('#choose-heading') })
  const part = await page.getByRole('combobox', { name: 'Body part' }).boundingBox()
  const side = await page.getByRole('combobox', { name: 'Side', exact: true }).boundingBox()
  expect(side.y).toBe(part.y)
  for (const choice of await picker.locator('.choice').all()) {
    expect((await choice.boundingBox()).height).toBeLessThanOrEqual(part.height + 1)
  }
})

test('text spacing can be increased without cutting off text (WCAG 1.4.12)', async ({ page }) => {
  await page.addStyleTag({
    content:
      '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }',
  })
  // The bookmarklet people use for this check adds a style element like this one, so the site's
  // Content Security Policy has to let it apply.
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('h1')).letterSpacing)).not.toBe('normal')
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll('body *:not(input, select, textarea, option)')]
      .filter((element) => {
        const css = getComputedStyle(element)
        const hides = /hidden|clip/.test(`${css.overflowX} ${css.overflowY}`)
        return (
          hides && (element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1)
        )
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
      const kind =
        element.getAttribute('role') ?? `${element.tagName.toLowerCase()}${element.type ? ` ${element.type}` : ''}`
      const name = element.getAttribute('aria-label') ?? element.labels?.[0]?.textContent ?? element.textContent
      return { kind, name: name.trim().replace(/\s+/g, ' ').slice(0, 60), ring }
    })
    if (!stop) break
    stops.push(stop)
  }
  test
    .info()
    .annotations.push({ type: 'Tab stops', description: stops.map((stop) => `${stop.kind}: ${stop.name}`).join(' | ') })
  expect(stops.filter((stop) => !stop.ring)).toEqual([])
  const gridStops = stops.filter((stop) => stop.kind === 'gridcell')
  expect(gridStops).toHaveLength(1)
  const gridIndex = stops.indexOf(gridStops[0])
  // Changing sides and getting back to the pixels is short: Side, Layer, Arm width, then the grid.
  expect(gridIndex - stops.findIndex((stop) => stop.name === 'Side')).toBe(3)
  // The paint colors are the very next stop, so changing color from the grid is Tab, then Shift+Tab back.
  expect(stops[gridIndex + 1]).toMatchObject({ kind: 'input radio', name: 'black' })
  // The skip link comes first, then Open and Download, so they're found without scrolling.
  expect(stops.slice(0, 3).map((stop) => stop.name)).toEqual(['Skip to the pixels', 'Open a skin', 'Download skin.png'])
})

// The same stops each way, and out of the page at both ends, so no part of the page keeps focus.
test('Tab and Shift+Tab go through the same stops in opposite orders and leave the page (no keyboard trap)', async ({
  page,
}) => {
  for (const state of ['as it loads', 'with an error showing, after a click on the 3D model']) {
    if (state !== 'as it loads') {
      await openSkin(page, { name: 'skin.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not a skin') })
      await model(page).scrollIntoViewIfNeeded()
      const box = await model(page).boundingBox()
      await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.45)
      await expect(grid(page).locator('[tabindex="0"]')).toBeFocused()
    }
    // Each walk starts as a person's does: focus leaves the page before its first link, then Tab comes in.
    await page.getByRole('link', { name: 'Skip to the pixels' }).focus()
    await page.keyboard.press('Shift+Tab')
    const forward = await tabWalk(page, 'Tab')
    const backward = await tabWalk(page, 'Shift+Tab')
    expect(forward.trappedAt, `${state}: Tab`).toBeUndefined()
    expect(backward.trappedAt, `${state}: Shift+Tab`).toBeUndefined()
    expect(backward.stops.toReversed(), state).toEqual(forward.stops)
    expect(forward.stops.length, state).toBeGreaterThan(30)
  }
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
  await expect(grid(page)).toHaveAccessibleDescription(
    /^Pencil, black\. 8 by 8 pixels\. Seen from the front, so column 1 is on the character's right/,
  )
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
  // Ctrl+arrow goes to where the color changes, and A says the area of one color the pixel is in.
  await page.keyboard.press('Control+ArrowRight')
  await expect(cell(page, 1, 3)).toBeFocused()
  await page.keyboard.press('Control+ArrowRight')
  await expect(cell(page, 1, 8)).toBeFocused()
  await page.keyboard.press('a')
  await expect(status(page)).toHaveText(/^dark brown: 15 pixels within rows 1 to 2, columns 1 to 8\./)
})

test('keeps the position and last message next to the focused pixel at 100%, 200% and 400% zoom', async ({ page }) => {
  const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
  const callout = page.locator('.callout')
  await page.getByRole('combobox', { name: 'Body part' }).selectOption('body')
  await page.getByRole('link', { name: 'Skip to the pixels' }).focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  await expect(cell(page, 1, 1)).toBeFocused()
  // A 1280 by 720 window at each zoom level, visiting the four corners of the 8 by 12 body front.
  for (const [width, height] of [
    [1280, 720],
    [640, 360],
    [320, 180],
  ]) {
    await page.setViewportSize({ width, height })
    for (const keys of ['End', 'Control+End', 'Home', 'PageUp']) {
      await page.keyboard.press(keys)
      await expect(callout).toBeVisible()
      const [box, pixel, all, area] = await Promise.all([
        callout.boundingBox(),
        page.locator('[role=gridcell]:focus').boundingBox(),
        grid(page).boundingBox(),
        page.locator('.grid-wrap').boundingBox(),
      ])
      const where = `${width} by ${height}, after ${keys}`
      const onScreen = box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height
      expect(onScreen, `${where}: on screen`).toBe(true)
      expect(overlaps(box, pixel), `${where}: the pixel stays in sight`).toBe(false)
      // With room beside the grid, it covers no pixels at all and stays inside the panel.
      if (width >= 640) {
        expect(overlaps(box, all), `${where}: beside the grid`).toBe(false)
        expect(box.x + box.width, `${where}: inside the panel`).toBeLessThanOrEqual(area.x + area.width + 0.5)
      }
    }
  }
  await page.keyboard.press('Delete')
  await expect(callout).toHaveText(/^The base layer can't be see-through in Java Edition\./)
  expect(await scan(page)).toEqual([])
  await page.keyboard.press('Escape')
  await expect(callout).toBeHidden()
  await page.keyboard.press('ArrowRight')
  await expect(callout).toHaveText(/^Row 1, column 2: green/)
  // With little room beside the grid, a long message wraps there instead of running into the next column.
  await page.setViewportSize({ width: 1100, height: 720 })
  await page.locator('[role=gridcell]:focus').scrollIntoViewIfNeeded()
  await page.keyboard.press('Delete')
  await expect(callout).toHaveText(/^The base layer can't be see-through in Java Edition\./)
  const [long, area] = await Promise.all([callout.boundingBox(), page.locator('.grid-wrap').boundingBox()])
  expect(long.x + long.width, 'a long message inside the panel').toBeLessThanOrEqual(area.x + area.width + 0.5)
})

test('ships the license text of every open source package in the site, and links to it', async ({ page, request }) => {
  const response = await request.get('third-party-notices.txt')
  expect(response.ok()).toBe(true)
  const notices = await response.text()
  // A package that's new to the bundle fails this test on purpose, so its license gets a look.
  const packages = {
    '@babylonjs/core': 'Apache-2.0',
    '@formatjs/fast-memoize': 'MIT',
    '@formatjs/icu-messageformat-parser': 'MIT',
    '@formatjs/icu-skeleton-parser': 'MIT',
    'intl-messageformat': 'BSD-3-Clause',
    react: 'MIT',
    'react-dom': 'MIT',
    scheduler: 'MIT',
  }
  const listed = [...notices.matchAll(/^(\S+) \S+ \((.+)\)$/gm)].map(([, name, license]) => [name, license])
  expect(Object.fromEntries(listed)).toEqual(packages)
  const mit = Object.values(packages).filter((license) => license === 'MIT').length
  expect(notices.match(/Permission is hereby granted/g)).toHaveLength(mit)
  // The BSD license asks for its notice "in the documentation and/or other materials provided with
  // the distribution".
  expect(notices).toContain('Redistributions in binary form must reproduce the above')
  // Apache 2.0 asks for the license and for "a readable copy of the attribution notices" in the
  // package's NOTICE file.
  expect(notices).toContain('Apache License\nVersion 2.0, January 2004')
  expect(notices).toContain('NOTICE file from @babylonjs/core:\n\nBabylon.js\nCopyright 2023 The Babylon.js team')
  await expect(page.getByRole('link', { name: 'third-party notices' })).toHaveAttribute(
    'href',
    /third-party-notices\.txt$/,
  )
})

test.describe('3D model', () => {
  test('shows the side facing the camera in its true colors, and an empty outer layer adds nothing', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await model(page).scrollIntoViewIfNeeded()
    // The sample's eye blue and mouth red, exactly. That only happens if the face is on the front,
    // the model is the right way out, and the side facing the camera isn't darkened.
    const front = await colorsIn(page, await model(page).screenshot())
    expect(front.has('59,95,205'), 'eye blue').toBe(true)
    expect(front.has('192,57,43'), 'mouth red').toBe(true)
    // Every outer layer pixel of the sample is transparent, so hiding that layer changes nothing.
    // A thin line of another color at the edge of a side, seen at a slant, would show here.
    for (const angle of ['Straight on', 'From below']) {
      await page.getByRole('radio', { name: 'Back', exact: true }).check()
      await page.getByRole('radio', { name: angle }).check()
      await page.getByRole('checkbox', { name: 'Show the outer layer' }).check()
      const shown = await model(page).screenshot()
      await page.getByRole('checkbox', { name: 'Show the outer layer' }).uncheck()
      expect((await model(page).screenshot()).equals(shown), `seen from the back, ${angle.toLowerCase()}`).toBe(true)
    }
  })

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

    // Dragging 160 pixels turns it 80 degrees. The View choice follows to the nearest side, but the model stays put.
    const [x, y] = await centerOf(model(page))
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 160, y, { steps: 6 })
    await page.mouse.up()
    await expect(page.getByRole('radio', { name: 'Left side' })).toBeChecked()
    await expect(model(page)).toHaveAccessibleName('3D model of the skin, seen from the left side and above')
    const dragged = await model(page).screenshot()
    await page.getByRole('radio', { name: 'Back' }).check()
    await expect(model(page)).toHaveAccessibleName('3D model of the skin, seen from the back and above')
    await page.getByRole('radio', { name: 'Left side' }).check()
    await expect(model(page)).toHaveAccessibleName('3D model of the skin, seen from the left side and above')
    expect((await model(page).screenshot()).equals(dragged), 'the drag left it between two views').toBe(false)

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

  test('names the spot under the pointer, and a click goes to that pixel in the grid without changing it', async ({
    page,
  }) => {
    // Moves down the middle of the model until the hint under it matches, and returns where.
    async function pointAt(pattern) {
      await model(page).scrollIntoViewIfNeeded()
      const box = await model(page).boundingBox()
      const hint = page.locator('figure.preview + p.hint')
      for (let y = box.y + 8; y < box.y + box.height - 8; y += 6) {
        await page.mouse.move(box.x + box.width / 2, y)
        await page.waitForTimeout(60)
        const match = pattern.exec(await hint.textContent())
        if (match) return { x: box.x + box.width / 2, y, match }
      }
      return null
    }
    await page.getByRole('combobox', { name: 'Body part' }).selectOption('body')
    await expect(grid(page)).toHaveAccessibleName('Body, front, base layer')
    await expect(page.locator('figure.preview + p.hint')).toHaveText(
      'Drag the model to turn it. Click a spot to edit it in the pixels.',
    )
    const spot = await pointAt(/^Pointing at Head, front, base layer, row (\d+), column (\d+)\.$/)
    expect(spot, 'the pointer found the front of the head').not.toBeNull()

    // Pixels on the model are 7 to 10 CSS pixels wide, so a click opens that side with focus on that pixel.
    await page.mouse.click(spot.x, spot.y)
    await expect(grid(page)).toHaveAccessibleName('Head, front, base layer')
    const [, row, col] = spot.match
    const pixel = cell(page, Number(row), Number(col))
    await expect(pixel).toBeFocused()
    expect(await pixel.evaluate((element) => element.matches(':focus-visible')), 'the focus ring shows').toBe(true)
    await expect(page.locator('.callout')).toHaveText(new RegExp(`^Row ${row}, column ${col}: `))
    await expect(page.getByRole('button', { name: 'Undo' })).toHaveAttribute('aria-disabled', 'true')
    // From there, Space uses the tool, and Tab goes on to the paint colors as usual.
    await page.keyboard.press('Space')
    await expect(status(page)).toHaveText(/Painted black\./)
    await page.keyboard.press('Tab')
    await expect(page.getByRole('radio', { name: 'black' })).toBeFocused()

    // Pick color doesn't pick from the model either.
    await page.getByRole('radio', { name: 'red' }).check()
    await page.getByRole('radio', { name: 'Pick color' }).check()
    const again = await pointAt(new RegExp(`^Pointing at Head, front, base layer, row ${row}, column ${col}\\.$`))
    await page.mouse.click(again.x, again.y)
    await expect(pixel).toBeFocused()
    await expect(page.getByRole('radio', { name: 'red' })).toBeChecked()
    await expect(page.getByRole('radio', { name: 'Pick color' })).toBeChecked()

    // On a phone the model is far below the pixels, so a tap on it scrolls up to the pixel.
    await page.setViewportSize({ width: 390, height: 844 })
    const far = await pointAt(/^Pointing at (.+), row (\d+), column (\d+)\.$/)
    await page.mouse.click(far.x, far.y)
    const [, side, farRow, farCol] = far.match
    await expect(grid(page)).toHaveAccessibleName(side)
    await expect(cell(page, Number(farRow), Number(farCol))).toBeFocused()
    await expect(cell(page, Number(farRow), Number(farCol))).toBeInViewport()
  })
})

test('a click paints on release, sliding off cancels, and a fast drag paints a gapless line undone in one step', async ({
  page,
}) => {
  await page.getByRole('radio', { name: 'red' }).check()
  const undo = page.getByRole('button', { name: 'Undo' })

  // Pointing names the pixel below the grid, so its color isn't only seen, and doesn't paint it.
  await page.mouse.move(...(await centerOf(cell(page, 2, 2))))
  await expect(page.locator('.cursor-readout')).toHaveText('Pointing at row 2, column 2: dark brown (#4a3220)')

  // Press and release on one pixel: nothing on the press, painted on the release.
  await page.mouse.down()
  await expect(cell(page, 2, 2)).toHaveAccessibleName('dark brown, row 2, column 2')
  await page.mouse.up()
  await expect(cell(page, 2, 2)).toHaveAccessibleName('red, row 2, column 2')
  await expect(status(page)).toHaveText(/Painted red\./)
  // The message by the pixel is for keyboard focus, so a click doesn't show it.
  await expect(page.locator('.callout')).toBeHidden()
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
  for (let col = 1; col <= 8; col += 1)
    await expect(cell(page, 3, col)).toHaveAccessibleName(`red, row 3, column ${col}`)
  await undo.click()
  for (let col = 1; col <= 8; col += 1)
    await expect(cell(page, 3, col)).toHaveAccessibleName(`tan, row 3, column ${col}`)
  await expect(undo).toHaveAttribute('aria-disabled', 'true')
})

test('Ctrl+Z and Ctrl+Y work outside the grid too, and a text field keeps Ctrl+Z for its typing', async ({ page }) => {
  await page.getByRole('radio', { name: 'red' }).check()
  await cell(page, 1, 1).focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Space')
  // In the grid, one press undoes one step, since the page skips what the grid handled.
  await page.keyboard.press('Control+z')
  await expect(cell(page, 1, 2)).toHaveAccessibleName('dark brown, row 1, column 2')
  await expect(cell(page, 1, 1)).toHaveAccessibleName('red, row 1, column 1')

  // From the paint colors, they still undo and redo.
  await page.getByRole('radio', { name: 'red' }).focus()
  await page.keyboard.press('Control+z')
  await expect(cell(page, 1, 1)).toHaveAccessibleName('dark brown, row 1, column 1')
  await expect(status(page)).toHaveText('Undid painting.')
  await page.keyboard.press('Control+y')
  await expect(cell(page, 1, 1)).toHaveAccessibleName('red, row 1, column 1')

  // In a text field, the browser's own undo takes back the typing, and the skin stays as it is.
  const name = page.getByRole('textbox', { name: 'Name (optional)' })
  await name.pressSequentially('Cape')
  await page.keyboard.press('Control+z')
  await expect(name).not.toHaveValue('Cape')
  await expect(cell(page, 1, 1)).toHaveAccessibleName('red, row 1, column 1')
})

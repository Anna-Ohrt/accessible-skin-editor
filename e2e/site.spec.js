import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { test, expect } from '@playwright/test'
import { cell, grid, modelCanvas, status, watchForProblems } from './helpers.js'

const flatPicture = (page) => page.getByRole('img', { name: 'Front view of the skin' })

// The page's Content Security Policy, as a map from each directive to its values.
async function policyOf(page) {
  const content = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
  return Object.fromEntries(content.split(';').map((directive) => {
    const [name, ...values] = directive.trim().split(/\s+/)
    return [name, values]
  }))
}

const POLICY = {
  'default-src': ["'none'"],
  'script-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:'],
  'connect-src': ["'self'"],
  'base-uri': ["'none'"],
  'form-action': ["'none'"],
  'object-src': ["'none'"],
  'require-trusted-types-for': ["'script'"],
  'trusted-types': ["'none'"],
}

async function paintFirstPixel(page) {
  await page.getByRole('link', { name: 'Skip to the pixels' }).focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Space')
  await expect(status(page)).toHaveText(/Painted black\./)
}

test.describe('Security', () => {
  test('runs under a strict Content Security Policy, with no violations or errors', async ({ page }) => {
    const problems = await watchForProblems(page)
    await page.goto('./')
    // Every directive is checked exactly, because Trusted Types would hide a weaker script-src:
    // they block an injected script before the script-src rule is ever reached.
    expect(await policyOf(page)).toEqual(POLICY)
    // The 3D code loads separately, so this shows the policy allows it.
    await expect(modelCanvas(page)).toBeVisible()
    await paintFirstPixel(page)
    await page.getByRole('radio', { name: 'Flat pictures' }).check()
    await expect(flatPicture(page)).toBeVisible()
    await page.getByRole('radio', { name: '3D model' }).check()
    await expect(modelCanvas(page)).toBeVisible()
    expect(problems).toEqual([])
  })

  test('blocks an injected script and refuses HTML built from strings', async ({ page }) => {
    await page.goto('./')
    await expect(grid(page)).toBeVisible()
    const result = await page.evaluate(() => {
      const attempt = (action) => {
        try {
          action()
          return 'allowed'
        } catch (error) {
          return error.name
        }
      }
      const script = document.createElement('script')
      return {
        scriptText: attempt(() => {
          script.textContent = 'window.injected = true'
        }),
        html: attempt(() => {
          document.createElement('div').innerHTML = '<img src=x onerror="window.injected = true">'
        }),
        ran: window.injected === true,
      }
    })
    // Trusted Types make both throw a TypeError before anything can run.
    expect(result).toEqual({ scriptText: 'TypeError', html: 'TypeError', ran: false })
  })

  test('the one-file copy runs from a file, under its own policy, with no errors', async ({ page }) => {
    const file = join(process.cwd(), 'skin-editor.html')
    test.skip(!existsSync(file), 'Build it first with npm run build:single.')
    const problems = await watchForProblems(page)
    await page.goto(pathToFileURL(file).href)
    await expect(grid(page)).toBeVisible()
    await expect(modelCanvas(page)).toBeVisible()
    // The same policy, except the one inline script is allowed by its hash.
    const { 'script-src': scriptSource, ...rest } = await policyOf(page)
    expect(scriptSource).toHaveLength(1)
    expect(scriptSource[0]).toMatch(/^'sha256-[A-Za-z0-9+/]+=*'$/)
    const { 'script-src': _, ...expected } = POLICY
    expect(rest).toEqual(expected)
    await paintFirstPixel(page)
    expect(problems).toEqual([])
  })
})

test.describe('Reliability', () => {
  test('a downloaded skin opens again with every pixel the same', async ({ page }, testInfo) => {
    await page.goto('./')
    await expect(grid(page)).toBeVisible()
    const texture = () => page.locator('canvas.texture-map').evaluate((canvas) => canvas.toDataURL())
    const before = await texture()
    const downloading = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download skin.png' }).click()
    const saved = testInfo.outputPath('skin.png')
    await (await downloading).saveAs(saved)

    await page.getByRole('button', { name: 'Start a plain skin in black' }).click()
    await expect(cell(page, 1, 1)).toHaveAccessibleName('black, row 1, column 1')
    await page.getByLabel('Open a skin (a 64 by 64 PNG)').setInputFiles(saved)
    await expect(status(page)).toHaveText(/^Opened skin\.png\./)
    await expect(cell(page, 1, 1)).toHaveAccessibleName('dark brown, row 1, column 1')
    await expect.poll(texture).toBe(before)
  })

  test('shows flat pictures and says why when the graphics are reset, and 3D can be chosen again', async ({ page }) => {
    await page.goto('./')
    await expect(modelCanvas(page)).toBeVisible()
    await modelCanvas(page).evaluate((canvas) => {
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
      context.getExtension('WEBGL_lose_context').loseContext()
    })
    await expect(page.getByRole('radio', { name: 'Flat pictures' })).toBeChecked()
    await expect(page.getByText('The 3D model stopped because the graphics were reset')).toBeVisible()
    await expect(flatPicture(page)).toBeVisible()
    await page.getByRole('radio', { name: '3D model' }).check()
    await expect(modelCanvas(page)).toBeVisible()
    await expect(page.getByText('The 3D model stopped because the graphics were reset')).toHaveCount(0)
  })

  test('keeps working with flat pictures if the 3D code fails to load', async ({ page }) => {
    await page.route(/Model3D-[^/]*\.js$/, (route) => route.abort())
    await page.goto('./')
    await expect(page.getByText('The 3D model couldn\u2019t load, so it shows flat pictures.')).toBeVisible()
    await expect(page.getByRole('radio', { name: '3D model' })).toBeDisabled()
    await expect(flatPicture(page)).toBeVisible()
    await paintFirstPixel(page)
  })

  test('saves the last change at once when the page is hidden', async ({ page }) => {
    // With the clock paused, the usual save after a pause in changes never comes, so only hiding
    // the page can save. Switching tabs or apps fires visibilitychange.
    await page.clock.install()
    await page.clock.pauseAt(Date.now() + 1000)
    await page.goto('./')
    await paintFirstPixel(page)
    const saved = await page.evaluate(() => {
      // The head's first front pixel is at x 8, y 8 of the texture, 4 bytes per pixel.
      const firstPixel = () => {
        const data = JSON.parse(localStorage.getItem('skin-editor-prototype:v3') ?? 'null')
        const at = (8 * 64 + 8) * 4
        return data && [...atob(data.pixels).slice(at, at + 4)].map((char) => char.charCodeAt(0))
      }
      const before = firstPixel()
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
      return { before, after: firstPixel() }
    })
    // Black, stored as one little-endian number: alpha 255, then blue, green and red at 0.
    expect(saved).toEqual({ before: null, after: [255, 0, 0, 0] })
    await page.reload()
    await expect(cell(page, 1, 1)).toHaveAccessibleName('black, row 1, column 1')
  })
})

test.describe('Performance', () => {
  test('the 3D model loads without moving anything on the page', async ({ page }) => {
    await page.addInitScript(() => {
      window.layoutShift = 0
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.layoutShift += entry.value
      }).observe({ type: 'layout-shift', buffered: true })
    })
    await page.goto('./')
    await expect(modelCanvas(page)).toBeVisible()
    await page.waitForTimeout(500)
    // Cumulative Layout Shift. Google's "good" threshold is 0.1; this page should have none.
    expect(await page.evaluate(() => window.layoutShift)).toBe(0)
  })

  test('the editor works before the 3D code arrives', async ({ page }) => {
    // Holds back the 3D code to show the rest of the editor doesn't wait for it.
    let release
    const held = new Promise((resolve) => {
      release = resolve
    })
    await page.route(/Model3D-[^/]*\.js$/, async (route) => {
      await held
      await route.continue()
    })
    await page.goto('./')
    await expect(page.getByText('Loading the 3D model\u2026')).toBeVisible()
    await paintFirstPixel(page)
    release()
    await expect(modelCanvas(page)).toBeVisible()
  })
})

import { describe, expect, it } from 'vitest'
import { getFace } from '../src/skin/layout.js'
import { nameColor, rgba } from '../src/skin/color.js'
import { createSamplePalette, createSampleSkin, getCell, paintCells } from '../src/skin/pixels.js'
import { composeView, describeView } from '../src/skin/views.js'

const palette = createSamplePalette()
const nameOf = (color) => nameColor(color, palette)

describe('preview', () => {
  it('lays out the front view with the right arm on the viewer\u2019s left', () => {
    const pixels = createSampleSkin()
    const view = composeView(pixels, 'front', 'classic')
    expect([view.width, view.height]).toEqual([16, 32])
    expect(view.partOf[8 * 16 + 0]).toBe('rightArm')
    expect(view.partOf[8 * 16 + 15]).toBe('leftArm')
    expect(view.data[4 * 16 + 5]).toBe(getCell(pixels, getFace('head', 'front', 'base'), 1, 4))
    expect(composeView(pixels, 'front', 'slim').width).toBe(14)
  })

  it('puts the outer layer on top, unless it is hidden', () => {
    const red = rgba(255, 0, 0)
    const pixels = paintCells(createSampleSkin(), getFace('head', 'front', 'outer'), [{ col: 0, row: 0 }], red)
    expect(composeView(pixels, 'front', 'classic').data[4]).toBe(red)
    expect(composeView(pixels, 'front', 'classic', { showOuter: false }).data[4]).not.toBe(red)
  })

  it('describes each view in words', () => {
    const pixels = createSampleSkin()
    expect(describeView(composeView(pixels, 'front'), nameOf)).toBe(
      'Head: mostly tan, with dark brown, white and blue. Body: mostly green. Arms: mostly tan, with green. Legs: mostly dark blue, with dark gray.',
    )
    expect(describeView(composeView(pixels, 'right'), nameOf)).toBe(
      'Head: mostly tan, with dark brown. Right arm: mostly tan, with green. Right leg: mostly dark blue, with dark gray.',
    )
  })
})

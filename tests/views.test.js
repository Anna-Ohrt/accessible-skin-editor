import { describe, expect, it } from 'vitest'
import { getFace } from '../src/skin/layout.js'
import { rgba } from '../src/skin/color.js'
import { createSampleSkin, getCell, paintCells } from '../src/skin/pixels.js'
import { composeView, summarizeView } from '../src/skin/views.js'

const nameOf = (color) => (color === rgba(255, 0, 0) ? 'red' : 'other')

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

  it('sums up each group of parts, naming the one arm and leg a side view shows', () => {
    const pixels = createSampleSkin()
    expect(summarizeView(composeView(pixels, 'front'), nameOf).map(({ group, part }) => [group, part])).toEqual([
      ['head', 'head'],
      ['body', 'body'],
      ['arms', null],
      ['legs', null],
    ])
    const side = summarizeView(composeView(pixels, 'right'), nameOf)
    expect(side.map(({ group, part }) => [group, part])).toEqual([
      ['head', 'head'],
      ['arms', 'rightArm'],
      ['legs', 'rightLeg'],
    ])
    expect(side[0]).toMatchObject({ lead: 'other', mostly: true, others: [] })
  })
})

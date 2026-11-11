import { describe, expect, it } from 'vitest'
import { planEdit } from '../src/editor/edits.js'
import { getFace } from '../src/skin/layout.js'
import { TRANSPARENT, rgba } from '../src/skin/color.js'
import { createSampleSkin, getCell, paintCells } from '../src/skin/pixels.js'

const head = getFace('head', 'front', 'base')
const hat = getFace('head', 'front', 'outer')
const red = rgba(255, 0, 0)
const glass = rgba(255, 0, 0, 128)
const plan = (action, { face = head, color = red, pixels = createSampleSkin() } = {}) =>
  planEdit(action, { pixels, face, model: 'classic', color })

describe('editing commands', () => {
  it('plans a change as a function of the current pixels, with an undo label and a message', () => {
    const pixels = createSampleSkin()
    const result = plan({ type: 'paint', cells: [{ col: 0, row: 0 }] }, { pixels })
    expect(result.label).toEqual({ id: 'action.painting' })
    expect(result.message.id).toBe('status.painted')
    expect(getCell(result.change(pixels), head, 0, 0)).toBe(red)
    expect(getCell(pixels, head, 0, 0)).not.toBe(red)
  })

  it('refuses see-through paint on the base layer, which Java Edition shows solid', () => {
    for (const type of ['paint', 'fill', 'fillSide']) {
      const result = plan({ type, cells: [{ col: 0, row: 0 }], col: 0, row: 0 }, { color: glass })
      expect(result).toEqual({ message: { id: 'status.paintNeedsSolid' }, refused: true })
    }
    expect(plan({ type: 'startPlain' }, { color: glass }).refused).toBe(true)
    expect(plan({ type: 'paint', cells: [{ col: 0, row: 0 }] }, { face: hat, color: glass }).change).toBeTypeOf(
      'function',
    )
  })

  it('says when nothing would change, without a change to undo', () => {
    const pixels = paintCells(createSampleSkin(), head, [{ col: 0, row: 0 }], red)
    expect(plan({ type: 'paint', cells: [{ col: 0, row: 0 }] }, { pixels })).toEqual({
      message: { id: 'status.already' },
    })
    expect(plan({ type: 'erase', cells: [{ col: 0, row: 0 }] }, { face: hat }).message.id).toBe(
      'status.alreadyTransparent',
    )
    expect(plan({ type: 'clearSide' }, { face: hat }).message.id).toBe('status.sideEmpty')
  })

  it('erases only on the outer layer, every pixel of a stroke', () => {
    expect(plan({ type: 'erase', cells: [{ col: 0, row: 0 }] }).refused).toBe(true)
    const pixels = paintCells(createSampleSkin(), hat, [{ col: 2, row: 1 }], red)
    // A stroke that starts on a see-through pixel still erases the rest of it.
    const stroke = [
      { col: 1, row: 1 },
      { col: 2, row: 1 },
    ]
    const result = plan({ type: 'erase', cells: stroke }, { face: hat, pixels })
    expect(getCell(result.change(pixels), hat, 2, 1)).toBe(TRANSPARENT)
  })

  it('counts what a fill changes, for the message and the undo label', () => {
    const result = plan({ type: 'fillSide' }, { face: hat })
    expect(result.message).toEqual({ id: 'status.filledSide', values: { count: 64 } })
    expect(plan({ type: 'fill', col: 0, row: 0 }, { face: hat }).label).toEqual({
      id: 'action.filling',
      values: { count: 64 },
    })
  })

  it('keeps the side a copy went to, so any language can name it', () => {
    const target = getFace('head', 'back', 'base')
    const result = plan({ type: 'copy', target, flip: true })
    expect(result.label).toEqual({ id: 'action.copying', values: { target } })
    expect(result.message).toEqual({ id: 'status.copiedFlipped', values: { target } })
  })

  it('replaces a color on every side and layer of the model, keeping the color it replaced for the message', () => {
    const shirt = getCell(createSampleSkin(), getFace('body', 'front', 'base'), 0, 0)
    const pixels = paintCells(createSampleSkin(), hat, [{ col: 0, row: 0 }], shirt)
    const result = plan({ type: 'replace', from: shirt }, { pixels })
    expect(result.label).toEqual({ id: 'action.replacing', values: { count: 481 } })
    expect(result.message).toEqual({ id: 'status.replaced', values: { count: 481, oldColor: shirt } })
    const replaced = result.change(pixels)
    expect(getCell(replaced, getFace('leftArm', 'back', 'base'), 0, 0)).toBe(red)
    expect(getCell(replaced, hat, 0, 0)).toBe(red)
    expect(planEdit({ type: 'replace', from: shirt }, { pixels, model: 'slim', color: red }).message.values.count).toBe(
      465,
    )
  })

  it('says why a replace changes nothing, and keeps the base layer solid', () => {
    const shirt = getCell(createSampleSkin(), getFace('body', 'front', 'base'), 0, 0)
    expect(plan({ type: 'replace', from: red }).message).toEqual({ id: 'status.replaceSame' })
    expect(plan({ type: 'replace', from: rgba(1, 2, 3) }).message).toEqual({
      id: 'status.replaceNone',
      values: { oldColor: rgba(1, 2, 3) },
    })
    expect(plan({ type: 'replace', from: shirt }, { color: glass })).toEqual({
      message: { id: 'status.plainNeedsSolid' },
      refused: true,
    })
    const onlyOuter = paintCells(createSampleSkin(), hat, [{ col: 0, row: 0 }], rgba(1, 2, 3))
    expect(plan({ type: 'replace', from: rgba(1, 2, 3) }, { pixels: onlyOuter, color: glass }).change).toBeTypeOf(
      'function',
    )
  })

  it('opens a skin as one undo step, counting see-through pixels in the base layer', () => {
    const skin = paintCells(createSampleSkin(), head, [{ col: 0, row: 0 }], glass)
    const result = plan({ type: 'open', skin, file: 'mine.png' })
    expect(result.change(createSampleSkin())).toBe(skin)
    expect(result.message).toEqual({ id: 'status.openedSeeThrough', values: { file: 'mine.png', count: 1 } })
    expect(plan({ type: 'open', skin: createSampleSkin(), file: 'a.png' }).message.id).toBe('status.opened')
  })

  it('rejects a command it does not know', () => {
    expect(() => plan({ type: 'explode' })).toThrow('Unknown edit: explode')
  })
})

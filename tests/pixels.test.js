import { describe, expect, it } from 'vitest'
import { allFaces, getFace } from '../src/skin/layout.js'
import { isOpaque, isTransparent, rgba } from '../src/skin/color.js'
import {
  SAMPLE_COLORS,
  copyFace,
  countByName,
  countSeeThrough,
  createSamplePalette,
  createSampleSkin,
  createSkin,
  fillFace,
  floodFill,
  getCell,
  mirrorFace,
  paintCells,
  rowOf,
  runsOf,
} from '../src/skin/pixels.js'

const A = rgba(10, 20, 30)
const B = rgba(200, 100, 50)
const C = rgba(0, 128, 0)
const headFront = getFace('head', 'front', 'base')
const headLeft = getFace('head', 'left', 'base')

describe('pixel operations', () => {
  it('returns the same array when painting changes nothing', () => {
    const pixels = fillFace(createSkin(), headFront, A).pixels
    expect(paintCells(pixels, headFront, [{ col: 0, row: 0 }], A)).toBe(pixels)
    expect(paintCells(pixels, headFront, [{ col: 0, row: 0 }], B)).not.toBe(pixels)
  })

  it('fills only connected pixels of the same color, and never leaks into the next side', () => {
    let pixels = fillFace(createSkin(), headFront, A).pixels
    pixels = fillFace(pixels, headLeft, A).pixels
    // A wall of C down column 4 splits the front in two.
    pixels = paintCells(
      pixels,
      headFront,
      Array.from({ length: 8 }, (_, row) => ({ col: 3, row })),
      C,
    )
    const result = floodFill(pixels, headFront, 0, 0, B)
    expect(result.count).toBe(24)
    expect(getCell(result.pixels, headFront, 2, 7)).toBe(B)
    expect(getCell(result.pixels, headFront, 4, 0)).toBe(A)
    expect(getCell(result.pixels, headLeft, 0, 0)).toBe(A)
  })

  it('mirrors one half onto the other, leaving the middle column of an odd width alone', () => {
    const arm = getFace('rightArm', 'front', 'base', 'slim')
    let pixels = fillFace(createSkin(), arm, A).pixels
    pixels = paintCells(pixels, arm, [{ col: 0, row: 0 }], B)
    pixels = paintCells(pixels, arm, [{ col: 1, row: 0 }], C)
    const mirrored = mirrorFace(pixels, arm, 'left')
    expect(rowOf(mirrored, arm, 0)).toEqual([B, C, B])
    expect(mirrorFace(mirrored, arm, 'left')).toBe(mirrored)
  })

  it('copies a side, flipped if asked, without copying transparent pixels onto the base layer', () => {
    const hat = getFace('head', 'front', 'outer')
    let pixels = fillFace(createSkin(), headFront, A).pixels
    pixels = paintCells(pixels, hat, [{ col: 0, row: 0 }], B)
    const onBase = copyFace(pixels, hat, headFront, { flip: true })
    expect(getCell(onBase, headFront, 7, 0)).toBe(B)
    expect(getCell(onBase, headFront, 0, 0)).toBe(A)
    const onOuter = copyFace(pixels, headFront, getFace('head', 'back', 'outer'))
    expect(getCell(onOuter, getFace('head', 'back', 'outer'), 0, 0)).toBe(A)
  })

  it('groups a line into runs, and counts pixels by spoken name with how many shades share it', () => {
    expect(runsOf([A, A, B, C, C, C])).toEqual([
      { value: A, count: 2 },
      { value: B, count: 1 },
      { value: C, count: 3 },
    ])
    const darker = rgba(120, 70, 30)
    const lighter = rgba(140, 80, 35)
    const nameOf = (color) => (color === A ? 'blue' : 'brown')
    expect(countByName([darker, lighter, A, darker], nameOf)).toEqual([
      { name: 'brown', count: 3, shades: 2 },
      { name: 'blue', count: 1, shades: 1 },
    ])
  })

  it('counts pixels that aren\u2019t fully solid', () => {
    const hat = getFace('head', 'front', 'outer')
    let pixels = fillFace(createSkin(), headFront, A).pixels
    pixels = paintCells(pixels, headFront, [{ col: 0, row: 0 }], rgba(1, 2, 3, 128))
    expect(countSeeThrough(pixels, [headFront])).toBe(1)
    expect(countSeeThrough(pixels, [headFront, hat])).toBe(65)
  })

  it('starts with a sample skin whose base layer is solid and outer layer is empty', () => {
    const pixels = createSampleSkin()
    for (const face of allFaces('classic')) {
      for (let row = 0; row < face.h; row += 1) {
        for (let col = 0; col < face.w; col += 1) {
          const color = getCell(pixels, face, col, row)
          if (face.layerId === 'base') expect(isOpaque(color), face.id).toBe(true)
          else expect(isTransparent(color), face.id).toBe(true)
        }
      }
    }
    expect(rowOf(pixels, headFront, 4)).toEqual([
      SAMPLE_COLORS.skin,
      SAMPLE_COLORS.eyeWhite,
      SAMPLE_COLORS.eye,
      SAMPLE_COLORS.skin,
      SAMPLE_COLORS.skin,
      SAMPLE_COLORS.eye,
      SAMPLE_COLORS.eyeWhite,
      SAMPLE_COLORS.skin,
    ])
  })

  it('starts with a palette of unnamed colors, which covers every color the sample character uses', () => {
    const palette = createSamplePalette()
    // Names come from how each color looks, in the editor's language (see words.test.js).
    for (const entry of palette) expect(entry.name).toBeNull()
    expect(new Set(palette.map((entry) => entry.color)).size).toBe(palette.length)
    for (const color of Object.values(SAMPLE_COLORS)) expect(palette.some((entry) => entry.color === color)).toBe(true)
  })
})

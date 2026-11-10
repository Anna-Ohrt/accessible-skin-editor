import { describe, expect, it } from 'vitest'
import { createI18n } from '../src/i18n/index.js'
import {
  colorChoices,
  colorName,
  colorNamer,
  describeArea,
  describeFace,
  describeLine,
  describeView,
  faceLabel,
  faceOrientation,
  messageText,
  paletteNames,
} from '../src/i18n/words.js'
import { getFace } from '../src/skin/layout.js'
import { parseHex, rgba } from '../src/skin/color.js'
import { createSamplePalette, createSampleSkin, createSkin, fillFace, paintCells } from '../src/skin/pixels.js'
import { composeView } from '../src/skin/views.js'

const en = createI18n('en')
const named = (hex) => colorName(en, parseHex(hex))
const samplePalette = createSamplePalette()
const sampleNames = paletteNames(en, samplePalette)
const sampleNameOf = colorNamer(en, samplePalette, sampleNames)

describe('color names', () => {
  it('gives common colors everyday names', () => {
    const expected = {
      '#000000': 'black',
      '#ffffff': 'white',
      '#808080': 'gray',
      '#c0c0c0': 'light gray',
      '#404040': 'dark gray',
      '#ff0000': 'red',
      '#800000': 'dark red',
      '#00ff00': 'green',
      '#0000ff': 'blue',
      '#000080': 'dark blue',
      '#87ceeb': 'light blue',
      '#ffff00': 'yellow',
      '#ffa500': 'orange',
      '#8b4513': 'brown',
      '#4a3220': 'dark brown',
      '#d2b48c': 'tan',
      '#f5f5dc': 'beige',
      '#808000': 'olive',
      '#ffc0cb': 'pink',
      '#646e82': 'grayish blue',
    }
    for (const [hex, name] of Object.entries(expected)) expect(named(hex), hex).toBe(name)
  })

  it('names transparent and partly transparent colors', () => {
    expect(colorName(en, 0)).toBe('transparent')
    expect(colorName(en, rgba(255, 0, 0, 128))).toBe('red, 50% opaque')
  })

  it('names every sample palette color by how it looks, with no two the same', () => {
    expect([...sampleNames.values()]).toEqual([
      'black',
      'dark gray',
      'gray',
      'white',
      'red',
      'orange',
      'yellow',
      'green',
      'blue',
      'dark blue',
      'purple',
      'pink',
      'tan',
      'brown',
      'dark brown',
    ])
  })

  it('numbers a generated name that is taken, ignoring case, and keeps names people typed', () => {
    const palette = [
      { id: 'a', name: null, color: parseHex('#3b5fcd') },
      { id: 'b', name: null, color: parseHex('#3a7bd5') },
      { id: 'c', name: 'Blue 3', color: parseHex('#ff0000') },
      { id: 'd', name: null, color: parseHex('#0000ff') },
    ]
    expect([...paletteNames(en, palette).values()]).toEqual(['blue', 'blue 2', 'Blue 3', 'blue 4'])
  })

  it('says the palette name when there is one, and the hex code when asked', () => {
    const palette = [{ id: 'a', name: 'Hair', color: parseHex('#4a3220') }]
    const names = paletteNames(en, palette)
    expect(colorNamer(en, palette, names)(parseHex('#4a3220'))).toBe('Hair')
    expect(colorNamer(en, palette, names, { sayHex: true })(parseHex('#4a3220'))).toBe('Hair, #4a3220')
    expect(colorNamer(en, palette, names)(parseHex('#ff0000'))).toBe('red')
    expect(colorNamer(en, palette, names, { sayHex: true })(0)).toBe('transparent')
  })

  it('offers colors to replace by name, adding hex codes only where two shades share a name', () => {
    const nameOf = colorNamer(en, [], new Map())
    const counts = [
      { color: parseHex('#3b5fcd'), count: 3 },
      { color: parseHex('#000000'), count: 2 },
      { color: parseHex('#3355dd'), count: 1 },
    ]
    expect(colorChoices(en, counts, nameOf)).toEqual([
      { color: parseHex('#3b5fcd'), count: 3, name: 'blue, #3b5fcd' },
      { color: parseHex('#000000'), count: 2, name: 'black' },
      { color: parseHex('#3355dd'), count: 1, name: 'blue, #3355dd' },
    ])
  })
})

describe('sides', () => {
  it('names each side and says which way its rows and columns run', () => {
    const sleeve = getFace('rightArm', 'right', 'outer')
    expect(faceLabel(en, sleeve)).toBe('Right arm, right side, outer layer (right sleeve)')
    expect(faceOrientation(en, sleeve)).toBe('Column 1 is at the back and column 4 is at the front.')
    expect(faceLabel(en, getFace('head', 'front', 'base'))).toBe('Head, front, base layer')
    expect(faceOrientation(en, getFace('head', 'left', 'base'))).toBe(
      'Column 1 is at the front and column 8 is at the back.',
    )
    expect(faceOrientation(en, getFace('head', 'front', 'base'))).toBe(
      "Seen from the front, so column 1 is on the character's right and column 8 is on their left.",
    )
    expect(faceOrientation(en, getFace('head', 'top', 'outer'))).toBe(
      "Seen from above. Row 1 is at the back and row 8 is at the front. Column 1 is on the character's right.",
    )
  })
})

describe('lines, sides and views in words', () => {
  const A = rgba(10, 20, 30)
  const B = rgba(200, 100, 50)
  const C = rgba(0, 128, 0)

  it('reads a line as runs of colors', () => {
    const names = new Map([
      [A, 'Hair'],
      [B, 'Skin'],
      [C, 'Eye'],
    ])
    expect(describeLine(en, [A, A, B, C, C, C], (color) => names.get(color))).toBe('2 Hair, Skin, 3 Eye')
  })

  it('groups different shades that share a spoken name, and says how many shades there are', () => {
    const darker = rgba(120, 70, 30)
    const lighter = rgba(140, 80, 35)
    const nameOf = (color) => (color === A ? 'blue' : 'brown')
    expect(describeLine(en, [darker, lighter, A], nameOf)).toBe('2 brown, blue')
    const face = getFace('rightLeg', 'top', 'base')
    let pixels = fillFace(createSkin(), face, darker).pixels
    pixels = paintCells(
      pixels,
      face,
      [
        { col: 0, row: 0 },
        { col: 1, row: 0 },
      ],
      lighter,
    )
    pixels = paintCells(pixels, face, [{ col: 3, row: 3 }], A)
    expect(describeFace(en, pixels, face, nameOf)).toBe('4 by 4 pixels: 15 brown (2 shades), 1 blue.')
  })

  it('describes an area by its size and the rows and columns it spans, and says when it fills them', () => {
    const area = (name, count, top, bottom, left, right) => describeArea(en, { name, count, top, bottom, left, right })
    expect(area('white', 1, 4, 4, 1, 1)).toBe('white: 1 pixel at row 5, column 2.')
    expect(area('red', 2, 6, 6, 3, 4)).toBe('red: 2 pixels filling row 7, columns 4 to 5.')
    expect(area('blue', 3, 0, 2, 5, 5)).toBe('blue: 3 pixels filling rows 1 to 3, column 6.')
    expect(area('tan', 42, 2, 7, 0, 7)).toBe('tan: 42 pixels within rows 3 to 8, columns 1 to 8.')
  })

  it('describes each view, listing colors the way the language does', () => {
    const pixels = createSampleSkin()
    expect(describeView(en, composeView(pixels, 'front'), sampleNameOf)).toBe(
      'Head: mostly tan, with dark brown, white, and blue. Body: mostly green. Arms: mostly tan, with green. Legs: mostly dark blue, with dark gray.',
    )
    expect(describeView(en, composeView(pixels, 'right'), sampleNameOf)).toBe(
      'Head: mostly tan, with dark brown. Right arm: mostly tan, with green. Right leg: mostly dark blue, with dark gray.',
    )
  })

  it('says a stored message in the language, naming a side among its values', () => {
    expect(messageText(en, { id: 'action.filling', values: { count: 1 } })).toBe('filling 1 pixel')
    expect(messageText(en, { id: 'action.filling', values: { count: 1632 } })).toBe('filling 1,632 pixels')
    const target = getFace('head', 'back', 'base')
    expect(messageText(en, { id: 'action.copying', values: { target } })).toBe('copying to Head, back, base layer')
    expect(messageText(en, { id: 'status.filledSide', values: { count: 64 } }, { color: 'red' })).toMatch(/red/)
  })

  it('names the color a replace changed, when the message is said', () => {
    const message = { id: 'status.replaced', values: { count: 480, oldColor: rgba(47, 143, 107) } }
    expect(messageText(en, message, { color: 'red' }, sampleNameOf)).toBe(
      'Replaced green with red on the whole skin. 480 pixels changed.',
    )
  })
})

import { describe, expect, it } from 'vitest'
import { describeColor, nameColor, parseHex, rgba, toCss, toHex, uniqueName } from '../src/skin/color.js'

const named = (hex) => describeColor(parseHex(hex))

describe('colors', () => {
  it('reads and writes hex codes, and rejects anything else', () => {
    expect(toHex(parseHex('#4a3220'))).toBe('#4a3220')
    expect(toHex(parseHex(' 4A3220 '))).toBe('#4a3220')
    expect(parseHex('#12345')).toBeNull()
    expect(parseHex('blue')).toBeNull()
    expect(toCss(rgba(255, 0, 0, 128))).toBe('rgb(255 0 0 / 0.502)')
  })

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
    }
    for (const [hex, name] of Object.entries(expected)) expect(named(hex), hex).toBe(name)
  })

  it('names transparent and partly transparent colors', () => {
    expect(describeColor(0)).toBe('transparent')
    expect(describeColor(rgba(255, 0, 0, 128))).toBe('red, 50% opaque')
  })

  it('keeps palette names unique', () => {
    expect(uniqueName('Green', [{ name: 'Blue' }])).toBe('Green')
    expect(uniqueName('Green', [{ name: 'green' }, { name: 'Green 2' }])).toBe('Green 3')
  })

  it('says the palette name when there is one, and the hex code when asked', () => {
    const palette = [{ id: 'a', name: 'Hair', color: parseHex('#4a3220') }]
    expect(nameColor(parseHex('#4a3220'), palette)).toBe('Hair')
    expect(nameColor(parseHex('#4a3220'), palette, { sayHex: true })).toBe('Hair, #4a3220')
    expect(nameColor(parseHex('#ff0000'), palette)).toBe('red')
    expect(nameColor(0, palette, { sayHex: true })).toBe('transparent')
  })
})

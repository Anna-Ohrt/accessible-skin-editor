import { describe, expect, it } from 'vitest'
import { classifyColor, parseHex, rgba, toCss, toHex } from '../src/skin/color.js'

describe('colors', () => {
  it('reads and writes hex codes, and rejects anything else', () => {
    expect(toHex(parseHex('#4a3220'))).toBe('#4a3220')
    expect(toHex(parseHex(' 4A3220 '))).toBe('#4a3220')
    expect(parseHex('#12345')).toBeNull()
    expect(parseHex('blue')).toBeNull()
    expect(toCss(rgba(255, 0, 0, 128))).toBe('rgb(255 0 0 / 0.502)')
  })

  it('sorts a color into a hue, a lightness and whether it is muted, with no words, so any language can name it', () => {
    expect(classifyColor(74, 50, 32)).toEqual({ hue: 'brown', lightness: 'dark', muted: false })
    expect(classifyColor(128, 128, 128)).toEqual({ hue: 'gray', lightness: 'normal', muted: false })
    expect(classifyColor(100, 110, 130)).toEqual({ hue: 'blue', lightness: 'normal', muted: true })
    expect(classifyColor(0, 0, 0)).toEqual({ hue: 'black', lightness: 'normal', muted: false })
  })
})

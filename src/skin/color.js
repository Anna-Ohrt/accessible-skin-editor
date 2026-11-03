// Colors are stored as one unsigned 32-bit number per pixel: red, green, blue and alpha, 8 bits
// each. 0 is fully transparent.

export const TRANSPARENT = 0

export const rgba = (r, g, b, a = 255) => ((r << 24) | (g << 16) | (b << 8) | a) >>> 0
export const channels = (color) => [color >>> 24, (color >>> 16) & 255, (color >>> 8) & 255, color & 255]
export const alphaOf = (color) => color & 255
export const isTransparent = (color) => alphaOf(color) === 0
export const isOpaque = (color) => alphaOf(color) === 255

export function parseHex(text) {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(text).trim())
  if (!match) return null
  const value = Number.parseInt(match[1], 16)
  return rgba(value >> 16, (value >> 8) & 255, value & 255)
}

export function toHex(color) {
  const [r, g, b] = channels(color)
  return `#${[r, g, b].map((part) => part.toString(16).padStart(2, '0')).join('')}`
}

export function toCss(color) {
  const [r, g, b, a] = channels(color)
  if (a === 255) return toHex(color)
  return `rgb(${r} ${g} ${b} / ${(a / 255).toFixed(3)})`
}

function toHsl(r, g, b) {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h
  if (max === red) h = ((green - blue) / d) % 6
  else if (max === green) h = (blue - red) / d + 2
  else h = (red - green) / d + 4
  h *= 60
  if (h < 0) h += 360
  return { h, s, l }
}

function grayName(l) {
  if (l < 0.2) return 'very dark gray'
  if (l < 0.4) return 'dark gray'
  if (l < 0.65) return 'gray'
  if (l < 0.85) return 'light gray'
  return 'very light gray'
}

function hueName(h) {
  if (h < 10 || h >= 345) return 'red'
  if (h < 40) return 'orange'
  if (h < 65) return 'yellow'
  if (h < 95) return 'yellow-green'
  if (h < 160) return 'green'
  if (h < 195) return 'cyan'
  if (h < 250) return 'blue'
  if (h < 290) return 'purple'
  return 'magenta'
}

// A short, everyday name for a color, like "dark brown" or "light blue". The rules are simple
// thresholds on hue, saturation and lightness, so two different colors can share a name. That's
// why the palette lets people name their own colors.
export function describeOpaque(r, g, b) {
  const { h, s, l } = toHsl(r, g, b)
  if (l <= 0.07) return 'black'
  if (l >= 0.96) return 'white'
  if (s < 0.12) return grayName(l)

  // Dark oranges and yellows read as brown, and light, muted ones as tan or beige.
  if (h >= 10 && h < 50 && l < 0.45) {
    if (l < 0.2) return 'very dark brown'
    if (l < 0.3) return 'dark brown'
    return 'brown'
  }
  if (h >= 15 && h < 50 && l < 0.8 && s < 0.65) return l < 0.6 ? 'light brown' : 'tan'
  if (h >= 20 && h < 65 && l >= 0.8 && s < 0.7) return 'beige'
  if (h >= 45 && h < 75 && l < 0.35) return l < 0.2 ? 'dark olive' : 'olive'
  if ((h >= 330 || h < 10) && l >= 0.7) return l >= 0.9 ? 'light pink' : 'pink'

  const lightness = l < 0.2 ? 'very dark ' : l < 0.35 ? 'dark ' : l > 0.85 ? 'very light ' : l > 0.68 ? 'light ' : ''
  const muted = s < 0.35 ? 'grayish ' : ''
  return `${lightness}${muted}${hueName(h)}`
}

export function describeColor(color) {
  const [r, g, b, a] = channels(color)
  if (a === 0) return 'transparent'
  const name = describeOpaque(r, g, b)
  return a === 255 ? name : `${name}, ${Math.round((a / 255) * 100)}% opaque`
}

export const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1)

// A palette name that no other palette color uses, like "Green 2".
export function uniqueName(name, palette) {
  const taken = new Set(palette.map((entry) => entry.name.toLowerCase()))
  if (!taken.has(name.toLowerCase())) return name
  for (let n = 2; ; n += 1) {
    const candidate = `${name} ${n}`
    if (!taken.has(candidate.toLowerCase())) return candidate
  }
}

// What a screen reader says for a pixel: the palette name when the color is in the palette,
// otherwise a generated description.
export function nameColor(color, palette, { sayHex = false } = {}) {
  if (isTransparent(color)) return 'transparent'
  const entry = palette.find((item) => item.color === color)
  const name = entry ? entry.name : describeColor(color)
  return sayHex ? `${name}, ${toHex(color)}` : name
}

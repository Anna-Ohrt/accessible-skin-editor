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

function grayLightness(l) {
  if (l < 0.2) return 'veryDark'
  if (l < 0.4) return 'dark'
  if (l < 0.65) return 'normal'
  if (l < 0.85) return 'light'
  return 'veryLight'
}

function hueOf(h) {
  if (h < 10 || h >= 345) return 'red'
  if (h < 40) return 'orange'
  if (h < 65) return 'yellow'
  if (h < 95) return 'yellowGreen'
  if (h < 160) return 'green'
  if (h < 195) return 'cyan'
  if (h < 250) return 'blue'
  if (h < 290) return 'purple'
  return 'magenta'
}

// The parts of a short, everyday name for a color, like "dark brown" or "light blue": a hue, how
// light it is, and whether it's muted ("grayish"). The words come from the messages, so the name
// can be in any language. The rules are simple thresholds on hue, saturation and lightness, so two
// different colors can share a name. That's why the palette lets people name their own colors.
export function classifyColor(r, g, b) {
  const { h, s, l } = toHsl(r, g, b)
  const named = (hue, lightness = 'normal', muted = false) => ({ hue, lightness, muted })
  if (l <= 0.07) return named('black')
  if (l >= 0.96) return named('white')
  if (s < 0.12) return named('gray', grayLightness(l))

  // Dark oranges and yellows read as brown, and light, muted ones as tan or beige.
  if (h >= 10 && h < 50 && l < 0.45) return named('brown', l < 0.2 ? 'veryDark' : l < 0.3 ? 'dark' : 'normal')
  if (h >= 15 && h < 50 && l < 0.8 && s < 0.65) return l < 0.6 ? named('brown', 'light') : named('tan')
  if (h >= 20 && h < 65 && l >= 0.8 && s < 0.7) return named('beige')
  if (h >= 45 && h < 75 && l < 0.35) return named('olive', l < 0.2 ? 'dark' : 'normal')
  if ((h >= 330 || h < 10) && l >= 0.7) return named('pink', l >= 0.9 ? 'light' : 'normal')

  const lightness = l < 0.2 ? 'veryDark' : l < 0.35 ? 'dark' : l > 0.85 ? 'veryLight' : l > 0.68 ? 'light' : 'normal'
  return named(hueOf(h), lightness, s < 0.35)
}

import { SKIN_SIZE } from '../skin/layout.js'
import { readSettings } from './settings.js'

// Keeps the work in localStorage, so a refresh doesn't lose it. Version 2 renamed the sample
// palette's colors, so drafts saved under version 1 are left alone rather than mixed in.
const KEY = 'skin-editor-prototype:v2'

function encode(pixels) {
  const bytes = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength)
  let text = ''
  for (let i = 0; i < bytes.length; i += 4096) text += String.fromCharCode(...bytes.subarray(i, i + 4096))
  return btoa(text)
}

function decode(text) {
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new Uint32Array(bytes.buffer)
}

export function saveDraft({ pixels, palette, model, currentColor, settings }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ pixels: encode(pixels), palette, model, currentColor, settings }))
  } catch {
    // Storage can be full or turned off. The editor still works without it.
  }
}

export function loadDraft() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!data) return null
    const pixels = decode(data.pixels)
    const paletteOk =
      Array.isArray(data.palette) &&
      data.palette.length > 0 &&
      data.palette.every((entry) => typeof entry.id === 'string' && typeof entry.name === 'string' && Number.isInteger(entry.color))
    if (pixels.length !== SKIN_SIZE * SKIN_SIZE || !paletteOk) return null
    const currentColor = data.palette.some((entry) => entry.color === data.currentColor) ? data.currentColor : data.palette[0].color
    return {
      pixels,
      palette: data.palette,
      model: data.model === 'slim' ? 'slim' : 'classic',
      currentColor,
      settings: readSettings(data.settings),
    }
  } catch {
    return null
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}

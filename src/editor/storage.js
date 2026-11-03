import { SKIN_SIZE } from '../skin/layout.js'
import { createSamplePalette, createSampleSkin } from '../skin/pixels.js'
import { createI18n } from '../i18n/index.js'
import { colorName } from '../i18n/words.js'
import { DEFAULT_SETTINGS, readSettings } from './settings.js'

// Version 3 stores no generated color names, so they follow the language. Version 2 work moves over;
// version 1 had other sample colors and is left alone.
const KEY = 'skin-editor-prototype:v3'
const V2_KEY = 'skin-editor-prototype:v2'
export const MAX_NAME_LENGTH = 40
const MAX_ID_LENGTH = 64

function encode(pixels) {
  const bytes = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength)
  let text = ''
  for (let i = 0; i < bytes.length; i += 4096) text += String.fromCharCode(...bytes.subarray(i, i + 4096))
  return btoa(text)
}

function decode(text) {
  try {
    const binary = atob(text)
    if (binary.length !== SKIN_SIZE * SKIN_SIZE * 4) return null
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    return new Uint32Array(bytes.buffer)
  } catch {
    return null
  }
}

const isColor = (value) => Number.isInteger(value) && value >= 0 && value <= 0xffffffff

// Keeps the palette entries that make sense and drops the rest, so one damaged entry doesn't cost
// the whole palette. Ids and colors must be unique, because the editor finds entries by both.
export function readPalette(value) {
  if (!Array.isArray(value)) return null
  const ids = new Set()
  const colors = new Set()
  const palette = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    const { id, name, color } = entry
    const idOk = typeof id === 'string' && id.length > 0 && id.length <= MAX_ID_LENGTH && !ids.has(id)
    const nameOk =
      name === null || (typeof name === 'string' && name.trim().length > 0 && name.length <= MAX_NAME_LENGTH)
    if (!idOk || !nameOk || !isColor(color) || colors.has(color)) continue
    ids.add(id)
    colors.add(color)
    palette.push({ id, name, color })
  }
  return palette.length > 0 ? palette : null
}

// Version 2 stored every name. A name the editor made, like "blue" or "blue 2", becomes null so it
// follows the language; a name someone typed is kept.
export function fromVersion2(palette) {
  if (!Array.isArray(palette)) return palette
  const english = createI18n('en')
  return palette.map((entry) => {
    if (!entry || typeof entry.name !== 'string' || !isColor(entry.color)) return entry
    const made = colorName(english, entry.color)
    const numbered = entry.name.startsWith(`${made} `) && /^\d+$/.test(entry.name.slice(made.length + 1))
    return entry.name === made || numbered ? { ...entry, name: null } : entry
  })
}

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null')
  } catch {
    return null
  }
}

// Each part is checked on its own, so damage to one keeps the rest. Without valid pixels there's no work
// to keep.
export function loadDraft() {
  let data = read(KEY)
  if (!data) {
    data = read(V2_KEY)
    if (data && typeof data === 'object') data = { ...data, palette: fromVersion2(data.palette) }
  }
  if (!data || typeof data !== 'object') return null
  const pixels = typeof data.pixels === 'string' ? decode(data.pixels) : null
  if (!pixels) return null
  const palette = readPalette(data.palette) ?? createSamplePalette()
  const currentColor = palette.some((entry) => entry.color === data.currentColor) ? data.currentColor : palette[0].color
  return {
    pixels,
    palette,
    model: data.model === 'slim' ? 'slim' : 'classic',
    currentColor,
    settings: readSettings(data.settings),
  }
}

// The sample skin, for a first visit or when there's no saved work.
export function startingDraft() {
  const palette = createSamplePalette()
  return {
    pixels: createSampleSkin(),
    palette,
    model: 'classic',
    currentColor: palette[0].color,
    settings: DEFAULT_SETTINGS,
  }
}

export function saveDraft({ pixels, palette, model, currentColor, settings }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ pixels: encode(pixels), palette, model, currentColor, settings }))
    localStorage.removeItem(V2_KEY)
    return true
  } catch {
    // Storage can be full or turned off. The editor still works without it.
    return false
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(V2_KEY)
  } catch {
    // Nothing to clear.
  }
}

// Saves the latest draft once changes pause for `delay` milliseconds, rather than on every pixel of a drag.
// flush() saves at once.
export function createSaver(save = saveDraft, delay = 400) {
  let timer = null
  let pending = null
  function flush() {
    clearTimeout(timer)
    timer = null
    if (!pending) return
    const draft = pending
    pending = null
    save(draft)
  }
  return {
    schedule(draft) {
      pending = draft
      clearTimeout(timer)
      timer = setTimeout(flush, delay)
    },
    flush,
  }
}

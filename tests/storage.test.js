import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSaver, fromVersion2, loadDraft, readPalette, saveDraft } from '../src/editor/storage.js'
import { DEFAULT_SETTINGS } from '../src/editor/settings.js'
import { createSamplePalette, createSampleSkin } from '../src/skin/pixels.js'
import { parseHex } from '../src/skin/color.js'

const V2_KEY = 'skin-editor-prototype:v2'
const V3_KEY = 'skin-editor-prototype:v3'
const draft = () => ({
  pixels: createSampleSkin(),
  palette: createSamplePalette(),
  model: 'slim',
  currentColor: createSamplePalette()[3].color,
  settings: { ...DEFAULT_SETTINGS, cellSize: 48 },
})

afterEach(() => vi.useRealTimers())

describe('saved work', () => {
  it('comes back as it was saved', () => {
    const saved = draft()
    expect(saveDraft(saved)).toBe(true)
    const loaded = loadDraft()
    expect([...loaded.pixels]).toEqual([...saved.pixels])
    expect(loaded).toMatchObject({ palette: saved.palette, model: 'slim', currentColor: saved.currentColor, settings: saved.settings })
  })

  it('moves version 2 work over, turning names the editor made back into generated ones', () => {
    const palette = [
      { id: 'color-1', name: 'black', color: parseHex('#000000') },
      { id: 'custom-1', name: 'blue 2', color: parseHex('#3a7bd5') },
      { id: 'custom-2', name: 'Cape blue', color: parseHex('#2244aa') },
    ]
    // A version 2 draft is shaped like a version 3 one, except every color has a name.
    saveDraft({ ...draft(), palette })
    localStorage.setItem(V2_KEY, localStorage.getItem(V3_KEY))
    localStorage.removeItem(V3_KEY)

    const loaded = loadDraft()
    expect(loaded.palette.map((entry) => entry.name)).toEqual([null, null, 'Cape blue'])
    expect(fromVersion2([{ id: 'x', name: 'blue 2x', color: parseHex('#3a7bd5') }])[0].name).toBe('blue 2x')
    saveDraft(loaded)
    expect(localStorage.getItem(V2_KEY)).toBeNull()
    expect(localStorage.getItem(V3_KEY)).not.toBeNull()
  })

  it('keeps the pixels when the palette is damaged, and drops only the damaged entries', () => {
    const good = { id: 'a', name: null, color: 1 }
    expect(
      readPalette([
        good,
        { id: 'b', name: 'x'.repeat(41), color: 2 },
        { id: 'a', name: null, color: 3 },
        { id: 'c', name: null, color: 1 },
        { id: 'd', name: null, color: 'red' },
        { id: 'e', name: null, color: -1 },
        { id: 'f', name: '   ', color: 4 },
        null,
        { id: 'g', name: 'Cape', color: 5 },
      ]),
    ).toEqual([good, { id: 'g', name: 'Cape', color: 5 }])
    expect(readPalette('palette')).toBeNull()
    expect(readPalette([])).toBeNull()

    saveDraft({ ...draft(), palette: 'broken', currentColor: 12345 })
    const loaded = loadDraft()
    expect([...loaded.pixels]).toEqual([...createSampleSkin()])
    expect(loaded.palette).toEqual(createSamplePalette())
    // The saved paint color isn't in the palette any more, so it's the first one.
    expect(loaded.currentColor).toBe(loaded.palette[0].color)
  })

  it('starts fresh when the pixels are damaged or the data is not JSON', () => {
    localStorage.setItem(V3_KEY, JSON.stringify({ ...draft(), pixels: 'not base64!' }))
    expect(loadDraft()).toBeNull()
    localStorage.setItem(V3_KEY, JSON.stringify({ ...draft(), pixels: btoa('too short') }))
    expect(loadDraft()).toBeNull()
    localStorage.setItem(V3_KEY, '{not json')
    expect(loadDraft()).toBeNull()
  })
})

describe('saving as you go', () => {
  it('saves once, with the latest work, after changes stop', () => {
    vi.useFakeTimers()
    const save = vi.fn()
    const saver = createSaver(save, 400)
    saver.schedule('first')
    vi.advanceTimersByTime(300)
    saver.schedule('second')
    vi.advanceTimersByTime(300)
    expect(save).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(save).toHaveBeenCalledExactlyOnceWith('second')
  })

  it('saves at once when flushed, and not again afterwards', () => {
    vi.useFakeTimers()
    const save = vi.fn()
    const saver = createSaver(save, 400)
    saver.flush()
    expect(save).not.toHaveBeenCalled()
    saver.schedule('work')
    saver.flush()
    expect(save).toHaveBeenCalledExactlyOnceWith('work')
    vi.advanceTimersByTime(1000)
    expect(save).toHaveBeenCalledOnce()
  })
})

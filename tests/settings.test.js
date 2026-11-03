import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, readSettings } from '../src/editor/settings.js'

describe('settings', () => {
  it('keeps saved values the editor understands', () => {
    const saved = { cellSize: 48, sayPosition: false, sayHex: true, showGridLines: false }
    expect(readSettings(saved)).toEqual(saved)
  })

  it('falls back to the defaults for missing or damaged values', () => {
    expect(readSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(readSettings('big')).toEqual(DEFAULT_SETTINGS)
    expect(readSettings({ cellSize: 33, sayPosition: 'no', sayHex: true })).toEqual({
      ...DEFAULT_SETTINGS,
      sayHex: true,
    })
  })
})

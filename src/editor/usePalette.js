import { useMemo, useState } from 'react'
import { useI18n } from '../i18n/context.js'
import { paletteNames } from '../i18n/words.js'

// The paint colors, the one painting now, and their names in the editor's language.
export function usePalette(initial) {
  const i18n = useI18n()
  const [palette, setPalette] = useState(initial.palette)
  const [currentColor, setCurrentColor] = useState(initial.currentColor)
  const names = useMemo(() => paletteNames(i18n, palette), [i18n, palette])
  const current = palette.find((entry) => entry.color === currentColor) ?? palette[0]

  // Makes `color` the paint color, adding it first if it's new. Colors are unique, so the id comes from it.
  function choose(color, name = null) {
    setCurrentColor(color)
    const existing = palette.find((entry) => entry.color === color)
    if (existing) return { name: names.get(existing.id), added: false }
    const entry = { id: `custom-${color.toString(16).padStart(8, '0')}`, name, color }
    const next = [...palette, entry]
    setPalette(next)
    return { name: paletteNames(i18n, next).get(entry.id), added: true }
  }

  function rename(id, name) {
    setPalette(palette.map((entry) => (entry.id === id ? { ...entry, name } : entry)))
  }

  return { palette, names, current, choose, rename }
}

// Everything the editor says about colors, sides and pictures, in the language of `i18n`. The skin
// modules work out what to say; this puts it into words.
import { channels, classifyColor, isTransparent, toHex } from '../skin/color.js'
import { countByName, faceValues, runsOf } from '../skin/pixels.js'
import { summarizeView } from '../skin/views.js'

export function colorName(i18n, color) {
  const [r, g, b, a] = channels(color)
  if (a === 0) return i18n.t('color.transparent')
  const { hue, lightness, muted } = classifyColor(r, g, b)
  const name = i18n.t('color.name', { hue, lightness, muted: muted ? 'yes' : 'no' })
  return a === 255 ? name : i18n.t('color.opacity', { color: name, opacity: a / 255 })
}

// The name shown and spoken for each palette entry, by id. A name someone typed stays as typed.
// Other entries are named by how they look, and when that name is taken, they get a number, like
// "blue 2". Names are compared without case, so "Blue" and "blue" count as the same.
export function paletteNames(i18n, palette) {
  const names = new Map()
  const taken = new Set(palette.filter((entry) => entry.name).map((entry) => i18n.lower(entry.name)))
  for (const entry of palette) {
    if (entry.name) {
      names.set(entry.id, entry.name)
      continue
    }
    const base = colorName(i18n, entry.color)
    let name = base
    for (let n = 2; taken.has(i18n.lower(name)); n += 1) name = i18n.t('color.numbered', { color: base, number: n })
    taken.add(i18n.lower(name))
    names.set(entry.id, name)
  }
  return names
}

// A function that names any color: its palette name if it's in the palette, otherwise a
// description. Names repeat a lot in a skin, so each one is worked out once.
export function colorNamer(i18n, palette, names, { sayHex = false } = {}) {
  const byColor = new Map(palette.map((entry) => [entry.color, names.get(entry.id)]))
  const cache = new Map()
  return (color) => {
    let name = cache.get(color)
    if (name === undefined) {
      if (isTransparent(color)) name = i18n.t('color.transparent')
      else {
        name = byColor.get(color) ?? colorName(i18n, color)
        if (sayHex) name = i18n.t('color.withHex', { color: name, hex: toHex(color) })
      }
      cache.set(color, name)
    }
    return name
  }
}

// "Head, front, base layer"
export function faceLabel(i18n, { partId, sideId, layerId }) {
  return i18n.t('face.label', {
    part: i18n.t(`part.${partId}`),
    side: sideId,
    layer: layerId,
    outer: i18n.t(`outer.${partId}`),
  })
}

// Which way a side's rows and columns run, so people who can't see the texture can orient
// themselves. Row and column numbers start at 1, like the grid announces them.
export const faceOrientation = (i18n, face) => i18n.t(`face.orientation.${face.sideId}`, { w: face.w, h: face.h })

// "2 dark brown, tan, 3 blue": the way a row or column is read out. Neighbors are grouped by what
// they sound like, so two shades that are both called "brown" read as "2 brown", like each pixel does.
export function describeLine(i18n, values, nameOf) {
  const runs = runsOf(values.map(nameOf)).map(({ value, count }) =>
    count > 1 ? i18n.t('words.run', { count, color: value }) : value,
  )
  return i18n.list(runs, 'unit')
}

// "8 by 8 pixels: 42 tan, 16 dark brown, 2 white." Shades that share a name are counted together.
export function describeFace(i18n, pixels, face, nameOf) {
  const counts = countByName(faceValues(pixels, face), nameOf).map(({ name, count, shades }) =>
    shades > 1 ? i18n.t('words.countShades', { count, color: name, shades }) : i18n.t('words.count', { count, color: name }),
  )
  return i18n.t('words.summary', { w: face.w, h: face.h, counts: i18n.list(counts, 'unit') })
}

// A text alternative for the preview, like "Head: mostly tan, with dark brown, white, and blue."
export function describeView(i18n, view, nameOf) {
  return summarizeView(view, nameOf)
    .map(({ group, part, lead, mostly, others }) => {
      const name = i18n.t(part ? `part.${part}` : `view.${group}`)
      const main = mostly ? i18n.t('view.mostly', { color: lead }) : lead
      return others.length
        ? i18n.t('view.groupWith', { part: name, lead: main, others: i18n.list(others) })
        : i18n.t('view.group', { part: name, lead: main })
    })
    .join(' ')
}

// What Undo and Redo say. An undo step stores a message id and its values rather than words, so
// it's said in the editor's language. A side to copy to is stored as the side and named here.
export function actionText(i18n, { id, values = {}, target }) {
  return i18n.t(id, target ? { ...values, target: faceLabel(i18n, target) } : values)
}

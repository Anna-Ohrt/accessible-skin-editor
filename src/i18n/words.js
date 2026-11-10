// Everything the editor says about colors, sides and pictures, in the language of `i18n`.
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

// Each palette entry's name, by id: the name someone typed, or how it looks, numbered when taken
// ("blue 2"). Names are compared without case.
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

// Names any color by its palette name, or else by how it looks. Each name is worked out once, since a
// skin repeats a few colors many times.
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

// The colors on the skin as offered for replacing. Shades that share a name, like two called "blue",
// also say their hex codes, so each choice sounds different.
export function colorChoices(i18n, counts, nameOf) {
  const uses = new Map()
  for (const { color } of counts) uses.set(nameOf(color), (uses.get(nameOf(color)) ?? 0) + 1)
  return counts.map(({ color, count }) => {
    const name = nameOf(color)
    return {
      color,
      count,
      name: uses.get(name) > 1 ? i18n.t('color.withHex', { color: name, hex: toHex(color) }) : name,
    }
  })
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

// Which way a side's rows and columns run, so people who can't see the texture can find their way.
export const faceOrientation = (i18n, face) => i18n.t(`face.orientation.${face.sideId}`, { w: face.w, h: face.h })

// A row or column as it's read out, like "2 dark brown, tan, 3 blue". Neighbors are grouped by how
// they sound, so two shades both called "brown" read as "2 brown".
export function describeLine(i18n, values, nameOf) {
  const runs = runsOf(values.map(nameOf)).map(({ value, count }) =>
    count > 1 ? i18n.t('words.run', { count, color: value }) : value,
  )
  return i18n.list(runs, 'unit')
}

// "8 by 8 pixels: 42 tan, 16 dark brown, 2 white." Shades that share a name are counted together.
export function describeFace(i18n, pixels, face, nameOf) {
  const counts = countByName(faceValues(pixels, face), nameOf).map(({ name, count, shades }) =>
    shades > 1
      ? i18n.t('words.countShades', { count, color: name, shades })
      : i18n.t('words.count', { count, color: name }),
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

// A message kept as an id and values, in the editor's language. A side among the values, like the
// one a copy went to, is named, and so is a color a replace changed.
export function messageText(i18n, { id, values }, extra, nameOf) {
  const { target, oldColor, ...rest } = values ?? {}
  return i18n.t(id, {
    ...extra,
    ...rest,
    ...(target && { target: faceLabel(i18n, target) }),
    ...(oldColor !== undefined && { oldColor: nameOf(oldColor) }),
  })
}

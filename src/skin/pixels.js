import { SKIN_SIZE, PARTS, SIDES, getFace } from './layout.js'
import { TRANSPARENT, alphaOf, rgba } from './color.js'

export const indexOf = (x, y) => y * SKIN_SIZE + x
export const createSkin = () => new Uint32Array(SKIN_SIZE * SKIN_SIZE)

export const getCell = (pixels, face, col, row) => pixels[indexOf(face.x + col, face.y + row)]

export function rowOf(pixels, face, row) {
  return Array.from({ length: face.w }, (_, col) => getCell(pixels, face, col, row))
}

export function columnOf(pixels, face, col) {
  return Array.from({ length: face.h }, (_, row) => getCell(pixels, face, col, row))
}

// Every function below returns the same array when nothing changes, so callers can skip adding
// an undo step for a no-op.

export function paintCells(pixels, face, cells, color) {
  let next = null
  for (const { col, row } of cells) {
    const index = indexOf(face.x + col, face.y + row)
    if ((next ?? pixels)[index] === color) continue
    next ??= pixels.slice()
    next[index] = color
  }
  return next ?? pixels
}

// Fills the pixels connected to (col, row) that have the same color. It stays inside the face,
// so a fill on the front of the head never leaks into the side next to it in the texture.
export function floodFill(pixels, face, col, row, color) {
  const target = getCell(pixels, face, col, row)
  if (target === color) return { pixels, count: 0 }
  const next = pixels.slice()
  const stack = [[col, row]]
  let count = 0
  while (stack.length > 0) {
    const [c, r] = stack.pop()
    if (c < 0 || r < 0 || c >= face.w || r >= face.h) continue
    const index = indexOf(face.x + c, face.y + r)
    if (next[index] !== target) continue
    next[index] = color
    count += 1
    stack.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1])
  }
  return { pixels: next, count }
}

export function fillFace(pixels, face, color) {
  const cells = []
  for (let row = 0; row < face.h; row += 1) {
    for (let col = 0; col < face.w; col += 1) {
      if (getCell(pixels, face, col, row) !== color) cells.push({ col, row })
    }
  }
  return { pixels: paintCells(pixels, face, cells, color), count: cells.length }
}

// Copies one half of a face onto the other half, flipped, for symmetrical designs. With an odd
// width the middle column stays as it is.
export function mirrorFace(pixels, face, from) {
  const cells = []
  const half = Math.floor(face.w / 2)
  let next = pixels
  for (let row = 0; row < face.h; row += 1) {
    for (let col = 0; col < half; col += 1) {
      const [source, target] = from === 'left' ? [col, face.w - 1 - col] : [face.w - 1 - col, col]
      cells.push({ col: target, row, color: getCell(pixels, face, source, row) })
    }
  }
  for (const { col, row, color } of cells) next = paintCells(next, face, [{ col, row }], color)
  return next
}

// Copies one face onto another of the same size. The base layer can't be see-through in Java
// Edition, so transparent pixels aren't copied onto it.
export function copyFace(pixels, from, to, { flip = false } = {}) {
  if (from.w !== to.w || from.h !== to.h) throw new Error('Both sides must be the same size.')
  let next = pixels
  for (let row = 0; row < from.h; row += 1) {
    for (let col = 0; col < from.w; col += 1) {
      const color = getCell(pixels, from, flip ? from.w - 1 - col : col, row)
      if (to.layerId === 'base' && alphaOf(color) === 0) continue
      next = paintCells(next, to, [{ col, row }], color)
    }
  }
  return next
}

// Groups repeated values: [a, a, b] becomes [{ value: a, count: 2 }, { value: b, count: 1 }].
export function runsOf(values) {
  const runs = []
  for (const value of values) {
    const last = runs.at(-1)
    if (last && last.value === value) last.count += 1
    else runs.push({ value, count: 1 })
  }
  return runs
}

// Counts pixels by spoken name, most common first, and how many different colors share a name.
export function countByName(values, nameOf) {
  const groups = new Map()
  for (const value of values) {
    const name = nameOf(value)
    const group = groups.get(name) ?? { name, count: 0, colors: new Set() }
    group.count += 1
    group.colors.add(value)
    groups.set(name, group)
  }
  return [...groups.values()]
    .map(({ name, count, colors }) => ({ name, count, shades: colors.size }))
    .sort((a, b) => b.count - a.count)
}

export function faceValues(pixels, face) {
  const values = []
  for (let row = 0; row < face.h; row += 1) values.push(...rowOf(pixels, face, row))
  return values
}

// How many pixels on these faces aren't fully solid.
export function countSeeThrough(pixels, faces) {
  let count = 0
  for (const face of faces) {
    for (const value of faceValues(pixels, face)) if (alphaOf(value) < 255) count += 1
  }
  return count
}

// The sample skin: an original character made for this prototype, so none of it is Mojang's art. Keys say
// where it uses each color.
export const SAMPLE_COLORS = {
  skin: rgba(198, 156, 109), // tan
  hair: rgba(74, 50, 32), // dark brown
  eyeWhite: rgba(255, 255, 255), // white
  eye: rgba(59, 95, 205), // blue
  mouth: rgba(192, 57, 43), // red
  shirt: rgba(47, 143, 107), // green
  pants: rgba(40, 52, 110), // dark blue
  shoes: rgba(80, 80, 80), // dark gray
}

// Grays first, then the rainbow, then browns. Every name comes from the same color naming as any
// other color, so the names follow the language, and no two are the same.
const SAMPLE_PALETTE = [
  rgba(0, 0, 0),
  SAMPLE_COLORS.shoes,
  rgba(127, 140, 141),
  SAMPLE_COLORS.eyeWhite,
  SAMPLE_COLORS.mouth,
  rgba(230, 126, 34),
  rgba(241, 196, 15),
  SAMPLE_COLORS.shirt,
  SAMPLE_COLORS.eye,
  SAMPLE_COLORS.pants,
  rgba(142, 68, 173),
  rgba(241, 156, 187),
  SAMPLE_COLORS.skin,
  rgba(141, 85, 36),
  SAMPLE_COLORS.hair,
]

// A palette entry's name is null until someone names it. Until then it's named by how it looks,
// in the editor's language.
export function createSamplePalette() {
  return SAMPLE_PALETTE.map((color, index) => ({ id: `color-${index + 1}`, name: null, color }))
}

function fillRows(pixels, face, fromRow, toRow, color) {
  const cells = []
  for (let row = fromRow; row <= toRow; row += 1) {
    for (let col = 0; col < face.w; col += 1) cells.push({ col, row })
  }
  return paintCells(pixels, face, cells, color)
}

export function createSampleSkin() {
  const c = SAMPLE_COLORS
  let pixels = createSkin()
  const face = (partId, sideId) => getFace(partId, sideId, 'base', 'classic')
  const fill = (partId, sideId, color) => {
    pixels = fillFace(pixels, face(partId, sideId), color).pixels
  }
  const rows = (partId, sideId, from, to, color) => {
    pixels = fillRows(pixels, face(partId, sideId), from, to, color)
  }
  const dots = (partId, sideId, cells, color) => {
    pixels = paintCells(pixels, face(partId, sideId), cells, color)
  }

  for (const side of SIDES) fill('head', side, c.skin)
  fill('head', 'top', c.hair)
  fill('head', 'back', c.hair)
  rows('head', 'right', 0, 2, c.hair)
  rows('head', 'left', 0, 2, c.hair)
  rows('head', 'front', 0, 1, c.hair)
  dots(
    'head',
    'front',
    [
      { col: 1, row: 4 },
      { col: 6, row: 4 },
    ],
    c.eyeWhite,
  )
  dots(
    'head',
    'front',
    [
      { col: 2, row: 4 },
      { col: 5, row: 4 },
    ],
    c.eye,
  )
  dots(
    'head',
    'front',
    [
      { col: 3, row: 6 },
      { col: 4, row: 6 },
    ],
    c.mouth,
  )

  for (const side of SIDES) fill('body', side, c.shirt)
  fill('body', 'bottom', c.pants)

  for (const arm of ['rightArm', 'leftArm']) {
    for (const side of ['front', 'back', 'right', 'left']) {
      rows(arm, side, 0, 3, c.shirt)
      rows(arm, side, 4, 11, c.skin)
    }
    fill(arm, 'top', c.shirt)
    fill(arm, 'bottom', c.skin)
  }

  for (const leg of ['rightLeg', 'leftLeg']) {
    for (const side of ['front', 'back', 'right', 'left']) {
      rows(leg, side, 0, 9, c.pants)
      rows(leg, side, 10, 11, c.shoes)
    }
    fill(leg, 'top', c.pants)
    fill(leg, 'bottom', c.shoes)
  }
  return pixels
}

// A plain skin: every base side in one color and an empty outer layer.
export function createPlainSkin(color) {
  let pixels = createSkin()
  for (const part of PARTS) {
    for (const side of SIDES) pixels = fillFace(pixels, getFace(part.id, side, 'base', 'classic'), color).pixels
  }
  return pixels
}

export { TRANSPARENT }

import { getFace, partById } from './layout.js'
import { channels, rgba } from './color.js'
import { getCell, countByName } from './pixels.js'

export const VIEWS = [
  { id: 'front', name: 'Front' },
  { id: 'right', name: 'Right side' },
  { id: 'back', name: 'Back' },
  { id: 'left', name: 'Left side' },
]

// Where each face goes in a flat picture of the character. Seen from the front, the character's
// right arm is on the viewer's left. From the side, the arm and leg on that side cover the body.
function placementsFor(viewId, armWidth) {
  const a = armWidth
  switch (viewId) {
    case 'front':
      return {
        width: 8 + 2 * a,
        height: 32,
        items: [
          ['head', 'front', a, 0],
          ['body', 'front', a, 8],
          ['rightArm', 'front', 0, 8],
          ['leftArm', 'front', a + 8, 8],
          ['rightLeg', 'front', a, 20],
          ['leftLeg', 'front', a + 4, 20],
        ],
      }
    case 'back':
      return {
        width: 8 + 2 * a,
        height: 32,
        items: [
          ['head', 'back', a, 0],
          ['body', 'back', a, 8],
          ['leftArm', 'back', 0, 8],
          ['rightArm', 'back', a + 8, 8],
          ['leftLeg', 'back', a, 20],
          ['rightLeg', 'back', a + 4, 20],
        ],
      }
    case 'right':
      return {
        width: 8,
        height: 32,
        items: [
          ['head', 'right', 0, 0],
          ['rightArm', 'right', 2, 8],
          ['rightLeg', 'right', 2, 20],
        ],
      }
    case 'left':
      return {
        width: 8,
        height: 32,
        items: [
          ['head', 'left', 0, 0],
          ['leftArm', 'left', 2, 8],
          ['leftLeg', 'left', 2, 20],
        ],
      }
    default:
      throw new Error(`Unknown view: ${viewId}`)
  }
}

// Puts a partly see-through color over another one.
function over(top, bottom) {
  const [r1, g1, b1, a1] = channels(top)
  if (a1 === 255) return top
  if (a1 === 0) return bottom
  const [r2, g2, b2, a2] = channels(bottom)
  const a = a1 / 255
  const b = (a2 / 255) * (1 - a)
  const alpha = a + b
  const mix = (x, y) => Math.round((x * a + y * b) / alpha)
  return rgba(mix(r1, r2), mix(g1, g2), mix(b1, b2), Math.round(alpha * 255))
}

// Returns the flat picture as colors, plus which body part each pixel belongs to.
export function composeView(pixels, viewId, model = 'classic', { showOuter = true } = {}) {
  const armWidth = model === 'slim' ? 3 : 4
  const { width, height, items } = placementsFor(viewId, armWidth)
  const data = new Uint32Array(width * height)
  const partOf = new Array(width * height).fill(null)
  for (const [partId, sideId, left, top] of items) {
    const base = getFace(partId, sideId, 'base', model)
    const outer = getFace(partId, sideId, 'outer', model)
    for (let row = 0; row < base.h; row += 1) {
      for (let col = 0; col < base.w; col += 1) {
        const index = (top + row) * width + left + col
        let color = getCell(pixels, base, col, row)
        if (showOuter) color = over(getCell(pixels, outer, col, row), color)
        data[index] = color
        partOf[index] = partId
      }
    }
  }
  return { width, height, data, partOf }
}

const GROUPS = [
  { name: 'Head', parts: ['head'] },
  { name: 'Body', parts: ['body'] },
  { name: 'Arms', parts: ['rightArm', 'leftArm'] },
  { name: 'Legs', parts: ['rightLeg', 'leftLeg'] },
]

function listWords(words) {
  if (words.length <= 1) return words.join('')
  return `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`
}

// A text alternative for the preview, like "Head: mostly Skin, with Hair and Eye." The body is
// hidden behind the arm in the side views, so it's left out there.
export function describeView(view, nameOf) {
  const sentences = []
  for (const group of GROUPS) {
    const values = []
    view.partOf.forEach((partId, index) => {
      if (group.parts.includes(partId)) values.push(view.data[index])
    })
    if (values.length === 0) continue
    const [first, ...rest] = countByName(values, nameOf)
    const others = rest.slice(0, 3).map(({ name }) => name)
    const lead = first.count / values.length >= 0.5 ? `mostly ${first.name}` : first.name
    const label = sideViewName(group, view)
    sentences.push(others.length ? `${label}: ${lead}, with ${listWords(others)}.` : `${label}: ${lead}.`)
  }
  return sentences.join(' ')
}

// In a side view only one arm and one leg show, so say "Right arm" instead of "Arms".
function sideViewName(group, view) {
  if (group.parts.length === 1) return group.name
  const shown = group.parts.filter((partId) => view.partOf.includes(partId))
  return shown.length === 1 ? partById(shown[0]).name : group.name
}

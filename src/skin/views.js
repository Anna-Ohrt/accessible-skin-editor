import { getFace } from './layout.js'
import { channels, rgba } from './color.js'
import { getCell, countByName } from './pixels.js'

export const VIEWS = ['front', 'right', 'back', 'left']

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
  { id: 'head', parts: ['head'] },
  { id: 'body', parts: ['body'] },
  { id: 'arms', parts: ['rightArm', 'leftArm'] },
  { id: 'legs', parts: ['rightLeg', 'leftLeg'] },
]

// What a text alternative for the preview needs: for each group of body parts, its most common
// color, whether that's most of it, and up to three other colors. In a side view only one arm and
// one leg show, so `part` names that one, like "Right arm", instead of "Arms". The body is hidden
// behind the arm in the side views, so it's left out there.
export function summarizeView(view, nameOf) {
  const groups = []
  for (const group of GROUPS) {
    const values = []
    view.partOf.forEach((partId, index) => {
      if (group.parts.includes(partId)) values.push(view.data[index])
    })
    if (values.length === 0) continue
    const [first, ...rest] = countByName(values, nameOf)
    const shown = group.parts.filter((partId) => view.partOf.includes(partId))
    groups.push({
      group: group.id,
      part: shown.length === 1 ? shown[0] : null,
      lead: first.name,
      mostly: first.count / values.length >= 0.5,
      others: rest.slice(0, 3).map(({ name }) => name),
    })
  }
  return groups
}

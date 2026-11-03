// Where each body part lives in a 64 by 64 Minecraft skin texture.
//
// Every body part is a box, and each of its six sides is a rectangle in the texture. The box
// positions and sizes match the setSkinUVs calls in skinview3d
// (github.com/bs-community/skinview3d, src/model.ts). Slim arms are 3 pixels wide instead of 4.
//
// Side names are from the character's point of view, like Minecraft's "right arm". Which edge
// of each rectangle touches which part of the body was worked out from the same file and three.js
// BoxGeometry, and is described in plain words by orientationOf().
//
// Outer layer names match Java Edition's Skin Customization options (Hat, Jacket, Left Sleeve,
// Right Sleeve, Left Pant Leg, Right Pant Leg), so players hear the same words as in the game.

export const SKIN_SIZE = 64

export const PARTS = [
  { id: 'head', name: 'Head', size: [8, 8, 8], base: [0, 0], outer: [32, 0], outerName: 'hat' },
  { id: 'body', name: 'Body', size: [8, 12, 4], base: [16, 16], outer: [16, 32], outerName: 'jacket' },
  { id: 'rightArm', name: 'Right arm', size: [4, 12, 4], slimWidth: 3, base: [40, 16], outer: [40, 32], outerName: 'right sleeve' },
  { id: 'leftArm', name: 'Left arm', size: [4, 12, 4], slimWidth: 3, base: [32, 48], outer: [48, 48], outerName: 'left sleeve' },
  { id: 'rightLeg', name: 'Right leg', size: [4, 12, 4], base: [0, 16], outer: [0, 32], outerName: 'right pant leg' },
  { id: 'leftLeg', name: 'Left leg', size: [4, 12, 4], base: [16, 48], outer: [0, 48], outerName: 'left pant leg' },
]

export const SIDES = [
  { id: 'front', name: 'Front' },
  { id: 'back', name: 'Back' },
  { id: 'right', name: 'Right side' },
  { id: 'left', name: 'Left side' },
  { id: 'top', name: 'Top' },
  { id: 'bottom', name: 'Bottom' },
]

export const LAYERS = [
  { id: 'base', name: 'Base layer' },
  { id: 'outer', name: 'Outer layer' },
]

export const MODELS = [
  { id: 'classic', name: 'Classic', armWidth: 4 },
  { id: 'slim', name: 'Slim', armWidth: 3 },
]

export const partById = (id) => PARTS.find((part) => part.id === id)
export const sideById = (id) => SIDES.find((side) => side.id === id)

// The rectangle for one side of a box whose texture starts at (u, v). This is the standard box
// unwrap: top and bottom on the first row, then right side, front, left side and back.
function rectOf(sideId, u, v, w, h, d) {
  switch (sideId) {
    case 'top':
      return { x: u + d, y: v, w, h: d }
    case 'bottom':
      return { x: u + d + w, y: v, w, h: d }
    case 'right':
      return { x: u, y: v + d, w: d, h }
    case 'front':
      return { x: u + d, y: v + d, w, h }
    case 'left':
      return { x: u + d + w, y: v + d, w: d, h }
    case 'back':
      return { x: u + d + w + d, y: v + d, w, h }
    default:
      throw new Error(`Unknown side: ${sideId}`)
  }
}

// Which way a side's rows and columns run, so people who can't see the texture can orient
// themselves. Row and column numbers start at 1, like the grid announces them.
export function orientationOf(sideId, w, h) {
  switch (sideId) {
    case 'front':
      return `Seen from the front, so column 1 is on the character's right and column ${w} is on their left.`
    case 'back':
      return `Seen from behind, so column 1 is on the character's left and column ${w} is on their right.`
    case 'right':
      return `Column 1 is at the back and column ${w} is at the front.`
    case 'left':
      return `Column 1 is at the front and column ${w} is at the back.`
    case 'top':
      return `Seen from above. Row 1 is at the back and row ${h} is at the front. Column 1 is on the character's right.`
    case 'bottom':
      return `Row 1 is at the back and row ${h} is at the front. Column 1 is on the character's right.`
    default:
      return ''
  }
}

export function faceLabel(partId, sideId, layerId) {
  const part = partById(partId)
  const side = sideById(sideId).name.toLowerCase()
  const layer = layerId === 'base' ? 'base layer' : `outer layer (${part.outerName})`
  return `${part.name}, ${side}, ${layer}`
}

export function getFace(partId, sideId, layerId, model = 'classic') {
  const part = partById(partId)
  if (!part) throw new Error(`Unknown part: ${partId}`)
  const [boxWidth, h, d] = part.size
  const w = model === 'slim' && part.slimWidth ? part.slimWidth : boxWidth
  const [u, v] = layerId === 'outer' ? part.outer : part.base
  const rect = rectOf(sideId, u, v, w, h, d)
  return {
    id: `${partId}-${sideId}-${layerId}`,
    partId,
    sideId,
    layerId,
    ...rect,
    label: faceLabel(partId, sideId, layerId),
    orientation: orientationOf(sideId, rect.w, rect.h),
  }
}

export function allFaces(model = 'classic') {
  return LAYERS.flatMap((layer) =>
    PARTS.flatMap((part) => SIDES.map((side) => getFace(part.id, side.id, layer.id, model))),
  )
}

// The face that contains a texture pixel, or null for the unused parts of the texture.
export function faceAt(x, y, model = 'classic') {
  return allFaces(model).find((face) => x >= face.x && x < face.x + face.w && y >= face.y && y < face.y + face.h) ?? null
}

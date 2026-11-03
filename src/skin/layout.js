// Where each side of each body part lives in a 64 by 64 skin texture, matching skinview3d's setSkinUVs.
// Only ids are here; the messages in src/i18n name them, so they can be in any language.

export const SKIN_SIZE = 64

export const PARTS = [
  { id: 'head', size: [8, 8, 8], base: [0, 0], outer: [32, 0] },
  { id: 'body', size: [8, 12, 4], base: [16, 16], outer: [16, 32] },
  { id: 'rightArm', size: [4, 12, 4], slimWidth: 3, base: [40, 16], outer: [40, 32] },
  { id: 'leftArm', size: [4, 12, 4], slimWidth: 3, base: [32, 48], outer: [48, 48] },
  { id: 'rightLeg', size: [4, 12, 4], base: [0, 16], outer: [0, 32] },
  { id: 'leftLeg', size: [4, 12, 4], base: [16, 48], outer: [0, 48] },
]

export const SIDES = ['front', 'back', 'right', 'left', 'top', 'bottom']

export const LAYERS = ['base', 'outer']

export const MODELS = [
  { id: 'classic', armWidth: 4 },
  { id: 'slim', armWidth: 3 },
]

export const partById = (id) => PARTS.find((part) => part.id === id)

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

export function getFace(partId, sideId, layerId, model = 'classic') {
  const part = partById(partId)
  if (!part) throw new Error(`Unknown part: ${partId}`)
  const [boxWidth, h, d] = part.size
  const w = model === 'slim' && part.slimWidth ? part.slimWidth : boxWidth
  const [u, v] = layerId === 'outer' ? part.outer : part.base
  return { id: `${partId}-${sideId}-${layerId}`, partId, sideId, layerId, ...rectOf(sideId, u, v, w, h, d) }
}

export function allFaces(model = 'classic') {
  return LAYERS.flatMap((layerId) =>
    PARTS.flatMap((part) => SIDES.map((sideId) => getFace(part.id, sideId, layerId, model))),
  )
}

// The face that contains a texture pixel, or null for the unused parts of the texture.
export function faceAt(x, y, model = 'classic') {
  return (
    allFaces(model).find((face) => x >= face.x && x < face.x + face.w && y >= face.y && y < face.y + face.h) ?? null
  )
}

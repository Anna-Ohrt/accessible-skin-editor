import { LAYERS, PARTS, getFace, partById } from './layout.js'
import { alphaOf } from './color.js'
import { getCell } from './pixels.js'

// The Minecraft player model as boxes, one unit per texture pixel, facing +z with feet at y = -16 and the
// character's right at -x. Its texture mapping matched skinview3d's at every corner (see README).

const CENTER_Y = 16

// Where each part's box is centered, with the feet at y = 0. The legs meet edge to edge, so a click on
// them lands on one leg.
function centerOf(partId, armWidth) {
  switch (partId) {
    case 'head':
      return [0, 28, 0]
    case 'body':
      return [0, 18, 0]
    case 'rightArm':
      return [-4 - armWidth / 2, 18, 0]
    case 'leftArm':
      return [4 + armWidth / 2, 18, 0]
    case 'rightLeg':
      return [-2, 6, 0]
    case 'leftLeg':
      return [2, 6, 0]
    default:
      throw new Error(`Unknown part: ${partId}`)
  }
}

// The outer layer sits outside the base by half a pixel for the hat, and a quarter elsewhere.
const growthOf = (partId, layerId) => (layerId === 'base' ? 0 : partId === 'head' ? 0.5 : 0.25)

export function boxOf(partId, layerId, model = 'classic') {
  const part = partById(partId)
  const [boxWidth, height, depth] = part.size
  const width = model === 'slim' && part.slimWidth ? part.slimWidth : boxWidth
  const [x, y, z] = centerOf(partId, width)
  const grow = growthOf(partId, layerId)
  const half = [width / 2 + grow, height / 2 + grow, depth / 2 + grow]
  return {
    min: [x - half[0], y - CENTER_Y - half[1], z - half[2]],
    max: [x + half[0], y - CENTER_Y + half[1], z + half[2]],
  }
}

// One side of a box: the corner where its first row and column meet, the vectors its columns and rows
// run along, and which way it faces.
export function sideFrame(box, sideId) {
  const [x0, y0, z0] = box.min
  const [x1, y1, z1] = box.max
  switch (sideId) {
    case 'front':
      return { corner: [x0, y1, z1], across: [x1 - x0, 0, 0], down: [0, y0 - y1, 0], normal: [0, 0, 1] }
    case 'back':
      return { corner: [x1, y1, z0], across: [x0 - x1, 0, 0], down: [0, y0 - y1, 0], normal: [0, 0, -1] }
    case 'right':
      return { corner: [x0, y1, z0], across: [0, 0, z1 - z0], down: [0, y0 - y1, 0], normal: [-1, 0, 0] }
    case 'left':
      return { corner: [x1, y1, z1], across: [0, 0, z0 - z1], down: [0, y0 - y1, 0], normal: [1, 0, 0] }
    case 'top':
      return { corner: [x0, y1, z0], across: [x1 - x0, 0, 0], down: [0, 0, z1 - z0], normal: [0, 1, 0] }
    case 'bottom':
      return { corner: [x0, y0, z0], across: [x1 - x0, 0, 0], down: [0, 0, z1 - z0], normal: [0, -1, 0] }
    default:
      throw new Error(`Unknown side: ${sideId}`)
  }
}

const add = (a, b, scale = 1) => a.map((value, i) => value + b[i] * scale)
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

// One layer's vertices, triangles counter-clockwise from outside, and texture coordinates from the top-left.
// `bounds` is each side's texture rectangle, so a shader can stop slanted edges sampling their neighbors.
export function layerGeometry(layerId, model = 'classic', { size = 64, inset = 0 } = {}) {
  const positions = []
  const normals = []
  const uvs = []
  const bounds = []
  const indices = []
  for (const part of PARTS) {
    const box = boxOf(part.id, layerId, model)
    for (const sideId of ['front', 'back', 'right', 'left', 'top', 'bottom']) {
      const { corner, across, down, normal } = sideFrame(box, sideId)
      const rect = getFace(part.id, sideId, layerId, model)
      const first = positions.length / 3
      // Top-left, top-right, bottom-right and bottom-left of the texture rectangle.
      const corners = [corner, add(corner, across), add(add(corner, across), down), add(corner, down)]
      const [left, top, right, bottom] = [
        rect.x + inset,
        rect.y + inset,
        rect.x + rect.w - inset,
        rect.y + rect.h - inset,
      ]
      const texels = [
        [left, top],
        [right, top],
        [right, bottom],
        [left, bottom],
      ]
      corners.forEach((point, i) => {
        positions.push(...point)
        normals.push(...normal)
        uvs.push(texels[i][0] / size, texels[i][1] / size)
        bounds.push(left / size, top / size, right / size, bottom / size)
      })
      // Minecraft shows the bottom's texture mirrored, so its corners go round the other way.
      const mirrored = dot(cross(across, down), normal) > 0
      indices.push(...(mirrored ? [0, 1, 2, 0, 2, 3] : [0, 3, 2, 0, 2, 1]).map((i) => first + i))
    }
  }
  return { positions, normals, uvs, bounds, indices }
}

// A flat frame from `inner` to `outer` units outside one side's edges, for outlining the side being edited.
export function frameGeometry(partId, sideId, layerId, model, inner, outer, lift = 0.05) {
  const { corner, across, down, normal } = sideFrame(boxOf(partId, layerId, model), sideId)
  const unitAcross = across.map((value) => value / Math.hypot(...across))
  const unitDown = down.map((value) => value / Math.hypot(...down))
  const base = add(corner, normal, lift)
  // The side's rectangle grown by `by` units, from its top-left corner clockwise.
  const ring = (by) => {
    const topLeft = add(add(base, unitAcross, -by), unitDown, -by)
    const width = Math.hypot(...across) + 2 * by
    const height = Math.hypot(...down) + 2 * by
    return [
      topLeft,
      add(topLeft, unitAcross, width),
      add(add(topLeft, unitAcross, width), unitDown, height),
      add(topLeft, unitDown, height),
    ]
  }
  const positions = [...ring(inner), ...ring(outer)].flat()
  // Four strips, each between an inner edge and the matching outer edge.
  const indices = []
  for (let i = 0; i < 4; i += 1) {
    const next = (i + 1) % 4
    indices.push(i, 4 + i, 4 + next, i, 4 + next, next)
  }
  return { positions, indices, normal }
}

const AXES = [
  { min: 'right', max: 'left' },
  { min: 'bottom', max: 'top' },
  { min: 'back', max: 'front' },
]

// Where a ray enters and leaves a box, and through which sides, or null if it misses.
export function rayBox(origin, direction, box) {
  let near = { t: -Infinity, sideId: null }
  let far = { t: Infinity, sideId: null }
  for (let axis = 0; axis < 3; axis += 1) {
    const [low, high] = [box.min[axis], box.max[axis]]
    if (Math.abs(direction[axis]) < 1e-12) {
      if (origin[axis] < low || origin[axis] > high) return null
      continue
    }
    const tLow = (low - origin[axis]) / direction[axis]
    const tHigh = (high - origin[axis]) / direction[axis]
    const [enter, leave] = tLow < tHigh ? [tLow, tHigh] : [tHigh, tLow]
    const enterSide = tLow < tHigh ? AXES[axis].min : AXES[axis].max
    const leaveSide = tLow < tHigh ? AXES[axis].max : AXES[axis].min
    if (enter > near.t) near = { t: enter, sideId: enterSide }
    if (leave < far.t) far = { t: leave, sideId: leaveSide }
  }
  if (near.t > far.t || far.t < 0) return null
  return { enter: near, leave: far }
}

// The column and row of a side that a point on it falls in.
function cellAt(point, frame, face) {
  const offset = add(point, frame.corner, -1)
  const clamp = (n, size) => Math.min(size - 1, Math.max(0, Math.floor(n * size)))
  return {
    col: clamp(dot(offset, frame.across) / dot(frame.across, frame.across), face.w),
    row: clamp(dot(offset, frame.down) / dot(frame.down, frame.down), face.h),
  }
}

// The side and pixel a ray from the camera shows first, or null. Rays pass through transparent outer pixels,
// and the outer layer's inside counts too, since it shows through gaps.
export function pickSpot(pixels, model, { origin, direction }, { showOuter = true } = {}) {
  const hits = []
  for (const layerId of showOuter ? LAYERS : ['base']) {
    for (const part of PARTS) {
      const box = boxOf(part.id, layerId, model)
      const hit = rayBox(origin, direction, box)
      if (!hit) continue
      if (hit.enter.t >= 0) hits.push({ t: hit.enter.t, sideId: hit.enter.sideId, partId: part.id, layerId, box })
      if (layerId === 'outer') hits.push({ t: hit.leave.t, sideId: hit.leave.sideId, partId: part.id, layerId, box })
    }
  }
  hits.sort((a, b) => a.t - b.t)
  for (const { t, sideId, partId, layerId, box } of hits) {
    const face = getFace(partId, sideId, layerId, model)
    const { col, row } = cellAt(add(origin, direction, t), sideFrame(box, sideId), face)
    if (layerId === 'outer' && alphaOf(getCell(pixels, face, col, row)) === 0) continue
    return { face, col, row }
  }
  return null
}

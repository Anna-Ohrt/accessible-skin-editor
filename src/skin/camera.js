import { SKIN_SIZE, faceAt } from './layout.js'
import { alphaOf } from './color.js'

// Camera math and picking for the 3D model, kept apart from WebGL so it can be tested anywhere.
//
// Yaw is where the camera stands around the character, in degrees: 0 is in front of it. The
// character's right is on the viewer's left (-x in skinview3d), so the right side view is -90.
export const VIEW_YAW = { front: 0, right: -90, back: 180, left: 90 }

// Pitch tilts the camera up or down. Dragging can tilt it anywhere up to MAX_PITCH.
export const ANGLES = [
  { id: 'level', pitch: 0 },
  { id: 'above', pitch: 35 },
  { id: 'below', pitch: -35 },
]
export const ANGLE_PITCH = Object.fromEntries(ANGLES.map((angle) => [angle.id, angle.pitch]))
export const MAX_PITCH = 60

// How long the model takes to turn to a chosen view. None when people ask for reduced motion.
export const TURN_MS = 300
export const turnDuration = (reduceMotion) => (reduceMotion ? 0 : TURN_MS)

// Any angle, as the same angle between -180 (not included) and 180.
export function normalizeYaw(yaw) {
  const wrapped = ((((yaw + 180) % 360) + 360) % 360) - 180
  return wrapped === -180 ? 180 : wrapped
}

// The yaw to turn to, going the short way round from where the camera is now.
export const yawToward = (from, to) => from + normalizeYaw(to - from)

function nearest(entries, distance) {
  return entries.reduce((best, entry) => (distance(entry) < distance(best) ? entry : best))
}

// After a drag, the View and Angle choices show whichever is closest to where the camera ended up.
export function nearestView(yaw) {
  return nearest(Object.entries(VIEW_YAW), ([, angle]) => Math.abs(normalizeYaw(yaw - angle)))[0]
}

export function nearestAngle(pitch) {
  return nearest(ANGLES, (angle) => Math.abs(pitch - angle.pitch)).id
}

// A unit vector from the character's center toward the camera.
export function cameraDirection(yaw, pitch) {
  const turn = (yaw * Math.PI) / 180
  const tilt = (pitch * Math.PI) / 180
  return [Math.sin(turn) * Math.cos(tilt), Math.sin(tilt), Math.cos(turn) * Math.cos(tilt)]
}

// The texture pixel at a point on the model. three.js texture coordinates run from 0 to 1, with v
// counting up from the bottom of the image.
export function texelAt(u, v) {
  const clamp = (n) => Math.min(SKIN_SIZE - 1, Math.max(0, n))
  return { x: clamp(Math.floor(u * SKIN_SIZE)), y: clamp(Math.floor((1 - v) * SKIN_SIZE)) }
}

// The side and pixel that a texture pixel belongs to. A fully transparent outer layer pixel gives
// null, so a click passes through it to whatever shows behind it, as it looks on screen.
export function spotAt(pixels, x, y, model) {
  const face = faceAt(x, y, model)
  if (!face) return null
  if (face.layerId === 'outer' && alphaOf(pixels[y * SKIN_SIZE + x]) === 0) return null
  return { face, col: x - face.x, row: y - face.y }
}

// Camera math for the 3D model, kept apart from WebGL so it can be tested anywhere. Yaw is in degrees, 0 in
// front; the character's right is at -x (see model.js), so the right side view is -90.
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
const TURN_MS = 300
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

// Dragging right turns the model's front to the right, and dragging down tilts its top toward you.
const DEGREES_PER_PIXEL = 0.5
export function dragAngles({ yaw, pitch }, dx, dy) {
  const tilted = pitch + dy * DEGREES_PER_PIXEL
  return { yaw: yaw - dx * DEGREES_PER_PIXEL, pitch: Math.max(-MAX_PITCH, Math.min(MAX_PITCH, tilted)) }
}

// A unit vector from the character's center toward the camera.
export function cameraDirection(yaw, pitch) {
  const turn = (yaw * Math.PI) / 180
  const tilt = (pitch * Math.PI) / 180
  return [Math.sin(turn) * Math.cos(tilt), Math.sin(tilt), Math.cos(turn) * Math.cos(tilt)]
}

// The distance fits a sphere around the whole model, hat corners included, with 5% to spare, so it stays
// in view from any angle.
export const FOV_DEGREES = 50
export const DISTANCE = (1.05 * Math.hypot(4.5, 16.5, 4.5)) / Math.sin((FOV_DEGREES * Math.PI) / 360)

export const cameraPosition = (yaw, pitch) => cameraDirection(yaw, pitch).map((value) => value * DISTANCE)

const normalize = (v) => v.map((value) => value / Math.hypot(...v))
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

// The ray from the camera through a point on the picture, where x and y run from -1 to 1 (left to right,
// bottom to top) and `aspect` is the picture's width over its height.
export function pointerRay(yaw, pitch, x, y, aspect) {
  const origin = cameraPosition(yaw, pitch)
  const forward = normalize(origin.map((value) => -value))
  const right = normalize(cross(forward, [0, 1, 0]))
  const up = cross(right, forward)
  const spread = Math.tan((FOV_DEGREES * Math.PI) / 360)
  const direction = normalize(forward.map((value, i) => value + right[i] * x * spread * aspect + up[i] * y * spread))
  return { origin, direction }
}

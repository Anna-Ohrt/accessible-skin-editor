import { describe, expect, it } from 'vitest'
import {
  DISTANCE,
  MAX_PITCH,
  VIEW_YAW,
  cameraDirection,
  dragAngles,
  nearestAngle,
  nearestView,
  normalizeYaw,
  pointerRay,
  turnDuration,
  yawToward,
} from '../src/skin/camera.js'

const close = (values, expected) => values.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 10))

describe('3D camera', () => {
  it('stands in front for the front view, and on the character\u2019s right (the viewer\u2019s left) for the right side', () => {
    close(cameraDirection(VIEW_YAW.front, 0), [0, 0, 1])
    close(cameraDirection(VIEW_YAW.right, 0), [-1, 0, 0])
    close(cameraDirection(VIEW_YAW.back, 0), [0, 0, -1])
    close(cameraDirection(VIEW_YAW.left, 0), [1, 0, 0])
    expect(cameraDirection(0, 35)[1]).toBeGreaterThan(0)
  })

  it('turns the short way round', () => {
    expect(normalizeYaw(270)).toBe(-90)
    expect(normalizeYaw(-180)).toBe(180)
    expect(yawToward(170, -170)).toBe(190)
    expect(yawToward(90, 0)).toBe(0)
  })

  it('names the nearest view and angle after a drag', () => {
    expect(nearestView(10)).toBe('front')
    expect(nearestView(-100)).toBe('right')
    expect(nearestView(-170)).toBe('back')
    expect(nearestView(400)).toBe('front')
    expect(nearestView(80)).toBe('left')
    expect(nearestAngle(50)).toBe('above')
    expect(nearestAngle(-20)).toBe('below')
    expect(nearestAngle(5)).toBe('level')
  })

  it('turns with a drag, and tilts no further than MAX_PITCH', () => {
    expect(dragAngles({ yaw: 0, pitch: 0 }, 20, 10)).toEqual({ yaw: -10, pitch: 5 })
    expect(dragAngles({ yaw: 0, pitch: 50 }, 0, 100).pitch).toBe(MAX_PITCH)
    expect(dragAngles({ yaw: 0, pitch: -50 }, 0, -100).pitch).toBe(-MAX_PITCH)
  })

  it("doesn't animate when people ask for reduced motion", () => {
    expect(turnDuration(true)).toBe(0)
    expect(turnDuration(false)).toBeGreaterThan(0)
  })

  it('sends a ray from the camera through the point under the pointer', () => {
    // The middle of the picture looks straight at the character's center.
    const middle = pointerRay(0, 0, 0, 0, 0.8)
    close(middle.origin, [0, 0, DISTANCE])
    close(middle.direction, [0, 0, -1])
    // The right edge of the picture is toward the viewer's right, which is +x from the front.
    expect(pointerRay(0, 0, 1, 0, 0.8).direction[0]).toBeGreaterThan(0)
    expect(pointerRay(0, 0, 0, 1, 0.8).direction[1]).toBeGreaterThan(0)
    // From the right side view, the viewer's right is the character's front.
    expect(pointerRay(VIEW_YAW.right, 0, 1, 0, 0.8).direction[2]).toBeGreaterThan(0)
  })
})

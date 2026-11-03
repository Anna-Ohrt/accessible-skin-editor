import { describe, expect, it } from 'vitest'
import { getFace } from '../src/skin/layout.js'
import { rgba } from '../src/skin/color.js'
import { createSampleSkin, paintCells } from '../src/skin/pixels.js'
import {
  VIEW_YAW,
  cameraDirection,
  nearestAngle,
  nearestView,
  normalizeYaw,
  spotAt,
  texelAt,
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

  it("doesn't animate when people ask for reduced motion", () => {
    expect(turnDuration(true)).toBe(0)
    expect(turnDuration(false)).toBeGreaterThan(0)
  })
})

describe('picking a spot on the model', () => {
  it('turns texture coordinates into pixels, with v counting up from the bottom', () => {
    expect(texelAt(0, 1)).toEqual({ x: 0, y: 0 })
    expect(texelAt(0.5, 0.5)).toEqual({ x: 32, y: 32 })
    expect(texelAt(1, 0)).toEqual({ x: 63, y: 63 })
  })

  it('finds the side and pixel, and sees through empty outer layer pixels', () => {
    const pixels = createSampleSkin()
    const headFront = getFace('head', 'front', 'base')
    const spot = spotAt(pixels, headFront.x + 2, headFront.y + 4, 'classic')
    expect(spot.face.label).toBe('Head, front, base layer')
    expect([spot.row, spot.col]).toEqual([4, 2])

    const hatFront = getFace('head', 'front', 'outer')
    expect(spotAt(pixels, hatFront.x + 2, hatFront.y + 4, 'classic')).toBeNull()
    const painted = paintCells(pixels, hatFront, [{ col: 2, row: 4 }], rgba(255, 0, 0))
    expect(spotAt(painted, hatFront.x + 2, hatFront.y + 4, 'classic').face.label).toBe('Head, front, outer layer (hat)')

    // The corner of the texture isn't part of any side.
    expect(spotAt(pixels, 0, 0, 'classic')).toBeNull()
  })
})

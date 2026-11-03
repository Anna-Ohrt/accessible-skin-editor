import { describe, expect, it } from 'vitest'
import { PARTS, getFace } from '../src/skin/layout.js'
import { rgba } from '../src/skin/color.js'
import { createSampleSkin, paintCells } from '../src/skin/pixels.js'
import { boxOf, frameGeometry, layerGeometry, pickSpot, rayBox, sideFrame } from '../src/skin/model.js'

const red = rgba(255, 0, 0)
const spot = (found) => found && [found.face.id, found.col, found.row]
const vertex = (geometry, i) => geometry.positions.slice(i * 3, i * 3 + 3)
const minus = (a, b) => a.map((value, i) => value - b[i])
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0)

describe('the 3D character', () => {
  it('stacks the parts from the feet at -16 to the top of the head at 16, with the outer layer a little outside', () => {
    expect(boxOf('head', 'base')).toEqual({ min: [-4, 8, -4], max: [4, 16, 4] })
    expect(boxOf('head', 'outer')).toEqual({ min: [-4.5, 7.5, -4.5], max: [4.5, 16.5, 4.5] })
    expect(boxOf('body', 'base')).toEqual({ min: [-4, -4, -2], max: [4, 8, 2] })
    expect(boxOf('rightLeg', 'base')).toEqual({ min: [-4, -16, -2], max: [0, -4, 2] })
    // The character's right arm is at -x, next to the body, and slim arms are 3 wide.
    expect(boxOf('rightArm', 'base')).toEqual({ min: [-8, -4, -2], max: [-4, 8, 2] })
    expect(boxOf('rightArm', 'base', 'slim')).toEqual({ min: [-7, -4, -2], max: [-4, 8, 2] })
    expect(boxOf('leftArm', 'outer', 'slim')).toEqual({ min: [3.75, -4.25, -2.25], max: [7.25, 8.25, 2.25] })
  })

  it('wraps each side with its own rectangle of the texture, first row and column at the matching corner', () => {
    const geometry = layerGeometry('base')
    expect(geometry.positions).toHaveLength(PARTS.length * 6 * 4 * 3)
    expect(geometry.indices).toHaveLength(PARTS.length * 6 * 6)
    // The head's front comes first: its top-left corner is on the character's right (-x), at the
    // top, and its texture starts at pixel (8, 8).
    expect(vertex(geometry, 0)).toEqual([-4, 16, 4])
    expect(geometry.uvs.slice(0, 2)).toEqual([8 / 64, 8 / 64])
    expect(vertex(geometry, 2)).toEqual([4, 8, 4])
    expect(geometry.uvs.slice(4, 6)).toEqual([16 / 64, 16 / 64])
    // An inset keeps the texture coordinates just inside the rectangle, and every vertex carries
    // its side's bounds, so a renderer never samples the rectangle next to it.
    const inset = layerGeometry('base', 'classic', { inset: 0.01 })
    expect(inset.uvs.slice(0, 2)).toEqual([8.01 / 64, 8.01 / 64])
    expect(inset.uvs.slice(4, 6)).toEqual([15.99 / 64, 15.99 / 64])
    expect(inset.bounds.slice(0, 4)).toEqual([8.01 / 64, 8.01 / 64, 15.99 / 64, 15.99 / 64])
    expect(inset.bounds).toHaveLength((inset.positions.length / 3) * 4)
    expect(inset.positions).toEqual(geometry.positions)
  })

  it('winds every triangle counter-clockwise from outside, including the mirrored bottoms', () => {
    for (const layerId of ['base', 'outer']) {
      const geometry = layerGeometry(layerId, 'slim')
      for (let i = 0; i < geometry.indices.length; i += 3) {
        const [a, b, c] = geometry.indices.slice(i, i + 3).map((index) => vertex(geometry, index))
        const normal = geometry.normals.slice(geometry.indices[i] * 3, geometry.indices[i] * 3 + 3)
        expect(dot(cross(minus(b, a), minus(c, b)), normal)).toBeGreaterThan(0)
      }
    }
  })

  it('frames the side being edited just outside its edges, lifted off the surface', () => {
    const { positions } = frameGeometry('head', 'front', 'base', 'classic', 0, 0.3)
    expect(positions.slice(0, 3)).toEqual([-4, 16, 4.05])
    expect(positions.slice(12, 15).map((value) => Math.round(value * 100) / 100)).toEqual([-4.3, 16.3, 4.05])
  })
})

describe('pointing at the 3D character', () => {
  it('finds where a ray enters and leaves a box, and through which sides', () => {
    const hit = rayBox([0, 12, 50], [0, 0, -1], boxOf('head', 'base'))
    expect(hit.enter).toEqual({ t: 46, sideId: 'front' })
    expect(hit.leave).toEqual({ t: 54, sideId: 'back' })
    expect(rayBox([20, 12, 50], [0, 0, -1], boxOf('head', 'base'))).toBeNull()
  })

  it('sees through a transparent hat to the head, and stops at a painted one', () => {
    const pixels = createSampleSkin()
    const ray = [[0.5, 12.5, 50], [0, 0, -1]]
    expect(spot(pickSpot(pixels, 'classic', ...ray))).toEqual(['head-front-base', 4, 3])
    const painted = paintCells(pixels, getFace('head', 'front', 'outer'), [{ col: 4, row: 3 }], red)
    expect(spot(pickSpot(painted, 'classic', ...ray))).toEqual(['head-front-outer', 4, 3])
    expect(spot(pickSpot(painted, 'classic', ...ray, { showOuter: false }))).toEqual(['head-front-base', 4, 3])
  })

  it('finds tops and bottoms the way their rows and columns are described', () => {
    const pixels = createSampleSkin()
    // Row 1 of a top is at the back, and column 1 on the character's right.
    expect(spot(pickSpot(pixels, 'classic', [-3.5, 50, -3.5], [0, -1, 0]))).toEqual(['head-top-base', 0, 0])
    expect(spot(pickSpot(pixels, 'classic', [-3.5, -50, -1.5], [0, 1, 0]))).toEqual(['rightLeg-bottom-base', 0, 0])
    expect(pickSpot(pixels, 'classic', [30, 0, 50], [0, 0, -1])).toBeNull()
  })

  it('shows the inside of the outer layer through a gap in it', () => {
    // Just above the head, inside the hat: in through the transparent right side, out through
    // the left side, whose painted pixel is seen from inside.
    const hatLeft = getFace('head', 'left', 'outer')
    const pixels = paintCells(createSampleSkin(), hatLeft, [{ col: 4, row: 0 }], red)
    expect(spot(pickSpot(pixels, 'classic', [-50, 16.25, 0], [1, 0, 0]))).toEqual(['head-left-outer', 4, 0])
  })

  it('lands on the pixel that is drawn there, for every pixel the head shows', () => {
    const pixels = createSampleSkin()
    for (const sideId of ['front', 'back', 'right', 'left', 'top']) {
      const face = getFace('head', sideId, 'base')
      const { corner, across, down, normal } = sideFrame(boxOf('head', 'base'), sideId)
      for (let row = 0; row < face.h; row += 1) {
        for (let col = 0; col < face.w; col += 1) {
          const point = corner.map((value, i) => value + across[i] * ((col + 0.5) / face.w) + down[i] * ((row + 0.5) / face.h))
          const origin = point.map((value, i) => value + normal[i] * 30)
          const direction = normal.map((value) => -value)
          expect(spot(pickSpot(pixels, 'classic', origin, direction, { showOuter: false }))).toEqual([face.id, col, row])
        }
      }
    }
  })
})

import { describe, expect, it } from 'vitest'
import { SKIN_SIZE, allFaces, faceAt, getFace } from '../src/skin/layout.js'

const rect = (face) => [face.x, face.y, face.w, face.h]
const area = (faces) => faces.reduce((sum, face) => sum + face.w * face.h, 0)

describe('skin layout', () => {
  it('has the usable pixel counts from the Minecraft Wiki: 1,632 per layer, or 1,568 with slim arms', () => {
    for (const [model, perLayer] of [
      ['classic', 1632],
      ['slim', 1568],
    ]) {
      const faces = allFaces(model)
      expect(area(faces.filter((face) => face.layerId === 'base'))).toBe(perLayer)
      expect(area(faces.filter((face) => face.layerId === 'outer'))).toBe(perLayer)
    }
  })

  it('keeps every side inside the 64 by 64 texture, with no two sides sharing a pixel', () => {
    for (const model of ['classic', 'slim']) {
      const owner = new Map()
      for (const face of allFaces(model)) {
        expect(face.x >= 0 && face.y >= 0 && face.x + face.w <= SKIN_SIZE && face.y + face.h <= SKIN_SIZE).toBe(true)
        for (let y = face.y; y < face.y + face.h; y += 1) {
          for (let x = face.x; x < face.x + face.w; x += 1) {
            const key = `${x},${y}`
            expect(owner.get(key), `${face.label} overlaps ${owner.get(key)} at ${key}`).toBeUndefined()
            owner.set(key, face.label)
          }
        }
      }
    }
  })

  it("puts each part's front where skinview3d maps it, on both layers", () => {
    const front = (partId, layerId, model) => rect(getFace(partId, 'front', layerId, model))
    expect(front('head', 'base')).toEqual([8, 8, 8, 8])
    expect(front('head', 'outer')).toEqual([40, 8, 8, 8])
    expect(front('body', 'base')).toEqual([20, 20, 8, 12])
    expect(front('body', 'outer')).toEqual([20, 36, 8, 12])
    expect(front('rightArm', 'base')).toEqual([44, 20, 4, 12])
    expect(front('rightArm', 'outer')).toEqual([44, 36, 4, 12])
    expect(front('rightArm', 'base', 'slim')).toEqual([44, 20, 3, 12])
    expect(front('leftArm', 'base')).toEqual([36, 52, 4, 12])
    expect(front('leftArm', 'outer')).toEqual([52, 52, 4, 12])
    expect(front('rightLeg', 'base')).toEqual([4, 20, 4, 12])
    expect(front('rightLeg', 'outer')).toEqual([4, 36, 4, 12])
    expect(front('leftLeg', 'base')).toEqual([20, 52, 4, 12])
    expect(front('leftLeg', 'outer')).toEqual([4, 52, 4, 12])
  })

  it('unwraps each box as top and bottom, then right side, front, left side and back', () => {
    const head = (sideId) => rect(getFace('head', sideId, 'base'))
    expect(head('top')).toEqual([8, 0, 8, 8])
    expect(head('bottom')).toEqual([16, 0, 8, 8])
    expect(head('right')).toEqual([0, 8, 8, 8])
    expect(head('front')).toEqual([8, 8, 8, 8])
    expect(head('left')).toEqual([16, 8, 8, 8])
    expect(head('back')).toEqual([24, 8, 8, 8])

    const slimArm = (sideId) => rect(getFace('rightArm', sideId, 'base', 'slim'))
    expect(slimArm('top')).toEqual([44, 16, 3, 4])
    expect(slimArm('bottom')).toEqual([47, 16, 3, 4])
    expect(slimArm('right')).toEqual([40, 20, 4, 12])
    expect(slimArm('front')).toEqual([44, 20, 3, 12])
    expect(slimArm('left')).toEqual([47, 20, 4, 12])
    expect(slimArm('back')).toEqual([51, 20, 3, 12])
  })

  it('names each side and says which way its rows and columns run', () => {
    const sleeve = getFace('rightArm', 'right', 'outer')
    expect(sleeve.label).toBe('Right arm, right side, outer layer (right sleeve)')
    expect(sleeve.orientation).toBe('Column 1 is at the back and column 4 is at the front.')
    expect(getFace('head', 'left', 'base').orientation).toBe('Column 1 is at the front and column 8 is at the back.')
    expect(getFace('head', 'front', 'base').orientation).toBe(
      "Seen from the front, so column 1 is on the character's right and column 8 is on their left.",
    )
    expect(getFace('head', 'top', 'outer').orientation).toBe(
      "Seen from above. Row 1 is at the back and row 8 is at the front. Column 1 is on the character's right.",
    )
  })

  it('finds the side under a texture pixel, and nothing in the unused areas', () => {
    expect(faceAt(10, 10).id).toBe('head-front-base')
    expect(faceAt(42, 10).id).toBe('head-front-outer')
    expect(faceAt(0, 0)).toBeNull()
    expect(faceAt(50, 25, 'classic').id).toBe('rightArm-left-base')
    expect(faceAt(55, 25, 'classic').id).toBe('rightArm-back-base')
    // Slim arms leave the rightmost column of each arm area unused.
    expect(faceAt(55, 25, 'slim')).toBeNull()
  })
})

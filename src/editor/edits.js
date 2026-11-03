import { TRANSPARENT, isOpaque, isTransparent } from '../skin/color.js'
import { allFaces } from '../skin/layout.js'
import {
  copyFace,
  countSeeThrough,
  createPlainSkin,
  createSampleSkin,
  fillFace,
  floodFill,
  getCell,
  mirrorFace,
  paintCells,
} from '../skin/pixels.js'

// A plan is a message to announce, and for a real change, a function from the current pixels to the
// new ones plus its undo label. Messages and labels are ids with values, so any language can say them.
const say = (id, values) => ({ message: { id, values } })
const refuse = (id) => ({ message: { id }, refused: true })
const change = (apply, label, id, values) => ({ change: apply, label, message: { id, values } })

// Java Edition forces the base layer to be fully opaque (Minecraft Wiki, Skin).
const needsSolid = (face, color) => face.layerId === 'base' && !isOpaque(color)

export function planEdit(action, { pixels, face, model, color }) {
  switch (action.type) {
    case 'paint': {
      const { cells } = action
      if (needsSolid(face, color)) return refuse('status.paintNeedsSolid')
      if (paintCells(pixels, face, cells, color) === pixels) return say('status.already')
      return change((current) => paintCells(current, face, cells, color), { id: 'action.painting' }, 'status.painted')
    }
    case 'erase': {
      const cells = [{ col: action.col, row: action.row }]
      if (face.layerId === 'base') return refuse('status.eraseNeedsOuter')
      if (isTransparent(getCell(pixels, face, action.col, action.row))) return say('status.alreadyTransparent')
      return change(
        (current) => paintCells(current, face, cells, TRANSPARENT),
        { id: 'action.erasing' },
        'status.erased',
      )
    }
    case 'fill': {
      const { col, row } = action
      if (needsSolid(face, color)) return refuse('status.paintNeedsSolid')
      const { count } = floodFill(pixels, face, col, row, color)
      if (count === 0) return say('status.alreadyFilled')
      const label = { id: 'action.filling', values: { count } }
      return change((current) => floodFill(current, face, col, row, color).pixels, label, 'status.filled', { count })
    }
    case 'fillSide': {
      if (needsSolid(face, color)) return refuse('status.paintNeedsSolid')
      const { count } = fillFace(pixels, face, color)
      if (count === 0) return say('status.sideAlready')
      const label = { id: 'action.fillingSide' }
      return change((current) => fillFace(current, face, color).pixels, label, 'status.filledSide', { count })
    }
    case 'clearSide': {
      const { count } = fillFace(pixels, face, TRANSPARENT)
      if (count === 0) return say('status.sideEmpty')
      const label = { id: 'action.clearingSide' }
      return change((current) => fillFace(current, face, TRANSPARENT).pixels, label, 'status.cleared', { count })
    }
    case 'mirror': {
      const { from } = action
      if (mirrorFace(pixels, face, from) === pixels) return say('status.halvesMatch')
      const label = { id: 'action.mirroring', values: { from } }
      return change((current) => mirrorFace(current, face, from), label, 'status.mirrored', { from })
    }
    case 'copy': {
      const { target, flip } = action
      if (copyFace(pixels, face, target, { flip }) === pixels) {
        return say(target.layerId === 'base' ? 'status.copyNoChangeBase' : 'status.copyNoChange', { target })
      }
      const label = { id: 'action.copying', values: { target } }
      const id = flip ? 'status.copiedFlipped' : 'status.copied'
      return change((current) => copyFace(current, face, target, { flip }), label, id, { target })
    }
    case 'open': {
      const { skin, file } = action
      const count = countSeeThrough(
        skin,
        allFaces(model).filter((item) => item.layerId === 'base'),
      )
      const label = { id: 'action.opening', values: { file } }
      return change(() => skin, label, count ? 'status.openedSeeThrough' : 'status.opened', { file, count })
    }
    case 'startOver':
      return change(() => createSampleSkin(), { id: 'action.startingOver' }, 'status.startedOver')
    case 'startPlain':
      if (!isOpaque(color)) return refuse('status.plainNeedsSolid')
      return change(() => createPlainSkin(color), { id: 'action.startingPlain' }, 'status.startedPlain')
    default:
      throw new Error(`Unknown edit: ${action.type}`)
  }
}

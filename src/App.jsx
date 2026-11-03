import { useCallback, useEffect, useReducer, useState } from 'react'
import { allFaces, getFace } from './skin/layout.js'
import { TRANSPARENT, capitalize, describeColor, isOpaque, isTransparent, nameColor, uniqueName } from './skin/color.js'
import {
  columnOf,
  copyFace,
  countSeeThrough,
  createPlainSkin,
  createSamplePalette,
  createSampleSkin,
  describeLine,
  fillFace,
  floodFill,
  getCell,
  mirrorFace,
  paintCells,
  rowOf,
} from './skin/pixels.js'
import { downloadSkin, readSkinFile } from './skin/png.js'
import { historyReducer, initHistory } from './editor/history.js'
import { useAnnouncer } from './editor/useAnnouncer.js'
import { loadDraft, saveDraft } from './editor/storage.js'
import FacePicker from './components/FacePicker.jsx'
import { ColorForms, PaintColors } from './components/Palette.jsx'
import PixelGrid from './components/PixelGrid.jsx'
import Tools from './components/Tools.jsx'
import FaceDescription from './components/FaceDescription.jsx'
import Preview from './components/Preview.jsx'
import TextureMap from './components/TextureMap.jsx'
import FilePanel from './components/FilePanel.jsx'
import Settings from './components/Settings.jsx'
import { DEFAULT_SETTINGS } from './editor/settings.js'
import Shortcuts from './components/Shortcuts.jsx'

// From the Minecraft Wiki's Skin page: "In Java Edition, the skin's inner layer is forced to be
// fully opaque."
const BASE_IS_OPAQUE = "The base layer can't be see-through in Java Edition."

const plural = (count, word) => `${count.toLocaleString('en-US')} ${word}${count === 1 ? '' : 's'}`
let idCount = 0
const newColorId = () => `custom-${Date.now().toString(36)}-${(idCount += 1)}`

export default function App() {
  const [draft] = useState(loadDraft)
  const [model, setModel] = useState(draft?.model ?? 'classic')
  const [palette, setPalette] = useState(() => draft?.palette ?? createSamplePalette())
  const [currentColor, setCurrentColor] = useState(() => draft?.currentColor ?? palette[0].color)
  const [history, dispatch] = useReducer(historyReducer, null, () => initHistory(draft?.pixels ?? createSampleSkin()))
  const [selection, setSelection] = useState({ partId: 'head', sideId: 'front', layerId: 'base' })
  const [settings, setSettings] = useState(() => draft?.settings ?? DEFAULT_SETTINGS)
  const [fileError, setFileError] = useState('')
  const [cursorRequest, setCursorRequest] = useState(null)
  const [status, announce] = useAnnouncer()

  const { pixels } = history
  const face = getFace(selection.partId, selection.sideId, selection.layerId, model)
  const nameOf = useCallback((color) => nameColor(color, palette, { sayHex: settings.sayHex }), [palette, settings.sayHex])
  const paintName = nameColor(currentColor, palette)

  useEffect(() => {
    saveDraft({ pixels, palette, model, currentColor, settings })
  }, [pixels, palette, model, currentColor, settings])

  const apply = (change, label, stroke) => dispatch({ type: 'apply', change, label, stroke })

  function canPaintWith(color) {
    if (face.layerId === 'base' && !isOpaque(color)) {
      announce(`${BASE_IS_OPAQUE} Choose a solid paint color, or switch to the outer layer.`)
      return false
    }
    return true
  }

  function paint({ cells, source, stroke }) {
    if (!canPaintWith(currentColor)) return
    // Pointer users see the change. Keyboard and screen reader users hear it.
    const speak = source === 'keyboard' || source === 'click'
    if (paintCells(pixels, face, cells, currentColor) === pixels) {
      if (speak) announce(`Already ${paintName}.`)
      return
    }
    apply((current) => paintCells(current, face, cells, currentColor), 'painting', stroke)
    if (speak) announce(`Painted ${paintName}.`)
  }

  function erase(col, row) {
    if (face.layerId === 'base') {
      announce(`${BASE_IS_OPAQUE} Paint over this pixel instead, or switch to the outer layer.`)
      return
    }
    if (isTransparent(getCell(pixels, face, col, row))) {
      announce('Already transparent.')
      return
    }
    apply((current) => paintCells(current, face, [{ col, row }], TRANSPARENT), 'erasing')
    announce('Erased.')
  }

  function fill(col, row) {
    if (!canPaintWith(currentColor)) return
    const { count } = floodFill(pixels, face, col, row, currentColor)
    if (count === 0) {
      announce(`These pixels are already ${paintName}.`)
      return
    }
    apply((current) => floodFill(current, face, col, row, currentColor).pixels, `filling ${plural(count, 'pixel')}`)
    announce(`Filled ${plural(count, 'pixel')} with ${paintName}.`)
  }

  function pickColor(color) {
    if (isTransparent(color)) {
      announce("This pixel is transparent, so there's no color to pick up.")
      return
    }
    let entry = palette.find((item) => item.color === color)
    if (!entry) {
      entry = { id: newColorId(), name: uniqueName(describeColor(color), palette), color }
      setPalette((items) => [...items, entry])
    }
    setCurrentColor(color)
    announce(`Picked up ${entry.name}. It's the paint color now.`)
  }

  function undo() {
    const last = history.past.at(-1)
    if (!last) {
      announce('Nothing to undo.')
      return
    }
    dispatch({ type: 'undo' })
    announce(`Undid ${last.label}.`)
  }

  function redo() {
    const next = history.future[0]
    if (!next) {
      announce('Nothing to redo.')
      return
    }
    dispatch({ type: 'redo' })
    announce(`Redid ${next.label}.`)
  }

  function handleGridAction(action) {
    switch (action.type) {
      case 'paint':
        return paint(action)
      case 'erase':
        return erase(action.col, action.row)
      case 'fill':
        return fill(action.col, action.row)
      case 'pick':
        return pickColor(getCell(pixels, face, action.col, action.row))
      case 'readRow':
        return announce(`Row ${action.row + 1}, left to right: ${describeLine(rowOf(pixels, face, action.row), nameOf)}.`)
      case 'readColumn':
        return announce(`Column ${action.col + 1}, top to bottom: ${describeLine(columnOf(pixels, face, action.col), nameOf)}.`)
      case 'edge':
        return announce(`${action.edge} edge.`)
      case 'undo':
        return undo()
      case 'redo':
        return redo()
      default:
        return undefined
    }
  }

  function handleTool(tool) {
    switch (tool.type) {
      case 'fillSide': {
        if (!canPaintWith(currentColor)) return
        const { count } = fillFace(pixels, face, currentColor)
        if (count === 0) {
          announce(`This side is already all ${paintName}.`)
          return
        }
        apply((current) => fillFace(current, face, currentColor).pixels, 'filling the side')
        announce(`Filled the whole side with ${paintName}. ${capitalize(plural(count, 'pixel'))} changed.`)
        return
      }
      case 'clearSide': {
        const { count } = fillFace(pixels, face, TRANSPARENT)
        if (count === 0) {
          announce('This side is already empty.')
          return
        }
        apply((current) => fillFace(current, face, TRANSPARENT).pixels, 'clearing the side')
        announce(`Cleared this side. ${capitalize(plural(count, 'pixel'))} are transparent now.`)
        return
      }
      case 'mirror': {
        const other = tool.from === 'left' ? 'right' : 'left'
        if (mirrorFace(pixels, face, tool.from) === pixels) {
          announce('The two halves already match.')
          return
        }
        apply((current) => mirrorFace(current, face, tool.from), `mirroring the ${tool.from} half`)
        announce(`Copied the ${tool.from} half onto the ${other} half, flipped.`)
        return
      }
      case 'copy': {
        const { target, flip } = tool
        if (copyFace(pixels, face, target, { flip }) === pixels) {
          announce(
            target.layerId === 'base'
              ? `Nothing changed. Transparent pixels aren't copied onto the base layer, and the rest already match ${target.label}.`
              : `Nothing changed. ${target.label} already matches.`,
          )
          return
        }
        apply((current) => copyFace(current, face, target, { flip }), `copying to ${target.label}`)
        announce(`Copied this side to ${target.label}${flip ? ', flipped' : ''}.`)
        return
      }
      case 'undo':
        return undo()
      case 'redo':
        return redo()
      default:
        return undefined
    }
  }

  async function openFile(file) {
    try {
      const next = await readSkinFile(file)
      setFileError('')
      apply(() => next, `opening ${file.name}`)
      const baseFaces = allFaces(model).filter((item) => item.layerId === 'base')
      const seeThrough = countSeeThrough(next, baseFaces)
      const note = seeThrough
        ? ` ${capitalize(plural(seeThrough, 'base layer pixel'))} ${seeThrough === 1 ? 'is' : 'are'} see-through, but Java Edition makes the base layer fully opaque.`
        : ''
      announce(`Opened ${file.name}.${note} Undo brings back the skin you had.`)
    } catch (error) {
      setFileError(error.message)
    }
  }

  async function download() {
    try {
      await downloadSkin(pixels)
      setFileError('')
      announce('Downloaded skin.png.')
    } catch (error) {
      setFileError(error.message)
    }
  }

  function startOver() {
    apply(() => createSampleSkin(), 'starting over')
    announce('Started over with the sample skin. Undo brings back the skin you had.')
  }

  function startPlain() {
    if (!isOpaque(currentColor)) {
      announce(`${BASE_IS_OPAQUE} Choose a solid paint color first.`)
      return
    }
    apply(() => createPlainSkin(currentColor), 'starting a plain skin')
    announce(`Started a plain skin in ${paintName}. Undo brings back the skin you had.`)
  }

  function addColor(color, name) {
    const existing = palette.find((item) => item.color === color)
    if (existing) {
      setCurrentColor(color)
      announce(`That color is already in the palette as ${existing.name}. It's the paint color now.`)
      return
    }
    const entry = { id: newColorId(), name: name || uniqueName(describeColor(color), palette), color }
    setPalette((items) => [...items, entry])
    setCurrentColor(color)
    announce(`Added ${entry.name}. It's the paint color now.`)
  }

  function renameColor(id, name) {
    const entry = palette.find((item) => item.id === id)
    setPalette((items) => items.map((item) => (item.id === id ? { ...item, name } : item)))
    announce(`Renamed ${entry.name} to ${name}.`)
  }

  function pickFace(found) {
    setSelection({ partId: found.partId, sideId: found.sideId, layerId: found.layerId })
    announce(`Editing ${found.label}.`)
  }

  // A click on the 3D model opens that side in the grid, with the cursor on that pixel.
  function pickSpot({ face: found, col, row }) {
    setSelection({ partId: found.partId, sideId: found.sideId, layerId: found.layerId })
    setCursorRequest({ col, row })
    announce(`Editing ${found.label}, at row ${row + 1}, column ${col + 1}.`)
  }

  return (
    <>
      <a className="skip-link" href="#pixels-heading">
        Skip to the pixels
      </a>
      <header className="app-header">
        <h1>Skin editor prototype</h1>
        <p>
          A prototype for editing a Minecraft skin with a keyboard, a screen reader, a mouse or touch. The sample skin
          and its colors are made up for it.
        </p>
        <p className="disclaimer">Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.</p>
      </header>
      <main className="layout">
        <div className="column">
          <section className="panel" aria-labelledby="choose-heading">
            <h2 id="choose-heading">Choose what to edit</h2>
            <FacePicker
              selection={selection}
              model={model}
              onChange={(change) => setSelection((current) => ({ ...current, ...change }))}
              onModelChange={setModel}
            />
          </section>
        </div>

        <div className="column">
          <section className="panel" aria-labelledby="pixels-heading">
            <h2 id="pixels-heading" tabIndex={-1}>
              Pixels: {face.label}
            </h2>
            <p id="grid-orientation" className="hint">
              {face.w} by {face.h} pixels. {face.orientation}
            </p>
            <p id="grid-help" className="hint">
              Arrow keys move. Space paints, and Shift with an arrow paints as you move. F fills, I picks up a color, and
              R or C reads a row or column. Tab goes to the paint colors. All the keys are listed under Keyboard
              shortcuts.
            </p>
            <PixelGrid
              face={face}
              pixels={pixels}
              nameOf={nameOf}
              sayPosition={settings.sayPosition}
              cellSize={settings.cellSize}
              showGridLines={settings.showGridLines}
              describedBy="grid-orientation grid-help"
              cursorRequest={cursorRequest}
              onAction={handleGridAction}
            />
            <p role="status" className="status">
              {status}
            </p>
            <PaintColors palette={palette} currentColor={currentColor} onSelect={setCurrentColor} />
          </section>
          <section className="panel" aria-labelledby="tools-heading">
            <h2 id="tools-heading">Tools</h2>
            <Tools
              face={face}
              model={model}
              paintName={paintName}
              canUndo={history.past.length > 0}
              canRedo={history.future.length > 0}
              onTool={handleTool}
            />
          </section>
          <section className="panel" aria-labelledby="words-heading">
            <h2 id="words-heading">This side in words</h2>
            <FaceDescription pixels={pixels} face={face} nameOf={nameOf} />
          </section>
        </div>

        <div className="column">
          <section className="panel" aria-labelledby="preview-heading">
            <h2 id="preview-heading">Preview</h2>
            <Preview pixels={pixels} model={model} nameOf={nameOf} face={face} onPickSpot={pickSpot} />
          </section>
          <section className="panel" aria-labelledby="texture-heading">
            <h2 id="texture-heading">Texture</h2>
            <TextureMap pixels={pixels} face={face} model={model} onPickFace={pickFace} />
          </section>
          <section className="panel" aria-labelledby="colors-heading">
            <h2 id="colors-heading">Add or rename colors</h2>
            <ColorForms palette={palette} currentColor={currentColor} onAdd={addColor} onRename={renameColor} />
          </section>
          <section className="panel" aria-labelledby="file-heading">
            <h2 id="file-heading">File</h2>
            <FilePanel
              error={fileError}
              paintName={paintName}
              onOpen={openFile}
              onDownload={download}
              onStartOver={startOver}
              onPlain={startPlain}
            />
          </section>
          <section className="panel" aria-labelledby="settings-heading">
            <h2 id="settings-heading">Settings</h2>
            <Settings settings={settings} onChange={(change) => setSettings((current) => ({ ...current, ...change }))} />
          </section>
          <section className="panel" aria-labelledby="keys-heading">
            <h2 id="keys-heading">Keyboard shortcuts</h2>
            <Shortcuts />
          </section>
        </div>
      </main>
      <footer className="app-footer">
        <p>
          Made by Anna Ohrt. Code and research:{' '}
          <a href="https://github.com/Anna-Ohrt/accessible-skin-editor">github.com/Anna-Ohrt/accessible-skin-editor</a>.
          Open source software used here, with its licenses:{' '}
          <a href="https://anna-ohrt.github.io/accessible-skin-editor/third-party-notices.txt">third-party notices</a>.
        </p>
      </footer>
    </>
  )
}

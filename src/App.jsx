import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useI18n } from './i18n/context.js'
import { actionText, colorNamer, describeLine, faceLabel, faceOrientation, paletteNames } from './i18n/words.js'
import { allFaces, getFace } from './skin/layout.js'
import { TRANSPARENT, isOpaque, isTransparent } from './skin/color.js'
import {
  columnOf,
  copyFace,
  countSeeThrough,
  createPlainSkin,
  createSamplePalette,
  createSampleSkin,
  fillFace,
  floodFill,
  getCell,
  mirrorFace,
  paintCells,
  rowOf,
} from './skin/pixels.js'
import { SkinFileError, downloadSkin, readSkinFile } from './skin/png.js'
import { historyReducer, initHistory } from './editor/history.js'
import { useAnnouncer } from './editor/useAnnouncer.js'
import { createSaver, loadDraft } from './editor/storage.js'
import { DEFAULT_SETTINGS } from './editor/settings.js'
import FacePicker from './components/FacePicker.jsx'
import { ColorForms, PaintColors } from './components/Palette.jsx'
import PixelGrid from './components/PixelGrid.jsx'
import Tools from './components/Tools.jsx'
import FaceDescription from './components/FaceDescription.jsx'
import Preview from './components/Preview.jsx'
import TextureMap from './components/TextureMap.jsx'
import FilePanel, { SKIN_FILE_NAME } from './components/FilePanel.jsx'
import Settings from './components/Settings.jsx'
import Shortcuts from './components/Shortcuts.jsx'

const REPO_URL = 'https://github.com/Anna-Ohrt/accessible-skin-editor'
const NOTICES_URL = 'https://anna-ohrt.github.io/accessible-skin-editor/third-party-notices.txt'

let idCount = 0
const newColorId = () => `custom-${Date.now().toString(36)}-${(idCount += 1)}`

export default function App() {
  const i18n = useI18n()
  const { t } = i18n
  const [draft] = useState(loadDraft)
  const [model, setModel] = useState(draft?.model ?? 'classic')
  const [palette, setPalette] = useState(() => draft?.palette ?? createSamplePalette())
  const [currentColor, setCurrentColor] = useState(() => draft?.currentColor ?? palette[0].color)
  const [history, dispatch] = useReducer(historyReducer, null, () => initHistory(draft?.pixels ?? createSampleSkin()))
  const [selection, setSelection] = useState({ partId: 'head', sideId: 'front', layerId: 'base' })
  const [settings, setSettings] = useState(() => draft?.settings ?? DEFAULT_SETTINGS)
  const [fileError, setFileError] = useState(null)
  const [cursorRequest, setCursorRequest] = useState(null)
  const [status, announce] = useAnnouncer(t('status.first'))
  const [saver] = useState(createSaver)
  const openCount = useRef(0)

  const { pixels } = history
  const { partId, sideId, layerId } = selection
  const face = useMemo(() => getFace(partId, sideId, layerId, model), [partId, sideId, layerId, model])
  const faceName = faceLabel(i18n, face)
  const names = useMemo(() => paletteNames(i18n, palette), [i18n, palette])
  const nameOf = useMemo(() => colorNamer(i18n, palette, names, { sayHex: settings.sayHex }), [i18n, palette, names, settings.sayHex])
  const plainNameOf = useMemo(() => colorNamer(i18n, palette, names), [i18n, palette, names])
  const paintName = plainNameOf(currentColor)

  useEffect(() => {
    saver.schedule({ pixels, palette, model, currentColor, settings })
  }, [saver, pixels, palette, model, currentColor, settings])

  // Saves at once when the page is hidden or closed, or the editor goes away, so the last change
  // before that isn't lost.
  useEffect(() => {
    const flush = () => saver.flush()
    const flushIfHidden = () => {
      if (document.visibilityState === 'hidden') saver.flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', flushIfHidden)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', flushIfHidden)
      saver.flush()
    }
  }, [saver])

  // An undo step's label is a message id and values, so Undo and Redo speak the editor's language.
  const apply = (change, label, stroke) => dispatch({ type: 'apply', change, label, stroke })

  function canPaintWith(color) {
    if (face.layerId === 'base' && !isOpaque(color)) {
      announce(t('status.paintNeedsSolid'))
      return false
    }
    return true
  }

  function paint({ cells, source, stroke }) {
    if (!canPaintWith(currentColor)) return
    // Pointer users see the change. Keyboard and screen reader users hear it.
    const speak = source === 'keyboard' || source === 'click'
    if (paintCells(pixels, face, cells, currentColor) === pixels) {
      if (speak) announce(t('status.already', { color: paintName }))
      return
    }
    apply((current) => paintCells(current, face, cells, currentColor), { id: 'action.painting' }, stroke)
    if (speak) announce(t('status.painted', { color: paintName }))
  }

  function erase(col, row) {
    if (face.layerId === 'base') {
      announce(t('status.eraseNeedsOuter'))
      return
    }
    if (isTransparent(getCell(pixels, face, col, row))) {
      announce(t('status.alreadyTransparent'))
      return
    }
    apply((current) => paintCells(current, face, [{ col, row }], TRANSPARENT), { id: 'action.erasing' })
    announce(t('status.erased'))
  }

  function fill(col, row) {
    if (!canPaintWith(currentColor)) return
    const { count } = floodFill(pixels, face, col, row, currentColor)
    if (count === 0) {
      announce(t('status.alreadyFilled', { color: paintName }))
      return
    }
    apply((current) => floodFill(current, face, col, row, currentColor).pixels, { id: 'action.filling', values: { count } })
    announce(t('status.filled', { count, color: paintName }))
  }

  // A color that isn't in the palette yet is added, named by how it looks.
  function addToPalette(entry) {
    setPalette((items) => [...items, entry])
    return paletteNames(i18n, [...palette, entry]).get(entry.id)
  }

  function pickColor(color) {
    if (isTransparent(color)) {
      announce(t('status.nothingToPick'))
      return
    }
    const entry = palette.find((item) => item.color === color)
    const name = entry ? names.get(entry.id) : addToPalette({ id: newColorId(), name: null, color })
    setCurrentColor(color)
    announce(t('status.picked', { color: name }))
  }

  function undo() {
    const last = history.past.at(-1)
    if (!last) {
      announce(t('status.nothingToUndo'))
      return
    }
    dispatch({ type: 'undo' })
    announce(t('status.undid', { action: actionText(i18n, last.label) }))
  }

  function redo() {
    const next = history.future[0]
    if (!next) {
      announce(t('status.nothingToRedo'))
      return
    }
    dispatch({ type: 'redo' })
    announce(t('status.redid', { action: actionText(i18n, next.label) }))
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
        return announce(
          t('status.readRow', { row: action.row + 1, line: describeLine(i18n, rowOf(pixels, face, action.row), nameOf) }),
        )
      case 'readColumn':
        return announce(
          t('status.readColumn', { col: action.col + 1, line: describeLine(i18n, columnOf(pixels, face, action.col), nameOf) }),
        )
      case 'edge':
        return announce(t('status.edge', { edge: action.edge }))
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
          announce(t('status.sideAlready', { color: paintName }))
          return
        }
        apply((current) => fillFace(current, face, currentColor).pixels, { id: 'action.fillingSide' })
        announce(t('status.filledSide', { color: paintName, count }))
        return
      }
      case 'clearSide': {
        const { count } = fillFace(pixels, face, TRANSPARENT)
        if (count === 0) {
          announce(t('status.sideEmpty'))
          return
        }
        apply((current) => fillFace(current, face, TRANSPARENT).pixels, { id: 'action.clearingSide' })
        announce(t('status.cleared', { count }))
        return
      }
      case 'mirror': {
        if (mirrorFace(pixels, face, tool.from) === pixels) {
          announce(t('status.halvesMatch'))
          return
        }
        apply((current) => mirrorFace(current, face, tool.from), { id: 'action.mirroring', values: { from: tool.from } })
        announce(t('status.mirrored', { from: tool.from }))
        return
      }
      case 'copy': {
        const { target, flip } = tool
        const targetName = faceLabel(i18n, target)
        if (copyFace(pixels, face, target, { flip }) === pixels) {
          announce(t(target.layerId === 'base' ? 'status.copyNoChangeBase' : 'status.copyNoChange', { target: targetName }))
          return
        }
        apply((current) => copyFace(current, face, target, { flip }), { id: 'action.copying', target })
        announce(t(flip ? 'status.copiedFlipped' : 'status.copied', { target: targetName }))
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
    // Opening is asynchronous. If another file is chosen before this one finishes, only the newer
    // one counts, whichever finishes first.
    const request = (openCount.current += 1)
    try {
      const next = await readSkinFile(file)
      if (request !== openCount.current) return
      setFileError(null)
      apply(() => next, { id: 'action.opening', values: { file: file.name } })
      const seeThrough = countSeeThrough(next, allFaces(model).filter((item) => item.layerId === 'base'))
      announce(
        seeThrough
          ? t('status.openedSeeThrough', { file: file.name, count: seeThrough })
          : t('status.opened', { file: file.name }),
      )
    } catch (error) {
      if (request !== openCount.current) return
      setFileError(error instanceof SkinFileError ? error : new SkinFileError('unreadable'))
    }
  }

  async function download() {
    try {
      await downloadSkin(pixels, SKIN_FILE_NAME)
      setFileError(null)
      announce(t('status.downloaded', { file: SKIN_FILE_NAME }))
    } catch (error) {
      setFileError(error instanceof SkinFileError ? error : new SkinFileError('save'))
    }
  }

  function startOver() {
    apply(() => createSampleSkin(), { id: 'action.startingOver' })
    announce(t('status.startedOver'))
  }

  function startPlain() {
    if (!isOpaque(currentColor)) {
      announce(t('status.plainNeedsSolid'))
      return
    }
    apply(() => createPlainSkin(currentColor), { id: 'action.startingPlain' })
    announce(t('status.startedPlain', { color: paintName }))
  }

  function addColor(color, name) {
    const existing = palette.find((item) => item.color === color)
    setCurrentColor(color)
    if (existing) {
      announce(t('status.colorExists', { color: names.get(existing.id) }))
      return
    }
    announce(t('status.added', { color: addToPalette({ id: newColorId(), name, color }) }))
  }

  function renameColor(id, name) {
    setPalette((items) => items.map((item) => (item.id === id ? { ...item, name } : item)))
    announce(t('status.renamed', { from: names.get(id), to: name }))
  }

  function pickFace(found) {
    setSelection({ partId: found.partId, sideId: found.sideId, layerId: found.layerId })
    announce(t('status.editing', { face: faceLabel(i18n, found) }))
  }

  // A click on the 3D model opens that side in the grid, with the cursor on that pixel.
  function pickSpot({ face: found, col, row }) {
    setSelection({ partId: found.partId, sideId: found.sideId, layerId: found.layerId })
    setCursorRequest({ col, row })
    announce(t('status.editingAt', { face: faceLabel(i18n, found), row: row + 1, col: col + 1 }))
  }

  return (
    <>
      <a className="skip-link" href="#pixels-heading">
        {t('app.skip')}
      </a>
      <header className="app-header">
        <h1>{t('app.title')}</h1>
        <p>{t('app.intro')}</p>
        <p className="disclaimer">{t('app.disclaimer')}</p>
      </header>
      <main className="layout">
        <div className="column">
          <section className="panel" aria-labelledby="choose-heading">
            <h2 id="choose-heading">{t('heading.choose')}</h2>
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
              {t('heading.pixels', { face: faceName })}
            </h2>
            <p id="grid-orientation" className="hint">
              {t('grid.size', { w: face.w, h: face.h, orientation: faceOrientation(i18n, face) })}
            </p>
            <p id="grid-help" className="hint">
              {t('grid.help')}
            </p>
            <PixelGrid
              face={face}
              label={faceName}
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
            <PaintColors palette={palette} names={names} currentColor={currentColor} onSelect={setCurrentColor} />
          </section>
          <section className="panel" aria-labelledby="tools-heading">
            <h2 id="tools-heading">{t('heading.tools')}</h2>
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
            <h2 id="words-heading">{t('heading.words')}</h2>
            <FaceDescription pixels={pixels} face={face} nameOf={nameOf} />
          </section>
        </div>

        <div className="column">
          <section className="panel" aria-labelledby="preview-heading">
            <h2 id="preview-heading">{t('heading.preview')}</h2>
            <Preview pixels={pixels} model={model} nameOf={nameOf} face={face} onPickSpot={pickSpot} />
          </section>
          <section className="panel" aria-labelledby="texture-heading">
            <h2 id="texture-heading">{t('heading.texture')}</h2>
            <TextureMap pixels={pixels} face={face} model={model} onPickFace={pickFace} />
          </section>
          <section className="panel" aria-labelledby="colors-heading">
            <h2 id="colors-heading">{t('heading.colors')}</h2>
            <ColorForms palette={palette} names={names} currentColor={currentColor} onAdd={addColor} onRename={renameColor} />
          </section>
          <section className="panel" aria-labelledby="file-heading">
            <h2 id="file-heading">{t('heading.file')}</h2>
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
            <h2 id="settings-heading">{t('heading.settings')}</h2>
            <Settings settings={settings} onChange={(change) => setSettings((current) => ({ ...current, ...change }))} />
          </section>
          <section className="panel" aria-labelledby="keys-heading">
            <h2 id="keys-heading">{t('heading.keys')}</h2>
            <Shortcuts />
          </section>
        </div>
      </main>
      <footer className="app-footer">
        <p>
          {i18n.rich('app.footer', {
            author: 'Anna Ohrt',
            repoName: REPO_URL.replace('https://', ''),
            // An address reads left to right in any language.
            repo: (chunks) => (
              <a href={REPO_URL} dir="ltr">
                {chunks}
              </a>
            ),
            notices: (chunks) => <a href={NOTICES_URL}>{chunks}</a>,
          })}
        </p>
      </footer>
    </>
  )
}

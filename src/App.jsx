import { useMemo, useReducer, useRef, useState } from 'react'
import { useI18n } from './i18n/context.js'
import { colorNamer, describeArea, describeLine, faceLabel, messageText } from './i18n/words.js'
import { getFace } from './skin/layout.js'
import { isTransparent } from './skin/color.js'
import { areaAt, columnOf, getCell, rowOf } from './skin/pixels.js'
import { SKIN_FILE_NAME, SkinFileError, downloadSkin, readSkinFile } from './skin/png.js'
import { planEdit } from './editor/edits.js'
import { historyReducer, initHistory, nextStep } from './editor/history.js'
import { loadDraft, startingDraft } from './editor/storage.js'
import { useAnnouncer } from './editor/useAnnouncer.js'
import { useAutosave } from './editor/useAutosave.js'
import { usePalette } from './editor/usePalette.js'
import FacePicker from './components/FacePicker.jsx'
import { ColorForms, PaintColors } from './components/Palette.jsx'
import PixelGrid from './components/PixelGrid.jsx'
import Tools from './components/Tools.jsx'
import ReplaceColor from './components/ReplaceColor.jsx'
import FaceDescription from './components/FaceDescription.jsx'
import Preview from './components/Preview.jsx'
import TextureMap from './components/TextureMap.jsx'
import FilePanel from './components/FilePanel.jsx'
import Settings from './components/Settings.jsx'
import Shortcuts from './components/Shortcuts.jsx'
import Logo from './components/Logo.jsx'

const REPO_URL = 'https://github.com/Anna-Ohrt/accessible-skin-editor'
const NOTICES_URL = 'https://anna-ohrt.github.io/accessible-skin-editor/third-party-notices.txt'

// Drags and Shift+arrow painting show their result as it happens, so only a refusal is announced.
const QUIET_SOURCES = new Set(['pointer', 'keyboard-move'])

// A titled section. The pixels heading can take focus, since the skip link goes there.
function Panel({ id, title, focusable = false, children }) {
  return (
    <section className="panel" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} tabIndex={focusable ? -1 : undefined}>
        {title}
      </h2>
      {children}
    </section>
  )
}

export default function App() {
  const i18n = useI18n()
  const { t } = i18n
  const [initial] = useState(() => loadDraft() ?? startingDraft())
  const [history, dispatch] = useReducer(historyReducer, initial.pixels, initHistory)
  const { palette, names, current, choose, rename } = usePalette(initial)
  const [model, setModel] = useState(initial.model)
  const [settings, setSettings] = useState(initial.settings)
  const [selection, setSelection] = useState({ partId: 'head', sideId: 'front', layerId: 'base' })
  const [cursor, setCursor] = useState({ col: 0, row: 0 })
  const [fileError, setFileError] = useState(null)
  const [status, announce] = useAnnouncer(t('status.first'))
  const latestOpen = useRef(0)

  const { pixels } = history
  const { partId, sideId, layerId } = selection
  const face = useMemo(() => getFace(partId, sideId, layerId, model), [partId, sideId, layerId, model])
  const nameOf = useMemo(
    () => colorNamer(i18n, palette, names, { sayHex: settings.sayHex }),
    [i18n, palette, names, settings.sayHex],
  )
  const paintName = names.get(current.id)
  useAutosave({ pixels, palette, model, currentColor: current.color, settings })

  // Each of these returns what it said, or null when it said nothing.
  function perform(action) {
    const plan = planEdit(action, { pixels, face, model, color: current.color })
    if (plan.change) dispatch({ type: 'apply', change: plan.change, label: plan.label, stroke: action.stroke })
    if (!plan.refused && QUIET_SOURCES.has(action.source)) return null
    return announce(messageText(i18n, plan.message, { color: paintName }, nameOf))
  }

  function travel(type) {
    const step = nextStep(history, type)
    if (!step) return announce(t(`status.${type}.none`))
    dispatch({ type })
    return announce(t(`status.${type}.done`, { action: messageText(i18n, step.label) }))
  }

  function pickColor(color) {
    if (isTransparent(color)) return announce(t('status.nothingToPick'))
    return announce(t('status.picked', { color: choose(color).name }))
  }

  function handleAction(action) {
    const { col, row } = action
    switch (action.type) {
      case 'undo':
      case 'redo':
        return travel(action.type)
      case 'pick':
        return pickColor(getCell(pixels, face, col, row))
      case 'readRow':
        return announce(
          t('status.readRow', { row: row + 1, line: describeLine(i18n, rowOf(pixels, face, row), nameOf) }),
        )
      case 'readColumn':
        return announce(
          t('status.readColumn', { col: col + 1, line: describeLine(i18n, columnOf(pixels, face, col), nameOf) }),
        )
      case 'readArea':
        return announce(describeArea(i18n, areaAt(pixels, face, col, row, nameOf)))
      case 'edge':
        return announce(t('status.edge', { edge: action.edge }))
      // NVDA says the row or column itself when it changes, but JAWS doesn't in a grid, so it's on by default.
      case 'togglePosition': {
        const sayPosition = !settings.sayPosition
        setSettings((value) => ({ ...value, sayPosition }))
        return announce(t(sayPosition ? 'status.positionOn' : 'status.positionOff'))
      }
      default:
        return perform(action)
    }
  }

  // Only the newest file counts when another is chosen before this one opens.
  async function openFile(file) {
    const request = (latestOpen.current += 1)
    try {
      const skin = await readSkinFile(file)
      if (request !== latestOpen.current) return
      setFileError(null)
      perform({ type: 'open', skin, file: file.name })
    } catch (error) {
      if (request !== latestOpen.current) return
      setFileError(error instanceof SkinFileError ? error : new SkinFileError('unreadable'))
    }
  }

  async function download() {
    try {
      await downloadSkin(pixels)
      setFileError(null)
      announce(t('status.downloaded', { file: SKIN_FILE_NAME }))
    } catch (error) {
      setFileError(error instanceof SkinFileError ? error : new SkinFileError('save'))
    }
  }

  function addColor(color, name) {
    const chosen = choose(color, name)
    announce(t(chosen.added ? 'status.added' : 'status.colorExists', { color: chosen.name }))
  }

  function renameColor(id, name) {
    rename(id, name)
    announce(t('status.renamed', { from: names.get(id), to: name }))
  }

  // A side picked on the texture map, or on the 3D model with the cursor moved to the pixel picked.
  function openSide(found, at) {
    setSelection({ partId: found.partId, sideId: found.sideId, layerId: found.layerId })
    const name = faceLabel(i18n, found)
    if (!at) {
      announce(t('status.editing', { face: name }))
      return
    }
    setCursor(at)
    announce(t('status.editingAt', { face: name, row: at.row + 1, col: at.col + 1 }))
  }

  return (
    <>
      <header className="app-header">
        <a className="skip-link" href="#pixels-heading">
          {t('app.skip')}
        </a>
        <Logo />
        <h1>{t('app.title')}</h1>
        <p>{t('app.intro')}</p>
        <p className="disclaimer">{t('app.disclaimer')}</p>
      </header>
      <main className="layout">
        <div className="column">
          <Panel id="choose" title={t('heading.choose')}>
            <FacePicker
              selection={selection}
              model={model}
              onChange={(change) => setSelection((value) => ({ ...value, ...change }))}
              onModelChange={setModel}
            />
          </Panel>
        </div>

        <div className="column">
          <Panel id="pixels" title={t('heading.pixels', { face: faceLabel(i18n, face) })} focusable>
            <PixelGrid
              face={face}
              pixels={pixels}
              nameOf={nameOf}
              settings={settings}
              cursor={cursor}
              onCursorChange={setCursor}
              onAction={handleAction}
            />
            <p role="status" className="status">
              {status}
            </p>
            <PaintColors palette={palette} names={names} current={current} onSelect={choose} />
          </Panel>
          <Panel id="tools" title={t('heading.tools')}>
            <Tools
              face={face}
              model={model}
              paintName={paintName}
              canUndo={history.past.length > 0}
              canRedo={history.future.length > 0}
              onAction={handleAction}
            />
            <ReplaceColor
              pixels={pixels}
              model={model}
              paint={current.color}
              paintName={paintName}
              nameOf={nameOf}
              onAction={handleAction}
            />
          </Panel>
          <Panel id="words" title={t('heading.words')}>
            <FaceDescription pixels={pixels} face={face} nameOf={nameOf} />
          </Panel>
        </div>

        <div className="column">
          <Panel id="preview" title={t('heading.preview')}>
            <Preview
              pixels={pixels}
              model={model}
              nameOf={nameOf}
              face={face}
              onPickSpot={(spot) => openSide(spot.face, { col: spot.col, row: spot.row })}
            />
          </Panel>
          <Panel id="texture" title={t('heading.texture')}>
            <TextureMap pixels={pixels} face={face} model={model} onPickFace={(found) => openSide(found)} />
          </Panel>
          <Panel id="colors" title={t('heading.colors')}>
            <ColorForms names={names} current={current} onAdd={addColor} onRename={renameColor} />
          </Panel>
          <Panel id="file" title={t('heading.file')}>
            <FilePanel
              error={fileError}
              paintName={paintName}
              onOpen={openFile}
              onDownload={download}
              onAction={handleAction}
            />
          </Panel>
          <Panel id="settings" title={t('heading.settings')}>
            <Settings settings={settings} onChange={(change) => setSettings((value) => ({ ...value, ...change }))} />
          </Panel>
          <Panel id="keys" title={t('heading.keys')}>
            <Shortcuts />
          </Panel>
        </div>
      </main>
      <footer className="app-footer">
        <p>
          {i18n.rich('app.footer', {
            author: 'Anna Ohrt',
            repo: (chunks) => <a href={REPO_URL}>{chunks}</a>,
            notices: (chunks) => <a href={NOTICES_URL}>{chunks}</a>,
          })}
        </p>
      </footer>
    </>
  )
}

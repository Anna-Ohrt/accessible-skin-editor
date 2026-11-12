import { useEffect, useEffectEvent, useMemo, useReducer, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useI18n } from './i18n/context.js'
import { colorNamer, describeArea, describeLine, faceLabel, messageText } from './i18n/words.js'
import { getFace } from './skin/layout.js'
import { isTransparent } from './skin/color.js'
import { areaAt, columnOf, getCell, rowOf } from './skin/pixels.js'
import { SKIN_FILE_NAME, SkinFileError, downloadSkin, readSkinFile } from './skin/png.js'
import { planEdit } from './editor/edits.js'
import { historyReducer, initHistory, nextStep } from './editor/history.js'
import { historyAction, takesTyping } from './editor/keys.js'
import { chooseTool } from './editor/tools.js'
import { loadDraft, startingDraft } from './editor/storage.js'
import { useAnnouncer } from './editor/useAnnouncer.js'
import { useAutosave } from './editor/useAutosave.js'
import { usePalette } from './editor/usePalette.js'
import FacePicker from './components/FacePicker.jsx'
import { ColorForms, PaintColors } from './components/Palette.jsx'
import PixelGrid from './components/PixelGrid.jsx'
import ToolChoice from './components/ToolChoice.jsx'
import Tools from './components/Tools.jsx'
import ReplaceColor from './components/ReplaceColor.jsx'
import FaceDescription from './components/FaceDescription.jsx'
import Preview from './components/Preview.jsx'
import TextureMap from './components/TextureMap.jsx'
import FilePanel, { FileActions } from './components/FilePanel.jsx'
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
  const [tools, setTools] = useState({ current: 'pencil', before: 'pencil' })
  const [fileError, setFileError] = useState(null)
  const [status, announce] = useAnnouncer(t('status.first'))
  const latestOpen = useRef(0)
  const gridRef = useRef(null)

  const { pixels } = history
  const { partId, sideId, layerId } = selection
  const face = useMemo(() => getFace(partId, sideId, layerId, model), [partId, sideId, layerId, model])
  const nameOf = useMemo(
    () => colorNamer(i18n, palette, names, { sayHex: settings.sayHex }),
    [i18n, palette, names, settings.sayHex],
  )
  const paintName = names.get(current.id)
  useAutosave({ pixels, palette, model, currentColor: current.color, settings })

  // What an action on the side being edited says after doing it. Null means it says nothing, like a drag
  // that painted: the pixels' names already have the new color.
  function respond(action) {
    const { col, row } = action
    switch (action.type) {
      case 'undo':
      case 'redo':
        return travel(action.type)
      case 'pick':
        return pickColor(getCell(pixels, face, col, row), action.byTool)
      case 'readRow':
        return t('status.readRow', { row: row + 1, line: describeLine(i18n, rowOf(pixels, face, row), nameOf) })
      case 'readColumn':
        return t('status.readColumn', { col: col + 1, line: describeLine(i18n, columnOf(pixels, face, col), nameOf) })
      case 'readArea':
        return describeArea(i18n, areaAt(pixels, face, col, row, nameOf))
      case 'edge':
        return t('status.edge', { edge: action.edge })
      case 'chooseTool':
        setTools((value) => chooseTool(value, action.tool))
        return t('grid.toolSaid', { tool: t('grid.tool', { tool: action.tool, color: paintName }) })
      // NVDA says the row or column itself when it changes, but JAWS doesn't in a grid, so it's on by default.
      case 'togglePosition': {
        const sayPosition = !settings.sayPosition
        setSettings((value) => ({ ...value, sayPosition }))
        return t(sayPosition ? 'status.positionOn' : 'status.positionOff')
      }
      default: {
        const plan = planEdit(action, { pixels, face, model, color: current.color })
        if (plan.change) dispatch({ type: 'apply', change: plan.change, label: plan.label, stroke: action.stroke })
        if (!plan.refused && QUIET_SOURCES.has(action.source)) return null
        return messageText(i18n, plan.message, { color: paintName }, nameOf)
      }
    }
  }

  // Returns what it said, or null when it said nothing.
  function handleAction(action) {
    const said = respond(action)
    return said === null ? null : announce(said)
  }

  function travel(type) {
    const step = nextStep(history, type)
    if (!step) return t(`status.${type}.none`)
    dispatch({ type })
    return t(`status.${type}.done`, { action: messageText(i18n, step.label) })
  }

  function pickColor(color, byTool) {
    if (isTransparent(color)) return t('status.nothingToPick')
    const { name } = choose(color)
    if (!byTool) return t('status.picked', { color: name })
    setTools((value) => ({ ...value, current: value.before }))
    return t('status.pickedBack', { color: name, tool: tools.before })
  }

  // Only the newest file counts when another is chosen before this one opens.
  async function openFile(file) {
    const request = (latestOpen.current += 1)
    try {
      const skin = await readSkinFile(file)
      if (request !== latestOpen.current) return
      setFileError(null)
      handleAction({ type: 'open', skin, file: file.name })
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

  // A side picked on the texture map.
  function openSide(found) {
    setSelection({ partId: found.partId, sideId: found.sideId, layerId: found.layerId })
    announce(t('status.editing', { face: faceLabel(i18n, found) }))
  }

  // A click on the 3D model goes to that pixel in the grid, where pixels are big enough to edit. The side
  // opens first, so the pixel is there to take focus.
  function goToSpot({ face: target, col, row }) {
    flushSync(() => {
      setSelection({ partId: target.partId, sideId: target.sideId, layerId: target.layerId })
      setCursor({ col, row })
    })
    gridRef.current.focusCursor()
  }

  // Ctrl+Z and Ctrl+Y work anywhere on the page, as in other editors, except in a text field, which keeps them
  // for its typing. The grid handles its own first.
  const onHistoryKey = useEffectEvent((event) => {
    const action = historyAction(event)
    if (!action || event.defaultPrevented || takesTyping(event.target)) return
    event.preventDefault()
    handleAction(action)
  })
  useEffect(() => {
    document.addEventListener('keydown', onHistoryKey)
    return () => document.removeEventListener('keydown', onHistoryKey)
  }, [])

  return (
    <>
      <header className="app-header">
        <a className="skip-link" href="#pixels-heading">
          {t('app.skip')}
        </a>
        <Logo />
        <h1>{t('app.title')}</h1>
        <p className="disclaimer">{t('app.disclaimer')}</p>
        <FileActions error={fileError} onOpen={openFile} onDownload={download} />
      </header>
      <main className="layout">
        <div className="column">
          <Panel id="tools" title={t('heading.tools')}>
            <ToolChoice
              labelledBy="tools-heading"
              tool={tools.current}
              onChange={(next) => setTools((value) => chooseTool(value, next))}
              canUndo={history.past.length > 0}
              canRedo={history.future.length > 0}
              onAction={handleAction}
            />
          </Panel>
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
              ref={gridRef}
              face={face}
              pixels={pixels}
              nameOf={nameOf}
              settings={settings}
              tool={tools.current}
              paint={current.color}
              paintName={paintName}
              status={status}
              cursor={cursor}
              onCursorChange={setCursor}
              onAction={handleAction}
            >
              <PaintColors palette={palette} names={names} current={current} onSelect={choose} />
            </PixelGrid>
          </Panel>
          <Panel id="more" title={t('heading.moreTools')}>
            <Tools face={face} model={model} paintName={paintName} onAction={handleAction} />
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
            <Preview pixels={pixels} model={model} nameOf={nameOf} face={face} onPickSpot={goToSpot} />
          </Panel>
          <Panel id="texture" title={t('heading.texture')}>
            <TextureMap pixels={pixels} face={face} model={model} onPickFace={(found) => openSide(found)} />
          </Panel>
          <Panel id="colors" title={t('heading.colors')}>
            <ColorForms names={names} current={current} onAdd={addColor} onRename={renameColor} />
          </Panel>
          <Panel id="file" title={t('heading.file')}>
            <FilePanel paintName={paintName} onAction={handleAction} />
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
        <p>{t('app.intro')}</p>
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

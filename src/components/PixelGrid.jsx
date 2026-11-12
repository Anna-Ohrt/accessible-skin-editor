import { useId, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n/context.js'
import { faceLabel, faceOrientation } from '../i18n/words.js'
import { draws, paints, strokeAction, toolAction } from '../editor/tools.js'
import { getCell, nextChange } from '../skin/pixels.js'
import { alphaOf, toCss, toHex } from '../skin/color.js'

const ARROWS = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }
const EDGES = { ArrowRight: 'right', ArrowLeft: 'left', ArrowDown: 'bottom', ArrowUp: 'top' }
// Reading a row, column or area describes what's already on screen, so it's spoken but not shown by the pixel.
const READS = new Set(['readRow', 'readColumn', 'readArea'])

const samePlace = (a, b) => a?.col === b?.col && a?.row === b?.row

// The letter a shortcut key stands for: the typed letter on a Latin layout, or else the key's position
// on a US keyboard (event.code), so shortcuts also work with Cyrillic or Greek layouts.
function shortcutLetter(event) {
  if (/^[a-z]$/i.test(event.key)) return event.key.toLowerCase()
  const match = /^Key([A-Z])$/.exec(event.code ?? '')
  return match && event.key.length === 1 ? match[1].toLowerCase() : null
}

// Every cell on the straight line between two cells, so a fast stroke doesn't skip any.
function cellsBetween(from, to) {
  const cells = []
  let col = from.col
  let row = from.row
  const dx = Math.abs(to.col - col)
  const dy = -Math.abs(to.row - row)
  const stepCol = col < to.col ? 1 : -1
  const stepRow = row < to.row ? 1 : -1
  let error = dx + dy
  for (;;) {
    cells.push({ col, row })
    if (col === to.col && row === to.row) return cells
    const twice = 2 * error
    if (twice >= dy) {
      error += dy
      col += stepCol
    }
    if (twice <= dx) {
      error += dx
      row += stepRow
    }
  }
}

// One side's pixels as an ARIA grid with a roving tabindex, named by color, reporting requests through
// onAction, which returns what the app said. Below it: the status, the children (paint colors), the keys.
export default function PixelGrid({
  ref,
  face,
  pixels,
  nameOf,
  settings,
  tool,
  paint,
  paintName,
  status,
  cursor,
  onCursorChange,
  onAction,
  children,
}) {
  const id = useId()
  const i18n = useI18n()
  const { t } = i18n
  const gridRef = useRef(null)
  // A click on the 3D model puts focus here, and focusVisible shows the ring after a mouse click too.
  useImperativeHandle(
    ref,
    () => ({ focusCursor: () => gridRef.current.querySelector('[tabindex="0"]').focus({ focusVisible: true }) }),
    [],
  )
  const stroke = useRef(null)
  const strokeCount = useRef(0)
  const pointerHandled = useRef(false)
  // The pixel under the mouse or pen, what the last action here said, and whether Escape hid the callout.
  const [hover, setHover] = useState(null)
  const [note, setNote] = useState(null)
  const [calloutHidden, setCalloutHidden] = useState(false)
  // The cursor keeps its place when the side changes, and stays inside a smaller one.
  const col = Math.min(cursor.col, face.w - 1)
  const row = Math.min(cursor.row, face.h - 1)
  const inside = (cell) => cell.col >= 0 && cell.row >= 0 && cell.col < face.w && cell.row < face.h

  function cellOf(element) {
    const cell = element?.closest?.('[data-col]')
    if (!cell || !gridRef.current?.contains(cell)) return null
    return { col: Number(cell.dataset.col), row: Number(cell.dataset.row) }
  }

  // Focus moves first, and handleFocus moves the cursor to match.
  function moveTo(next) {
    gridRef.current.querySelector(`[data-col="${next.col}"][data-row="${next.row}"]`).focus()
  }

  function handleFocus(event) {
    const cell = cellOf(event.target)
    if (!cell || samePlace(cell, { col, row })) return
    // A message stays with the pixel it's about, like the one Shift+arrow just painted.
    setNote((current) => (samePlace(current, cell) ? current : null))
    setCalloutHidden(false)
    onCursorChange(cell)
  }

  // Other controls can change the skin, so a message from before is out of date by the time focus returns.
  function handleBlur(event) {
    if (gridRef.current.contains(event.relatedTarget)) return
    setNote(null)
    setCalloutHidden(false)
  }

  // Sends an action to the app, and keeps what the app said to show next to the pixel at `at`.
  function report(action, at = { col, row }) {
    const said = onAction(action)
    if (READS.has(action.type)) return
    setNote(said ? { text: said, ...at } : null)
    setCalloutHidden(false)
  }

  function handleKeyDown(event) {
    const { key, shiftKey, altKey } = event
    const ctrl = event.ctrlKey || event.metaKey
    const letter = shortcutLetter(event)

    if (ctrl && (letter === 'z' || letter === 'y')) {
      event.preventDefault()
      report({ type: letter === 'y' || shiftKey ? 'redo' : 'undo' })
      return
    }
    if (altKey) return

    // Content that appears on focus can be dismissed without moving focus (WCAG 1.4.13).
    if (key === 'Escape') {
      if (!settings.showCallout || calloutHidden) return
      event.preventDefault()
      setCalloutHidden(true)
      return
    }
    if (key in ARROWS) {
      if (ctrl && shiftKey) return
      event.preventDefault()
      const [dCol, dRow] = ARROWS[key]
      const step = { col: col + dCol, row: row + dRow }
      // Ctrl+arrow skips pixels that sound the same, like Ctrl+arrow in Excel skips to the edge of the data.
      const next = ctrl ? nextChange(pixels, face, { col, row }, ARROWS[key], nameOf) : inside(step) && step
      if (!next) {
        report({ type: 'edge', edge: EDGES[key] })
        return
      }
      if (shiftKey && draws(tool)) report(strokeAction(tool, [next], { source: 'keyboard-move' }), next)
      moveTo(next)
      return
    }
    if (key === 'Home' || key === 'End') {
      event.preventDefault()
      const first = key === 'Home'
      if (ctrl) moveTo(first ? { col: 0, row: 0 } : { col: face.w - 1, row: face.h - 1 })
      else moveTo({ col: first ? 0 : face.w - 1, row })
      return
    }
    if (ctrl) return

    // A side is at most 12 rows, so Page Up and Page Down go to the top and bottom of the column.
    if (key === 'PageUp' || key === 'PageDown') {
      event.preventDefault()
      moveTo({ col, row: key === 'PageUp' ? 0 : face.h - 1 })
      return
    }

    // Single-letter shortcuts work only while the grid has focus (WCAG 2.1.4).
    const keys = {
      ' ': toolAction(tool, { col, row }, { source: 'keyboard' }),
      Enter: toolAction(tool, { col, row }, { source: 'keyboard' }),
      Delete: { type: 'erase', cells: [{ col, row }] },
      Backspace: { type: 'erase', cells: [{ col, row }] },
    }
    const letters = {
      f: { type: 'fill', col, row },
      i: { type: 'pick', col, row },
      r: { type: 'readRow', row },
      c: { type: 'readColumn', col },
      a: { type: 'readArea', col, row },
      p: { type: 'togglePosition' },
    }
    const action = keys[key] ?? (letter && letters[letter])
    if (!action) return
    event.preventDefault()
    report(action)
  }

  // A press alone never acts (WCAG 2.5.2): a click uses the tool on release, so sliding off cancels it, and
  // a drag with the Pencil or Eraser works from its first pixel as one undo step.
  function handlePointerDown(event) {
    if (event.button !== 0) return
    const cell = cellOf(event.target)
    if (!cell) return
    pointerHandled.current = true
    strokeCount.current += 1
    stroke.current = { ...cell, id: strokeCount.current, moved: false }
    gridRef.current.setPointerCapture?.(event.pointerId)
  }

  // jsdom has no layout, so tests fall back to the event target.
  function cellUnder(event) {
    if (!document.elementFromPoint) return cellOf(event.target)
    return cellOf(document.elementFromPoint(event.clientX, event.clientY))
  }

  // The readout names the pixel under a mouse or pen too, since a click would paint it (WCAG 1.4.1).
  function handlePointerMove(event) {
    const current = stroke.current
    const cell = current ? cellUnder(event) : cellOf(event.target)
    // Over a grid line it keeps the last pixel, so the readout doesn't flicker.
    if (cell) setHover((shown) => (samePlace(shown, cell) ? shown : cell))
    if (!current) return
    // The button was released where the grid couldn't hear it.
    if (event.buttons === 0) {
      endStroke()
      return
    }
    if (!cell || samePlace(cell, current)) return
    const path = cellsBetween(current, cell)
    const cells = current.moved ? path.slice(1) : path
    stroke.current = { ...cell, id: current.id, moved: true }
    // Fill and Pick color work on a click, so a drag with them does nothing.
    if (draws(tool)) report(strokeAction(tool, cells, { source: 'pointer', stroke: current.id }))
  }

  function handlePointerUp(event) {
    const current = stroke.current
    if (current && !current.moved) {
      const cell = cellUnder(event)
      if (samePlace(cell, current)) report(toolAction(tool, cell, { source: 'click', stroke: current.id }), cell)
    }
    endStroke()
  }

  // The click event after this pointerup was already handled as a paint.
  function endStroke() {
    stroke.current = null
    setTimeout(() => {
      pointerHandled.current = false
    }, 0)
  }

  // Screen readers can "click" a cell without pointer events, so a click uses the tool too.
  function handleClick(event) {
    if (pointerHandled.current) {
      pointerHandled.current = false
      return
    }
    const cell = cellOf(event.target)
    if (cell) report(toolAction(tool, cell, { source: 'click' }), cell)
  }

  function readoutAt(at, pointing) {
    const color = getCell(pixels, face, at.col, at.row)
    const name = nameOf(color)
    const hex = toHex(color)
    return t('grid.readout', {
      pointing: pointing ? 'yes' : 'no',
      row: at.row + 1,
      col: at.col + 1,
      color: alphaOf(color) > 0 && !name.includes(hex) ? t('grid.colorHex', { color: name, hex }) : name,
    })
  }

  // Hovering only changes the readout, so the cells aren't built again for it.
  const rows = useMemo(
    () =>
      Array.from({ length: face.h }, (_, r) => (
        <div key={r} role="row" className="pixel-row">
          {Array.from({ length: face.w }, (_, c) => {
            const color = getCell(pixels, face, c, r)
            const name = nameOf(color)
            return (
              <div
                key={c}
                role="gridcell"
                tabIndex={c === col && r === row ? 0 : -1}
                aria-label={settings.sayPosition ? t('grid.cell', { color: name, row: r + 1, col: c + 1 }) : name}
                data-col={c}
                data-row={r}
                className={alphaOf(color) < 255 ? 'cell is-see-through' : 'cell'}
                style={{ '--pixel': toCss(color) }}
              />
            )
          })}
        </div>
      )),
    [face, pixels, nameOf, settings.sayPosition, col, row, t],
  )
  const pointed = hover && inside(hover) ? hover : null
  const shownNote = samePlace(note, { col, row }) ? note : null
  const toolNow = t('grid.tool', { tool, color: paintName })

  return (
    <>
      <p id={`${id}-size`} className="hint">
        {t('grid.size', { w: face.w, h: face.h, orientation: faceOrientation(i18n, face) })}
      </p>
      <div className="grid-wrap">
        {/* The cells take focus, not the grid. It stays left to right in any language, since it's a picture. */}
        {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus */}
        <div
          ref={gridRef}
          role="grid"
          dir="ltr"
          aria-label={faceLabel(i18n, face)}
          aria-describedby={`${id}-tool ${id}-size ${id}-help`}
          className={settings.showGridLines ? 'pixel-grid with-lines' : 'pixel-grid'}
          style={{ '--cell': `${settings.cellSize}px` }}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHover(null)}
          onPointerUp={handlePointerUp}
          onPointerCancel={endStroke}
          onClick={handleClick}
        >
          {rows}
        </div>
        {/* Feedback "in close proximity to the user's visual focus" (W3C low vision needs). Screen readers
            already hear it from the pixel and the status. */}
        {settings.showCallout && !calloutHidden && (
          <p className="callout" aria-hidden="true">
            {shownNote?.text ?? readoutAt({ col, row }, false)}
          </p>
        )}
        <div className="under-grid">
          <p className="cursor-readout">{readoutAt(pointed ?? { col, row }, Boolean(pointed))}</p>
          {/* The tool beside the pixels too, since Tools can be off screen, as on a phone (NN/g on modes). */}
          <p className="tool-now">
            {paints(tool) && <span className="chip" style={{ '--pixel': toCss(paint) }} aria-hidden="true" />}
            {toolNow}
          </p>
        </div>
        {/* What the grid's description starts with, as a sentence so it doesn't run into the size. */}
        <span id={`${id}-tool`} hidden>
          {t('grid.toolSaid', { tool: toolNow })}
        </span>
      </div>
      <p role="status" className="status">
        {status}
      </p>
      {children}
      {/* Last, so the pixels and paint colors start higher up. It's still the grid's description. */}
      <p id={`${id}-help`} className="hint grid-help">
        {i18n.rich('grid.help', { kbd: (chunks) => <kbd>{chunks}</kbd> })}
      </p>
    </>
  )
}

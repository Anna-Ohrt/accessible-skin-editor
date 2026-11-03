import { useId, useRef } from 'react'
import { useI18n } from '../i18n/context.js'
import { faceLabel, faceOrientation } from '../i18n/words.js'
import { getCell } from '../skin/pixels.js'
import { alphaOf, toCss, toHex } from '../skin/color.js'

const ARROWS = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }
const EDGES = { ArrowRight: 'right', ArrowLeft: 'left', ArrowDown: 'bottom', ArrowUp: 'top' }

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

// One side's pixels as an ARIA grid with a roving tabindex, named by color. It reports what the person
// asks for through onAction, and the app decides what that does.
export default function PixelGrid({ face, pixels, nameOf, settings, cursor, onCursorChange, onAction }) {
  const id = useId()
  const i18n = useI18n()
  const { t } = i18n
  const gridRef = useRef(null)
  const stroke = useRef(null)
  const strokeCount = useRef(0)
  const pointerHandled = useRef(false)
  // The cursor keeps its place when the side changes, and stays inside a smaller one.
  const col = Math.min(cursor.col, face.w - 1)
  const row = Math.min(cursor.row, face.h - 1)

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
    if (cell && (cell.col !== col || cell.row !== row)) onCursorChange(cell)
  }

  function handleKeyDown(event) {
    const { key, shiftKey, altKey } = event
    const ctrl = event.ctrlKey || event.metaKey
    const letter = shortcutLetter(event)

    if (ctrl && (letter === 'z' || letter === 'y')) {
      event.preventDefault()
      onAction({ type: letter === 'y' || shiftKey ? 'redo' : 'undo' })
      return
    }
    if (altKey) return

    if (key in ARROWS) {
      if (ctrl) return
      event.preventDefault()
      const [dCol, dRow] = ARROWS[key]
      const next = { col: col + dCol, row: row + dRow }
      if (next.col < 0 || next.row < 0 || next.col >= face.w || next.row >= face.h) {
        onAction({ type: 'edge', edge: EDGES[key] })
        return
      }
      if (shiftKey) onAction({ type: 'paint', cells: [next], source: 'keyboard-move' })
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
      ' ': { type: 'paint', cells: [{ col, row }], source: 'keyboard' },
      Enter: { type: 'paint', cells: [{ col, row }], source: 'keyboard' },
      Delete: { type: 'erase', col, row },
      Backspace: { type: 'erase', col, row },
    }
    const letters = {
      f: { type: 'fill', col, row },
      i: { type: 'pick', col, row },
      r: { type: 'readRow', row },
      c: { type: 'readColumn', col },
      p: { type: 'togglePosition' },
    }
    const action = keys[key] ?? (letter && letters[letter])
    if (!action) return
    event.preventDefault()
    onAction(action)
  }

  // A press alone never paints (WCAG 2.5.2): a click paints on release, so sliding off cancels it, and
  // a drag paints from its first pixel as one undo step.
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

  function handlePointerMove(event) {
    if (!stroke.current) return
    // The button was released where the grid couldn't hear it.
    if (event.buttons === 0) {
      endStroke()
      return
    }
    const cell = cellUnder(event)
    if (!cell || (cell.col === stroke.current.col && cell.row === stroke.current.row)) return
    const path = cellsBetween(stroke.current, cell)
    const cells = stroke.current.moved ? path.slice(1) : path
    stroke.current = { ...cell, id: stroke.current.id, moved: true }
    onAction({ type: 'paint', cells, source: 'pointer', stroke: stroke.current.id })
  }

  function handlePointerUp(event) {
    const current = stroke.current
    if (current && !current.moved) {
      const cell = cellUnder(event)
      if (cell && cell.col === current.col && cell.row === current.row) {
        onAction({ type: 'paint', cells: [cell], source: 'click', stroke: current.id })
      }
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

  // Screen readers can "click" a cell without pointer events, so a click paints too.
  function handleClick(event) {
    if (pointerHandled.current) {
      pointerHandled.current = false
      return
    }
    const cell = cellOf(event.target)
    if (cell) onAction({ type: 'paint', cells: [cell], source: 'click' })
  }

  const cursorColor = getCell(pixels, face, col, row)
  const cursorName = nameOf(cursorColor)
  const cursorHex = toHex(cursorColor)
  const position = { row: row + 1, col: col + 1, color: cursorName }
  const readout =
    alphaOf(cursorColor) > 0 && !cursorName.includes(cursorHex)
      ? t('grid.readoutHex', { ...position, hex: cursorHex })
      : t('grid.readout', position)

  return (
    <>
      <p id={`${id}-size`} className="hint">
        {t('grid.size', { w: face.w, h: face.h, orientation: faceOrientation(i18n, face) })}
      </p>
      <p id={`${id}-help`} className="hint">
        {t('grid.help')}
      </p>
      <div className="grid-wrap">
        {/* The cells take focus, not the grid. It stays left to right in any language, since it's a picture. */}
        {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus */}
        <div
          ref={gridRef}
          role="grid"
          dir="ltr"
          aria-label={faceLabel(i18n, face)}
          aria-describedby={`${id}-size ${id}-help`}
          className={settings.showGridLines ? 'pixel-grid with-lines' : 'pixel-grid'}
          style={{ '--cell': `${settings.cellSize}px` }}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={endStroke}
          onClick={handleClick}
        >
          {Array.from({ length: face.h }, (_, r) => (
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
          ))}
        </div>
        <p className="cursor-readout">{readout}</p>
      </div>
    </>
  )
}

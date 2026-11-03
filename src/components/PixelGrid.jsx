import { useLayoutEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/context.js'
import { getCell } from '../skin/pixels.js'
import { alphaOf, toCss, toHex } from '../skin/color.js'

const ARROWS = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }
const EDGES = { ArrowRight: 'right', ArrowLeft: 'left', ArrowDown: 'bottom', ArrowUp: 'top' }

// The letter a shortcut key stands for. With a Latin keyboard layout it's the letter typed. With
// another script, like Cyrillic or Greek, typing gives another character, so the key's position on
// a US keyboard is used instead (event.code "KeyF" is where F is on a US keyboard).
export function shortcutLetter(event) {
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

// The pixels of one side, as an ARIA grid: one Tab stop, arrow keys move between pixels, and
// each pixel's name is its color (plus its position, unless that setting is off). The grid
// reports what the person asked for through onAction; the app decides what it does.
export default function PixelGrid({ face, label, pixels, nameOf, sayPosition, cellSize, showGridLines, describedBy, cursorRequest, onAction }) {
  const { t } = useI18n()
  const gridRef = useRef(null)
  const cellRefs = useRef(new Map())
  const [cursor, setCursor] = useState({ col: 0, row: 0 })
  const [seenRequest, setSeenRequest] = useState(cursorRequest)
  const focusAfterRender = useRef(false)
  const stroke = useRef(null)
  const strokeCount = useRef(0)
  const pointerHandled = useRef(false)

  // Another part of the editor, like the 3D model, can put the cursor on a pixel. Focus stays put.
  // This updates during render, as the React docs suggest for state that follows a prop.
  if (cursorRequest !== seenRequest) {
    setSeenRequest(cursorRequest)
    if (cursorRequest) setCursor({ col: cursorRequest.col, row: cursorRequest.row })
  }

  // The cursor stays where it was when another side is chosen, unless that side is smaller.
  const col = Math.min(cursor.col, face.w - 1)
  const row = Math.min(cursor.row, face.h - 1)

  useLayoutEffect(() => {
    if (!focusAfterRender.current) return
    focusAfterRender.current = false
    cellRefs.current.get(`${col},${row}`)?.focus()
  })

  function moveTo(next) {
    focusAfterRender.current = true
    setCursor(next)
  }

  function cellOf(element) {
    const cell = element?.closest?.('[data-col]')
    if (!cell || !gridRef.current?.contains(cell)) return null
    return { col: Number(cell.dataset.col), row: Number(cell.dataset.row) }
  }

  function handleKeyDown(event) {
    const { key, shiftKey, altKey } = event
    const ctrl = event.ctrlKey || event.metaKey
    const letter = shortcutLetter(event)

    if (ctrl && letter === 'z') {
      event.preventDefault()
      onAction({ type: shiftKey ? 'redo' : 'undo' })
      return
    }
    if (ctrl && letter === 'y') {
      event.preventDefault()
      onAction({ type: 'redo' })
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

    // The APG grid pattern moves Page Up and Page Down an author-chosen number of rows. A side is
    // at most 12 rows, so they go to the top and bottom of the column.
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
    }
    const action = keys[key] ?? (letter && letters[letter])
    if (!action) return
    event.preventDefault()
    onAction(action)
  }

  function handleFocus(event) {
    const cell = cellOf(event.target)
    if (cell && (cell.col !== col || cell.row !== row)) setCursor(cell)
  }

  // Pointer painting never happens on the press alone (WCAG 2.5.2 Pointer Cancellation). A press and
  // release on one pixel paints it on release, so sliding off before letting go cancels it. A drag
  // paints from the first pixel as soon as it moves, and the whole stroke undoes as one step.
  function handlePointerDown(event) {
    if (event.button !== 0) return
    const cell = cellOf(event.target)
    if (!cell) return
    pointerHandled.current = true
    strokeCount.current += 1
    stroke.current = { ...cell, id: strokeCount.current, moved: false }
    gridRef.current.setPointerCapture?.(event.pointerId)
  }

  function cellUnder(event) {
    // jsdom has no layout, so tests fall back to the event target.
    if (!document.elementFromPoint) return cellOf(event.target)
    return cellOf(document.elementFromPoint(event.clientX, event.clientY))
  }

  function handlePointerMove(event) {
    if (!stroke.current) return
    if (event.buttons === 0) {
      // The release happened somewhere the grid didn't hear about, so the stroke is over.
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
      // A single press and release reports like a click, so its result is announced too.
      if (cell && cell.col === current.col && cell.row === current.row) {
        onAction({ type: 'paint', cells: [cell], source: 'click', stroke: current.id })
      }
    }
    endStroke()
  }

  function endStroke() {
    stroke.current = null
    // The click that follows this pointerup was already handled.
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

  const rows = []
  for (let r = 0; r < face.h; r += 1) {
    const cells = []
    for (let c = 0; c < face.w; c += 1) {
      const color = getCell(pixels, face, c, r)
      const name = nameOf(color)
      const alpha = alphaOf(color)
      const key = `${c},${r}`
      cells.push(
        <div
          key={c}
          ref={(element) => {
            if (element) cellRefs.current.set(key, element)
            else cellRefs.current.delete(key)
          }}
          role="gridcell"
          tabIndex={c === col && r === row ? 0 : -1}
          aria-label={sayPosition ? t('grid.cell', { color: name, row: r + 1, col: c + 1 }) : name}
          data-col={c}
          data-row={r}
          className={alpha < 255 ? 'cell is-see-through' : 'cell'}
          style={{ '--pixel': toCss(color) }}
        />,
      )
    }
    rows.push(
      <div key={r} role="row" className="pixel-row">
        {cells}
      </div>,
    )
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
    <div className="grid-wrap">
      {/* The grid is a picture, so it stays left to right in right-to-left languages, and arrow
          keys move the way they point. The arrow handling is on the grid itself, and its cells are
          the focusable parts (a roving tabindex), so the grid has no tabIndex of its own. */}
      {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus */}
      <div
        ref={gridRef}
        role="grid"
        dir="ltr"
        aria-label={label}
        aria-describedby={describedBy}
        className={showGridLines ? 'pixel-grid with-lines' : 'pixel-grid'}
        style={{ '--cell': `${cellSize}px` }}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={endStroke}
        onClick={handleClick}
      >
        {rows}
      </div>
      <p className="cursor-readout">{readout}</p>
    </div>
  )
}

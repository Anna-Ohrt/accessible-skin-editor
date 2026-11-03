import { useId, useRef, useState } from 'react'
import { describeColor, parseHex, toCss, toHex } from '../skin/color.js'

const isTaken = (name, palette, exceptId) =>
  palette.some((entry) => entry.id !== exceptId && entry.name.toLowerCase() === name.toLowerCase())

function AddColorForm({ palette, onAdd }) {
  const id = useId()
  const hexRef = useRef(null)
  const nameRef = useRef(null)
  const [hex, setHex] = useState('#3a7bd5')
  const [name, setName] = useState('')
  const [error, setError] = useState(null) // { field, message }
  const parsed = parseHex(hex)

  function handleSubmit(event) {
    event.preventDefault()
    const color = parseHex(hex)
    if (color === null) {
      setError({ field: 'hex', message: 'Enter a hex code with 6 digits, like #3a7bd5.' })
      hexRef.current.focus()
      return
    }
    const trimmed = name.trim()
    if (trimmed && isTaken(trimmed, palette)) {
      setError({ field: 'name', message: `A color is already named ${trimmed}. Choose another name.` })
      nameRef.current.focus()
      return
    }
    setError(null)
    setName('')
    onAdd(color, trimmed)
  }

  const errorId = `${id}-error`
  return (
    <form className="add-color" noValidate onSubmit={handleSubmit}>
      <h3>Add a color</h3>
      <div className="field">
        <label htmlFor={`${id}-hex`}>Hex code</label>
        <div className="inline-fields">
          <input
            id={`${id}-hex`}
            ref={hexRef}
            value={hex}
            onChange={(event) => {
              setHex(event.target.value)
              // The error goes away as soon as the code is fixed.
              if (error?.field === 'hex' && parseHex(event.target.value) !== null) setError(null)
            }}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={error?.field === 'hex' ? 'true' : undefined}
            aria-describedby={[`${id}-reads`, error?.field === 'hex' && errorId].filter(Boolean).join(' ')}
          />
          <input
            type="color"
            aria-label="System color picker"
            value={parsed === null ? '#000000' : toHex(parsed)}
            onChange={(event) => {
              setHex(event.target.value)
              if (error?.field === 'hex') setError(null)
            }}
          />
        </div>
        <p id={`${id}-reads`} className="hint">
          {parsed === null ? 'Not a color yet.' : `This color reads as "${describeColor(parsed)}".`}
        </p>
      </div>
      <div className="field">
        <label htmlFor={`${id}-name`}>Name (optional)</label>
        <input
          id={`${id}-name`}
          ref={nameRef}
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            if (error?.field === 'name') setError(null)
          }}
          autoComplete="off"
          aria-invalid={error?.field === 'name' ? 'true' : undefined}
          aria-describedby={error?.field === 'name' ? errorId : undefined}
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="error">
          {error.message}
        </p>
      )}
      <button type="submit">Add color</button>
    </form>
  )
}

function RenameForm({ current, palette, onRename }) {
  const id = useId()
  const inputRef = useRef(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter a name.')
      inputRef.current.focus()
      return
    }
    if (isTaken(trimmed, palette, current.id)) {
      setError(`A color is already named ${trimmed}. Choose another name.`)
      inputRef.current.focus()
      return
    }
    setError('')
    setName('')
    onRename(current.id, trimmed)
  }

  return (
    <form className="rename-color" noValidate onSubmit={handleSubmit}>
      <h3>Rename the paint color</h3>
      <div className="field">
        <label htmlFor={`${id}-name`}>New name for {current.name}</label>
        <input
          id={`${id}-name`}
          ref={inputRef}
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            if (error) setError('')
          }}
          autoComplete="off"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="error">
          {error}
        </p>
      )}
      <button type="submit">Rename</button>
    </form>
  )
}

// The paint colors, as one radio group. It comes right after the pixel grid, so a keyboard user
// gets from the grid to the colors and back with Tab and Shift+Tab.
export function PaintColors({ palette, currentColor, onSelect }) {
  const current = palette.find((entry) => entry.color === currentColor) ?? palette[0]
  return (
    <fieldset className="palette">
      <legend>Paint color</legend>
      <div className="swatches">
        {palette.map((entry) => (
          <label key={entry.id} className="swatch">
            <input
              type="radio"
              name="paint-color"
              checked={entry.color === currentColor}
              onChange={() => onSelect(entry.color)}
            />
            <span className="chip" style={{ '--pixel': toCss(entry.color) }} aria-hidden="true" />
            <span className="swatch-name">{entry.name}</span>
          </label>
        ))}
      </div>
      <p className="current-color">
        Painting with <strong>{current.name}</strong> <span className="hint">{toHex(current.color)}</span>
      </p>
    </fieldset>
  )
}

export function ColorForms({ palette, currentColor, onAdd, onRename }) {
  const current = palette.find((entry) => entry.color === currentColor) ?? palette[0]
  return (
    <>
      <AddColorForm palette={palette} onAdd={onAdd} />
      <RenameForm key={current.id} current={current} palette={palette} onRename={onRename} />
    </>
  )
}

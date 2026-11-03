import { useId, useRef, useState } from 'react'
import { useI18n } from '../i18n/context.js'
import { colorName } from '../i18n/words.js'
import { MAX_NAME_LENGTH } from '../editor/storage.js'
import { parseHex, toCss, toHex } from '../skin/color.js'

const EXAMPLE_HEX = '#3a7bd5'

// Whether another entry already shows this name, compared without case.
function isTaken(i18n, name, names, exceptId) {
  const wanted = i18n.lower(name)
  return [...names].some(([id, other]) => id !== exceptId && i18n.lower(other) === wanted)
}

// Checks a name someone typed. Returns an error message, or null when the name is fine.
function nameProblem(i18n, name, names, exceptId) {
  if (name.length > MAX_NAME_LENGTH) return i18n.t('colors.nameTooLong', { max: MAX_NAME_LENGTH })
  if (isTaken(i18n, name, names, exceptId)) return i18n.t('colors.nameTaken', { name })
  return null
}

function AddColorForm({ names, onAdd }) {
  const id = useId()
  const i18n = useI18n()
  const { t } = i18n
  const hexRef = useRef(null)
  const nameRef = useRef(null)
  const [hex, setHex] = useState(EXAMPLE_HEX)
  const [name, setName] = useState('')
  const [error, setError] = useState(null) // { field, message }
  const parsed = parseHex(hex)

  function handleSubmit(event) {
    event.preventDefault()
    const color = parseHex(hex)
    if (color === null) {
      setError({ field: 'hex', message: t('colors.hexError', { example: EXAMPLE_HEX }) })
      hexRef.current.focus()
      return
    }
    const trimmed = name.trim()
    const problem = trimmed ? nameProblem(i18n, trimmed, names) : null
    if (problem) {
      setError({ field: 'name', message: problem })
      nameRef.current.focus()
      return
    }
    setError(null)
    setName('')
    onAdd(color, trimmed || null)
  }

  const errorId = `${id}-error`
  return (
    <form noValidate onSubmit={handleSubmit}>
      <h3>{t('colors.addHeading')}</h3>
      <div className="field">
        <label htmlFor={`${id}-hex`}>{t('colors.hex')}</label>
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
            dir="ltr"
            aria-invalid={error?.field === 'hex' ? 'true' : undefined}
            aria-describedby={[`${id}-reads`, error?.field === 'hex' && errorId].filter(Boolean).join(' ')}
          />
          <input
            type="color"
            aria-label={t('colors.picker')}
            value={parsed === null ? '#000000' : toHex(parsed)}
            onChange={(event) => {
              setHex(event.target.value)
              if (error?.field === 'hex') setError(null)
            }}
          />
        </div>
        <p id={`${id}-reads`} className="hint">
          {parsed === null ? t('colors.notYet') : t('colors.readsAs', { color: colorName(i18n, parsed) })}
        </p>
      </div>
      <div className="field">
        <label htmlFor={`${id}-name`}>{t('colors.name')}</label>
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
      <button type="submit">{t('colors.add')}</button>
    </form>
  )
}

function RenameForm({ current, names, onRename }) {
  const id = useId()
  const i18n = useI18n()
  const { t } = i18n
  const inputRef = useRef(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = name.trim()
    const problem = trimmed ? nameProblem(i18n, trimmed, names, current.id) : t('colors.nameEmpty')
    if (problem) {
      setError(problem)
      inputRef.current.focus()
      return
    }
    setError('')
    setName('')
    onRename(current.id, trimmed)
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <h3>{t('colors.renameHeading')}</h3>
      <div className="field">
        <label htmlFor={`${id}-name`}>{t('colors.newName', { color: names.get(current.id) })}</label>
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
      <button type="submit">{t('colors.rename')}</button>
    </form>
  )
}

// One radio group, right after the pixel grid, so Tab and Shift+Tab move between the grid and the colors.
export function PaintColors({ palette, names, current, onSelect }) {
  const { t, rich } = useI18n()
  const name = useId()
  return (
    <fieldset>
      <legend>{t('palette.legend')}</legend>
      <div className="swatches">
        {palette.map((entry) => (
          <label key={entry.id} className="swatch">
            <input type="radio" name={name} checked={entry.id === current.id} onChange={() => onSelect(entry.color)} />
            <span className="chip" style={{ '--pixel': toCss(entry.color) }} aria-hidden="true" />
            <span className="swatch-name">{names.get(entry.id)}</span>
          </label>
        ))}
      </div>
      <p className="current-color">
        {rich('palette.painting', {
          color: names.get(current.id),
          hex: toHex(current.color),
          b: (chunks) => <strong>{chunks}</strong>,
          hint: (chunks) => <span className="hint">{chunks}</span>,
        })}
      </p>
    </fieldset>
  )
}

export function ColorForms({ names, current, onAdd, onRename }) {
  return (
    <>
      <AddColorForm names={names} onAdd={onAdd} />
      <RenameForm key={current.id} current={current} names={names} onRename={onRename} />
    </>
  )
}

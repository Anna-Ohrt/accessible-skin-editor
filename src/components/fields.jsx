import { useId } from 'react'

// Radio buttons for one choice, as a fieldset with a visible legend, or named by the heading just above it.
export function Choices({ legend, labelledBy, options, value, onChange }) {
  const name = useId()
  return (
    <fieldset aria-labelledby={labelledBy}>
      {legend && <legend>{legend}</legend>}
      {options.map((option) => (
        <label key={option.value} className="choice">
          <input
            type="radio"
            name={name}
            checked={value === option.value}
            disabled={option.disabled}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  )
}

export function Checkbox({ checked, onChange, children }) {
  return (
    <label className="choice">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {children}
    </label>
  )
}

export function SelectField({ label, value, options, onChange }) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

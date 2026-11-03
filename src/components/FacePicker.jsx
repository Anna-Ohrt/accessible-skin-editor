import { useId } from 'react'
import { MODELS, PARTS, SIDES, partById } from '../skin/layout.js'

export default function FacePicker({ selection, model, onChange, onModelChange }) {
  const id = useId()
  const part = partById(selection.partId)
  return (
    <>
      <div className="field">
        <label htmlFor={`${id}-part`}>Body part</label>
        <select id={`${id}-part`} value={selection.partId} onChange={(event) => onChange({ partId: event.target.value })}>
          {PARTS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${id}-side`}>Side</label>
        <select id={`${id}-side`} value={selection.sideId} onChange={(event) => onChange({ sideId: event.target.value })}>
          {SIDES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend>Layer</legend>
        <label className="choice">
          <input
            type="radio"
            name={`${id}-layer`}
            checked={selection.layerId === 'base'}
            onChange={() => onChange({ layerId: 'base' })}
          />
          Base layer
        </label>
        <label className="choice">
          <input
            type="radio"
            name={`${id}-layer`}
            checked={selection.layerId === 'outer'}
            onChange={() => onChange({ layerId: 'outer' })}
          />
          Outer layer ({part.outerName})
        </label>
      </fieldset>
      <fieldset>
        <legend>Arm width</legend>
        {MODELS.map((item) => (
          <label key={item.id} className="choice">
            <input type="radio" name={`${id}-model`} checked={model === item.id} onChange={() => onModelChange(item.id)} />
            {item.name}, {item.armWidth} pixels
          </label>
        ))}
      </fieldset>
    </>
  )
}

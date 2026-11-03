import { useId } from 'react'
import { CELL_SIZES } from '../editor/settings.js'

export default function Settings({ settings, onChange }) {
  const id = useId()
  return (
    <>
      <div className="field">
        <label htmlFor={`${id}-size`}>Pixel size on screen</label>
        <select
          id={`${id}-size`}
          value={settings.cellSize}
          onChange={(event) => onChange({ cellSize: Number(event.target.value) })}
        >
          {CELL_SIZES.map((size) => (
            <option key={size} value={size}>
              {size} pixels
            </option>
          ))}
        </select>
      </div>
      <label className="choice">
        <input
          type="checkbox"
          checked={settings.sayPosition}
          onChange={(event) => onChange({ sayPosition: event.target.checked })}
        />
        Say the row and column with each pixel
      </label>
      <label className="choice">
        <input type="checkbox" checked={settings.sayHex} onChange={(event) => onChange({ sayHex: event.target.checked })} />
        Say hex codes after color names
      </label>
      <label className="choice">
        <input
          type="checkbox"
          checked={settings.showGridLines}
          onChange={(event) => onChange({ showGridLines: event.target.checked })}
        />
        Show grid lines
      </label>
    </>
  )
}

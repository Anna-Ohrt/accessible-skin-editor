import { useId } from 'react'
import { useI18n } from '../i18n/context.js'
import { CELL_SIZES } from '../editor/settings.js'

export default function Settings({ settings, onChange }) {
  const id = useId()
  const { t } = useI18n()
  return (
    <>
      <div className="field">
        <label htmlFor={`${id}-size`}>{t('settings.size')}</label>
        <select
          id={`${id}-size`}
          value={settings.cellSize}
          onChange={(event) => onChange({ cellSize: Number(event.target.value) })}
        >
          {CELL_SIZES.map((size) => (
            <option key={size} value={size}>
              {t('settings.sizeOption', { size })}
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
        {t('settings.sayPosition')}
      </label>
      <label className="choice">
        <input type="checkbox" checked={settings.sayHex} onChange={(event) => onChange({ sayHex: event.target.checked })} />
        {t('settings.sayHex')}
      </label>
      <label className="choice">
        <input
          type="checkbox"
          checked={settings.showGridLines}
          onChange={(event) => onChange({ showGridLines: event.target.checked })}
        />
        {t('settings.gridLines')}
      </label>
    </>
  )
}

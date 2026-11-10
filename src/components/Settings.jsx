import { useI18n } from '../i18n/context.js'
import { CELL_SIZES } from '../editor/settings.js'
import { Checkbox, SelectField } from './fields.jsx'

export default function Settings({ settings, onChange }) {
  const { t } = useI18n()
  return (
    <>
      <SelectField
        label={t('settings.size')}
        value={settings.cellSize}
        options={CELL_SIZES.map((size) => ({ value: size, label: t('settings.sizeOption', { size }) }))}
        onChange={(size) => onChange({ cellSize: Number(size) })}
      />
      <Checkbox checked={settings.sayPosition} onChange={(sayPosition) => onChange({ sayPosition })}>
        {t('settings.sayPosition')}
      </Checkbox>
      <Checkbox checked={settings.sayHex} onChange={(sayHex) => onChange({ sayHex })}>
        {t('settings.sayHex')}
      </Checkbox>
      <Checkbox checked={settings.showGridLines} onChange={(showGridLines) => onChange({ showGridLines })}>
        {t('settings.gridLines')}
      </Checkbox>
      <Checkbox checked={settings.showCallout} onChange={(showCallout) => onChange({ showCallout })}>
        {t('settings.callout')}
      </Checkbox>
    </>
  )
}

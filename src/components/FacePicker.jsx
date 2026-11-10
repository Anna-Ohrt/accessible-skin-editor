import { useI18n } from '../i18n/context.js'
import { LAYERS, MODELS, PARTS, SIDES } from '../skin/layout.js'
import { Choices, SelectField } from './fields.jsx'

export default function FacePicker({ selection, model, onChange, onModelChange }) {
  const { t } = useI18n()
  return (
    <div className="picker">
      <SelectField
        label={t('picker.part')}
        value={selection.partId}
        options={PARTS.map((part) => ({ value: part.id, label: t(`part.${part.id}`) }))}
        onChange={(partId) => onChange({ partId })}
      />
      <SelectField
        label={t('picker.side')}
        value={selection.sideId}
        options={SIDES.map((sideId) => ({ value: sideId, label: t(`side.${sideId}`) }))}
        onChange={(sideId) => onChange({ sideId })}
      />
      <Choices
        legend={t('picker.layer')}
        options={LAYERS.map((layerId) => ({
          value: layerId,
          label: t(`layer.${layerId}`, { outer: t(`outer.${selection.partId}`) }),
        }))}
        value={selection.layerId}
        onChange={(layerId) => onChange({ layerId })}
      />
      <Choices
        legend={t('picker.armWidth')}
        options={MODELS.map((item) => ({ value: item.id, label: t(`model.${item.id}`, { width: item.armWidth }) }))}
        value={model}
        onChange={onModelChange}
      />
    </div>
  )
}

import { useId } from 'react'
import { useI18n } from '../i18n/context.js'
import { MODELS, PARTS, SIDES } from '../skin/layout.js'

export default function FacePicker({ selection, model, onChange, onModelChange }) {
  const id = useId()
  const { t } = useI18n()
  return (
    <>
      <div className="field">
        <label htmlFor={`${id}-part`}>{t('picker.part')}</label>
        <select id={`${id}-part`} value={selection.partId} onChange={(event) => onChange({ partId: event.target.value })}>
          {PARTS.map((part) => (
            <option key={part.id} value={part.id}>
              {t(`part.${part.id}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${id}-side`}>{t('picker.side')}</label>
        <select id={`${id}-side`} value={selection.sideId} onChange={(event) => onChange({ sideId: event.target.value })}>
          {SIDES.map((sideId) => (
            <option key={sideId} value={sideId}>
              {t(`side.${sideId}`)}
            </option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend>{t('picker.layer')}</legend>
        <label className="choice">
          <input
            type="radio"
            name={`${id}-layer`}
            checked={selection.layerId === 'base'}
            onChange={() => onChange({ layerId: 'base' })}
          />
          {t('layer.base')}
        </label>
        <label className="choice">
          <input
            type="radio"
            name={`${id}-layer`}
            checked={selection.layerId === 'outer'}
            onChange={() => onChange({ layerId: 'outer' })}
          />
          {t('layer.outer', { outer: t(`outer.${selection.partId}`) })}
        </label>
      </fieldset>
      <fieldset>
        <legend>{t('picker.armWidth')}</legend>
        {MODELS.map((item) => (
          <label key={item.id} className="choice">
            <input type="radio" name={`${id}-model`} checked={model === item.id} onChange={() => onModelChange(item.id)} />
            {t(`model.${item.id}`, { width: item.armWidth })}
          </label>
        ))}
      </fieldset>
    </>
  )
}

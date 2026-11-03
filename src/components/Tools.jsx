import { useState } from 'react'
import { useI18n } from '../i18n/context.js'
import { faceLabel } from '../i18n/words.js'
import { allFaces } from '../skin/layout.js'
import { Checkbox, SelectField } from './fields.jsx'

// Whole-side tools, so nobody has to paint pixel by pixel to make big changes.
export default function Tools({ face, model, paintName, canUndo, canRedo, onAction }) {
  const i18n = useI18n()
  const { t } = i18n
  const targets = allFaces(model).filter((item) => item.id !== face.id && item.w === face.w && item.h === face.h)
  const [targetId, setTargetId] = useState('')
  const [flip, setFlip] = useState(false)
  const target = targets.find((item) => item.id === targetId) ?? targets[0]

  return (
    <>
      <div className="button-row">
        <button type="button" onClick={() => onAction({ type: 'fillSide' })}>
          {t('tools.fill', { color: paintName })}
        </button>
        {face.layerId === 'outer' && (
          <button type="button" onClick={() => onAction({ type: 'clearSide' })}>
            {t('tools.clear')}
          </button>
        )}
      </div>
      {face.w > 1 && (
        <div className="button-row">
          <button type="button" onClick={() => onAction({ type: 'mirror', from: 'left' })}>
            {t('tools.mirrorLeft')}
          </button>
          <button type="button" onClick={() => onAction({ type: 'mirror', from: 'right' })}>
            {t('tools.mirrorRight')}
          </button>
        </div>
      )}
      {/* aria-disabled keeps these focusable, so focus isn't lost when the history runs out. */}
      <div className="button-row">
        <button type="button" aria-disabled={!canUndo} onClick={() => onAction({ type: 'undo' })}>
          {t('tools.undo')}
        </button>
        <button type="button" aria-disabled={!canRedo} onClick={() => onAction({ type: 'redo' })}>
          {t('tools.redo')}
        </button>
      </div>
      {target && (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onAction({ type: 'copy', target, flip })
          }}
        >
          <SelectField
            label={t('tools.copyTo')}
            value={target.id}
            options={targets.map((item) => ({ value: item.id, label: faceLabel(i18n, item) }))}
            onChange={setTargetId}
          />
          <Checkbox checked={flip} onChange={setFlip}>
            {t('tools.flip')}
          </Checkbox>
          <button type="submit">{t('tools.copy')}</button>
        </form>
      )}
    </>
  )
}

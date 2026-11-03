import { useId, useState } from 'react'
import { useI18n } from '../i18n/context.js'
import { faceLabel } from '../i18n/words.js'
import { allFaces } from '../skin/layout.js'

// Whole-side tools, so nobody has to paint pixel by pixel to make big changes.
export default function Tools({ face, model, paintName, canUndo, canRedo, onTool }) {
  const id = useId()
  const i18n = useI18n()
  const { t } = i18n
  const targets = allFaces(model).filter((item) => item.id !== face.id && item.w === face.w && item.h === face.h)
  const [targetId, setTargetId] = useState('')
  const [flip, setFlip] = useState(false)
  const target = targets.find((item) => item.id === targetId) ?? targets[0]

  return (
    <>
      <div className="button-row">
        <button type="button" onClick={() => onTool({ type: 'fillSide' })}>
          {t('tools.fill', { color: paintName })}
        </button>
        {face.layerId === 'outer' && (
          <button type="button" onClick={() => onTool({ type: 'clearSide' })}>
            {t('tools.clear')}
          </button>
        )}
      </div>
      {face.w > 1 && (
        <div className="button-row">
          <button type="button" onClick={() => onTool({ type: 'mirror', from: 'left' })}>
            {t('tools.mirrorLeft')}
          </button>
          <button type="button" onClick={() => onTool({ type: 'mirror', from: 'right' })}>
            {t('tools.mirrorRight')}
          </button>
        </div>
      )}
      {/* aria-disabled keeps these focusable, so focus isn't lost when the history runs out. */}
      <div className="button-row">
        <button type="button" aria-disabled={!canUndo} onClick={() => onTool({ type: 'undo' })}>
          {t('tools.undo')}
        </button>
        <button type="button" aria-disabled={!canRedo} onClick={() => onTool({ type: 'redo' })}>
          {t('tools.redo')}
        </button>
      </div>
      {target && (
        <form
          className="copy-form"
          onSubmit={(event) => {
            event.preventDefault()
            onTool({ type: 'copy', target, flip })
          }}
        >
          <div className="field">
            <label htmlFor={`${id}-target`}>{t('tools.copyTo')}</label>
            <select id={`${id}-target`} value={target.id} onChange={(event) => setTargetId(event.target.value)}>
              {targets.map((item) => (
                <option key={item.id} value={item.id}>
                  {faceLabel(i18n, item)}
                </option>
              ))}
            </select>
          </div>
          <label className="choice">
            <input type="checkbox" checked={flip} onChange={(event) => setFlip(event.target.checked)} />
            {t('tools.flip')}
          </label>
          <button type="submit">{t('tools.copy')}</button>
        </form>
      )}
    </>
  )
}

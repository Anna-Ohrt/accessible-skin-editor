import { useId } from 'react'
import { useI18n } from '../i18n/context.js'
import { SKIN_FILE_NAME } from '../skin/png.js'

export default function FilePanel({ error, paintName, onOpen, onDownload, onAction }) {
  const id = useId()
  const { t } = useI18n()
  return (
    <>
      <div className="field">
        <label htmlFor={`${id}-open`}>{t('file.open')}</label>
        <input
          id={`${id}-open`}
          type="file"
          accept="image/png"
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => {
            const [file] = event.target.files
            if (file) onOpen(file)
            // Lets the same file be chosen again.
            event.target.value = ''
          }}
        />
        {error && (
          <p id={`${id}-error`} role="alert" className="error">
            {t(`file.error.${error.code}`, error.values)}
          </p>
        )}
      </div>
      <div className="button-row">
        <button type="button" onClick={onDownload}>
          {t('file.download', { file: SKIN_FILE_NAME })}
        </button>
        <button type="button" onClick={() => onAction({ type: 'startOver' })}>
          {t('file.startOver')}
        </button>
        <button type="button" onClick={() => onAction({ type: 'startPlain' })}>
          {t('file.plain', { color: paintName })}
        </button>
      </div>
      <p className="hint">{t('file.saved')}</p>
    </>
  )
}

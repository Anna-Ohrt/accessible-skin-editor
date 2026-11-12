import { useId, useRef } from 'react'
import { useI18n } from '../i18n/context.js'
import { SKIN_FILE_NAME } from '../skin/png.js'

const JAVA_SKIN_HELP_URL = 'https://help.minecraft.net/hc/articles/4408894664461'

// Open and Download, at the top of the page so they're found without scrolling. A problem shows under them,
// and describes the button it's about.
export function FileActions({ error, onOpen, onDownload }) {
  const id = useId()
  const { t } = useI18n()
  const inputRef = useRef(null)
  const errorFor = error?.code === 'save' ? 'download' : 'open'
  const describedBy = (which) => (error && which === errorFor ? `${id}-error` : undefined)
  return (
    <div className="file-actions">
      <div className="button-row">
        <button type="button" aria-describedby={describedBy('open')} onClick={() => inputRef.current.click()}>
          {t('file.open')}
        </button>
        <button type="button" className="primary" aria-describedby={describedBy('download')} onClick={onDownload}>
          {t('file.download', { file: SKIN_FILE_NAME })}
        </button>
      </div>
      {/* The button opens the browser's file picker, so the input itself is never shown. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/png"
        hidden
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
  )
}

// Starting again, and how to wear the skin. It points to Open and Download for anyone who looks here.
export default function FilePanel({ paintName, onAction }) {
  const i18n = useI18n()
  const { t } = i18n
  return (
    <>
      <p className="hint">
        {t('file.atTop', { open: t('file.open'), download: t('file.download', { file: SKIN_FILE_NAME }) })}
      </p>
      <div className="button-row">
        <button type="button" onClick={() => onAction({ type: 'startOver' })}>
          {t('file.startOver')}
        </button>
        <button type="button" onClick={() => onAction({ type: 'startPlain' })}>
          {t('file.plain', { color: paintName })}
        </button>
      </div>
      <p className="hint">{i18n.rich('file.useIt', { help: (chunks) => <a href={JAVA_SKIN_HELP_URL}>{chunks}</a> })}</p>
      <p className="hint">{t('file.saved')}</p>
    </>
  )
}

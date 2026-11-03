import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n/context.js'
import { clearDraft } from '../editor/storage.js'

// Shown instead of the editor if it stops with an error, so the page isn't left blank. Reloading
// usually fixes it. If the saved work itself is what breaks the editor, reloading won't, so there's
// a way to clear it too.
export default function CrashNotice() {
  const { t } = useI18n()
  const headingRef = useRef(null)

  // Whatever had focus is gone, so focus moves to the message.
  useEffect(() => headingRef.current?.focus(), [])

  return (
    <main className="crash">
      <h1 ref={headingRef} tabIndex={-1}>
        {t('app.title')}
      </h1>
      <p role="alert">{t('app.crashed')}</p>
      <button type="button" onClick={() => window.location.reload()}>
        {t('app.reload')}
      </button>
      <p>{t('app.crashedAgain')}</p>
      <button
        type="button"
        onClick={() => {
          clearDraft()
          window.location.reload()
        }}
      >
        {t('app.clearAndReload')}
      </button>
    </main>
  )
}

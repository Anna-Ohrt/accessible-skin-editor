import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import CrashNotice from './components/CrashNotice.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { I18nContext } from './i18n/context.js'
import { applyToDocument, createI18n, pickLocale } from './i18n/index.js'
import './styles.css'

const i18n = createI18n(pickLocale(window.location.search, navigator.languages))
applyToDocument(i18n)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nContext value={i18n}>
      <ErrorBoundary fallback={<CrashNotice />}>
        <App />
      </ErrorBoundary>
    </I18nContext>
  </StrictMode>,
)

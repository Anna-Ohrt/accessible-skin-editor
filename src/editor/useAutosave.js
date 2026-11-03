import { useEffect, useState } from 'react'
import { createSaver } from './storage.js'

// Saves the work in the browser once changes pause, and at once when the page is hidden or closed.
export function useAutosave({ pixels, palette, model, currentColor, settings }) {
  const [saver] = useState(createSaver)

  useEffect(() => {
    saver.schedule({ pixels, palette, model, currentColor, settings })
  }, [saver, pixels, palette, model, currentColor, settings])

  useEffect(() => {
    const flushIfHidden = () => {
      if (document.visibilityState === 'hidden') saver.flush()
    }
    window.addEventListener('pagehide', saver.flush)
    document.addEventListener('visibilitychange', flushIfHidden)
    return () => {
      window.removeEventListener('pagehide', saver.flush)
      document.removeEventListener('visibilitychange', flushIfHidden)
      saver.flush()
    }
  }, [saver])
}

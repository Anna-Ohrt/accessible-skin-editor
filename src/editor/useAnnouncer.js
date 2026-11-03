import { useCallback, useState } from 'react'

// Text for the role="status" region. Screen readers announce it when it changes, so saying the
// same thing twice in a row adds an invisible character to make it a change. The first text says
// what the region is for; it's on the page from the start, so it isn't announced.
export function useAnnouncer(firstText) {
  const [message, setMessage] = useState({ text: firstText, count: 0 })
  const announce = useCallback((text) => setMessage((previous) => ({ text, count: previous.count + 1 })), [])
  const text = message.count % 2 === 0 ? message.text : `${message.text}\u00a0`
  return [text, announce]
}

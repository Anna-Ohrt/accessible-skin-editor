import { useCallback, useState } from 'react'

// Text for the role="status" region. Every other message ends in an invisible character, so a repeated
// message still changes and is announced. The first text is there from the start, so it isn't.
export function useAnnouncer(firstText) {
  const [message, setMessage] = useState({ text: firstText, count: 0 })
  // Returns the text, so the grid can also show it next to the pixel.
  const announce = useCallback((text) => {
    setMessage((previous) => ({ text, count: previous.count + 1 }))
    return text
  }, [])
  const text = message.count % 2 === 0 ? message.text : `${message.text}\u00a0`
  return [text, announce]
}

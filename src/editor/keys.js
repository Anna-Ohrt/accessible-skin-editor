// The letter a shortcut key stands for: the typed letter on a Latin layout, or else the key's position
// on a US keyboard (event.code), so shortcuts also work with Cyrillic or Greek layouts.
export function shortcutLetter(event) {
  if (/^[a-z]$/i.test(event.key)) return event.key.toLowerCase()
  const match = /^Key([A-Z])$/.exec(event.code ?? '')
  return match && event.key.length === 1 ? match[1].toLowerCase() : null
}

// Undo and redo as on Windows and macOS (W3C APG). Command+Y is left to the browser, since Chrome on a Mac
// opens its history with it. Alt is left out, since Ctrl+Alt is AltGr on many keyboards.
export function historyAction(event) {
  if (event.altKey || !(event.ctrlKey || event.metaKey)) return null
  const letter = shortcutLetter(event)
  if (letter === 'z') return { type: event.shiftKey ? 'redo' : 'undo' }
  return letter === 'y' && event.ctrlKey ? { type: 'redo' } : null
}

// Fields where Ctrl+Z undoes typing, so it's left to them.
const TEXT_TYPES = new Set(['text', 'search', 'url', 'tel', 'email', 'password', 'number'])
export const takesTyping = (element) =>
  element?.isContentEditable === true ||
  element?.tagName === 'TEXTAREA' ||
  (element?.tagName === 'INPUT' && TEXT_TYPES.has(element.type))

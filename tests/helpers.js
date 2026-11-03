// The first 33 bytes of a PNG file of the given size: the signature and the IHDR chunk.
export function pngHeader(width, height) {
  const bytes = new Uint8Array(33)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const view = new DataView(bytes.buffer)
  view.setUint32(8, 13)
  bytes.set([73, 72, 68, 82], 12)
  view.setUint32(16, width)
  view.setUint32(20, height)
  return bytes
}

// Plain English in the page's text or accessible names, which in en-XA means text that skipped the messages.
// It's self-contained so Playwright can run it in the page. Names, addresses and Intl's " and " are allowed.
export function findUntranslated() {
  const allowed = ['Anna Ohrt', 'github.com/Anna-Ohrt/accessible-skin-editor', 'skin.png', ' and ']
  const english = (text) => /[A-Za-z]{2,}/.test(allowed.reduce((rest, word) => rest.replaceAll(word, ' '), text))
  const texts = [document.title]
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.parentElement.closest('noscript')) texts.push(node.textContent.trim())
  }
  for (const element of document.querySelectorAll('[aria-label]')) texts.push(element.getAttribute('aria-label'))
  return texts.filter(english)
}

// Pseudo-locales: made-up languages built from the English messages, for testing before any real
// translation exists. Only text that goes through the messages changes, so English left anywhere
// on the page stands out as text a translator would never see.
//
// en-XA (accented) swaps letters for accented ones, brackets each message and makes it about 40%
// longer, since translations often run longer than English. ar-XB (mirrored) shows each message
// right to left in a right-to-left page, to test layout for languages like Arabic and Hebrew.
// Both names follow the pseudo-locales in Chromium and Android.

// Node types in a parsed ICU message (from @formatjs/icu-messageformat-parser).
const LITERAL = 0
const SELECT = 5
const PLURAL = 6
const TAG = 8

const PLAIN = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const ACCENTED = 'åƀçðéƒĝĥîĵķļɱñöþǫŕšţûṽŵẋýžÅƁÇÐÉƑĜĤÎĴĶĻṀÑÖÞǪŔŠŢÛṼŴẊÝŽ'
const ACCENT = new Map([...PLAIN].map((letter, i) => [letter, [...ACCENTED][i]]))

// Changes the text in every literal part of a message, including inside plural, select and tags.
// Placeholders like {color} and the # in plurals are left alone.
function mapLiterals(nodes, change) {
  return nodes.map((node) => {
    if (node.type === LITERAL) return { ...node, value: change(node.value) }
    if (node.type === SELECT || node.type === PLURAL) {
      const options = Object.fromEntries(
        Object.entries(node.options).map(([key, option]) => [key, { ...option, value: mapLiterals(option.value, change) }]),
      )
      return { ...node, options }
    }
    if (node.type === TAG) return { ...node, children: mapLiterals(node.children, change) }
    return node
  })
}

// Each piece of text gets about 40% more length, before any space at its end. Padding each piece,
// rather than the whole message, keeps the options of a select or plural to their own length.
function accent(text) {
  const letters = text.replace(/[^A-Za-z]/g, '').length
  const accented = [...text].map((char) => ACCENT.get(char) ?? char).join('')
  if (letters === 0) return accented
  return accented.replace(/\s*$/, (space) => `${'·'.repeat(Math.ceil(letters * 0.4))}${space}`)
}

export function accentMessage(ast) {
  return [{ type: LITERAL, value: '[' }, ...mapLiterals(ast, accent), { type: LITERAL, value: ']' }]
}

// U+202E RIGHT-TO-LEFT OVERRIDE and U+202C POP DIRECTIONAL FORMATTING show the letters between them
// in reverse order, as a right-to-left script would run.
export function mirrorMessage(ast) {
  return mapLiterals(ast, (text) => text.replace(/[^\s]+/g, (word) => `\u202e${word}\u202c`))
}

// Made-up languages for testing before real translations exist, named like Chromium's: en-XA is accented
// and about 40% longer, and ar-XB runs right to left. English left on the page then stands out.

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
        Object.entries(node.options).map(([key, option]) => [
          key,
          { ...option, value: mapLiterals(option.value, change) },
        ]),
      )
      return { ...node, options }
    }
    if (node.type === TAG) return { ...node, children: mapLiterals(node.children, change) }
    return node
  })
}

// Pads each piece of text, not the whole message, so each option of a select or plural keeps its own length.
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

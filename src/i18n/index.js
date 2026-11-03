import { Fragment, createElement } from 'react'
import { IntlMessageFormat } from 'intl-messageformat'
import en from './en.js'
import { accentMessage, mirrorMessage } from './pseudo.js'

// `formats` is the locale for numbers, plurals and lists. Pseudo-locales are only used when the address
// asks for them, like ?lang=en-XA, never from browser settings.
export const LOCALES = {
  en: { messages: en, dir: 'ltr', formats: 'en' },
  'en-XA': { messages: en, dir: 'ltr', formats: 'en', pseudo: accentMessage },
  'ar-XB': { messages: en, dir: 'rtl', formats: 'en', pseudo: mirrorMessage },
}
const FROM_BROWSER = ['en']

function canonical(tag) {
  try {
    return Intl.getCanonicalLocales(tag)[0]
  } catch {
    return null
  }
}

// The address wins, then the first browser language the editor has, then English.
export function pickLocale(search = '', languages = []) {
  const asked = canonical(new URLSearchParams(search).get('lang') ?? '')
  if (asked && Object.hasOwn(LOCALES, asked)) return asked
  for (const language of languages) {
    const tag = canonical(language)
    if (!tag) continue
    const match = [tag, tag.split('-')[0]].find((candidate) => FROM_BROWSER.includes(candidate))
    if (match) return match
  }
  return 'en'
}

// Everything the components need to show text in one language. Each message is parsed on first use.
export function createI18n(localeId = 'en') {
  const id = Object.hasOwn(LOCALES, localeId) ? localeId : 'en'
  const locale = LOCALES[id]
  const formatters = new Map()
  const lists = new Map()

  function formatter(key) {
    let format = formatters.get(key)
    if (!format) {
      // A language missing a message falls back to English rather than showing nothing.
      const message = locale.messages[key] ?? en[key]
      if (message === undefined) throw new Error(`There's no message called ${key}.`)
      const source = locale.pseudo ? locale.pseudo(new IntlMessageFormat(message, 'en').getAst()) : message
      format = new IntlMessageFormat(source, locale.formats)
      formatters.set(key, format)
    }
    return format
  }

  // Plain text, for labels, announcements and anything else that's a string.
  function t(key, values) {
    const text = formatter(key).format(values)
    if (typeof text !== 'string') throw new Error(`${key} has tags, so it needs rich() instead of t().`)
    return text
  }

  // Text with tags, like <b>...</b>, turned into React elements by the functions in `values`.
  function rich(key, values) {
    const parts = formatter(key).format(values)
    return Array.isArray(parts) ? parts.map((part, i) => createElement(Fragment, { key: i }, part)) : parts
  }

  // "a, b, and c" for type 'conjunction', or "a, b, c" for 'unit', in the language's own style.
  function list(items, type = 'conjunction') {
    let format = lists.get(type)
    if (!format) {
      format = new Intl.ListFormat(locale.formats, { type, style: type === 'unit' ? 'short' : 'long' })
      lists.set(type, format)
    }
    return format.format(items)
  }

  return {
    id,
    dir: locale.dir,
    t,
    rich,
    list,
    lower: (text) => text.toLocaleLowerCase(locale.formats),
  }
}

// The page's language and direction tell screen readers which voice to use and browsers how to lay out text.
export function applyToDocument(i18n, doc = document) {
  doc.documentElement.lang = i18n.id
  doc.documentElement.dir = i18n.dir
  doc.title = i18n.t('app.title')
}

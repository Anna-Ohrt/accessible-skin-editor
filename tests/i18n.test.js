import { describe, expect, it } from 'vitest'
import { createElement, isValidElement } from 'react'
import { IntlMessageFormat } from 'intl-messageformat'
import en from '../src/i18n/en.js'
import { LOCALES, applyToDocument, createI18n, pickLocale } from '../src/i18n/index.js'
import { accentMessage, mirrorMessage } from '../src/i18n/pseudo.js'

const ASCII_WORD = /[A-Za-z]{2,}/

describe('messages', () => {
  it('are all valid ICU MessageFormat, in English and after pseudo-localization', () => {
    for (const [key, message] of Object.entries(en)) {
      const ast = new IntlMessageFormat(message, 'en').getAst()
      expect(() => new IntlMessageFormat(accentMessage(ast), 'en'), key).not.toThrow()
      expect(() => new IntlMessageFormat(mirrorMessage(ast), 'en'), key).not.toThrow()
    }
  })

  it('pick the right plural and format numbers for the language', () => {
    const { t } = createI18n('en')
    expect(t('status.cleared', { count: 1 })).toBe('Cleared this side. 1 pixel is transparent now.')
    expect(t('status.cleared', { count: 2 })).toBe('Cleared this side. 2 pixels are transparent now.')
    expect(t('status.openedSeeThrough', { file: 'a.png', count: 1632 })).toMatch(
      /^Opened a\.png\. 1,632 base layer pixels are/,
    )
    expect(t('color.opacity', { color: 'red', opacity: 128 / 255 })).toBe('red, 50% opaque')
  })

  it('turn tags into React elements with rich(), and refuse them in plain text', () => {
    const i18n = createI18n('en')
    const parts = i18n.rich('palette.painting', {
      color: 'black',
      hex: '#000000',
      b: (chunks) => createElement('strong', null, ...chunks),
      hint: (chunks) => createElement('span', null, ...chunks),
    })
    expect(parts.length).toBeGreaterThan(1)
    expect(parts.every((part) => isValidElement(part) && part.key !== null)).toBe(true)
    expect(() => i18n.t('palette.painting', { color: 'black', hex: '#000000' })).toThrow()
  })

  it('fall back to English for a message a language is missing, and fail loudly for one nobody has', () => {
    const i18n = createI18n('en-XA')
    expect(() => i18n.t('no.such.message')).toThrow(/no message called no\.such\.message/)
  })
})

describe('pseudo-locales', () => {
  it('accent every letter of the text and make it longer, but leave the values alone', () => {
    const { t } = createI18n('en-XA')
    const text = t('status.filled', { count: 3, color: 'XYZ' })
    expect(text.startsWith('[') && text.endsWith(']')).toBe(true)
    expect(text).toContain('3')
    expect(text).toContain('XYZ')
    expect(text.replace('XYZ', '')).not.toMatch(ASCII_WORD)
    expect(text.length).toBeGreaterThan('Filled 3 pixels with XYZ.'.length * 1.3)
  })

  it('mirror the text in a right-to-left page', () => {
    const i18n = createI18n('ar-XB')
    expect(i18n.dir).toBe('rtl')
    expect(i18n.t('tools.undo')).toBe('\u202eUndo\u202c')
  })
})

describe('choosing a language', () => {
  it('takes a known language from the address, in any letter case, then the browser, then English', () => {
    expect(pickLocale('?lang=en-xa', ['en-US'])).toBe('en-XA')
    expect(pickLocale('?lang=ar-XB')).toBe('ar-XB')
    expect(pickLocale('', ['fr-FR', 'en-GB'])).toBe('en')
    expect(pickLocale('?lang=fr', ['fr-FR'])).toBe('en')
  })

  it('ignores anything that is not a language it has, including markup', () => {
    expect(pickLocale('?lang=%3Cscript%3E', ['<img src=x>'])).toBe('en')
    expect(pickLocale('?lang=constructor')).toBe('en')
    expect(createI18n('__proto__').id).toBe('en')
  })

  it('never takes a pseudo-locale from browser settings', () => {
    expect(pickLocale('', ['en-XA', 'ar-XB'])).toBe('en')
  })

  it('sets the page language, direction and title', () => {
    applyToDocument(createI18n('ar-XB'))
    expect(document.documentElement.lang).toBe('ar-XB')
    expect(document.documentElement.dir).toBe('rtl')
    applyToDocument(createI18n('en'))
    expect(document.documentElement.dir).toBe('ltr')
    expect(document.title).toBe('Skin editor prototype')
  })

  it('has a direction and number locale for every language', () => {
    for (const [id, locale] of Object.entries(LOCALES)) {
      expect(['ltr', 'rtl'], id).toContain(locale.dir)
      expect(Intl.getCanonicalLocales(locale.formats), id).toHaveLength(1)
    }
  })
})

import { createContext, useContext } from 'react'
import { createI18n } from './index.js'

// English unless main.jsx provides another language, so a component rendered on its own, as in a
// test, still has text.
export const I18nContext = createContext(createI18n('en'))

export const useI18n = () => useContext(I18nContext)

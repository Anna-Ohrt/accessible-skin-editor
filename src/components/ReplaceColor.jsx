import { useMemo, useState } from 'react'
import { useI18n } from '../i18n/context.js'
import { colorChoices } from '../i18n/words.js'
import { allFaces } from '../skin/layout.js'
import { countColors } from '../skin/pixels.js'
import { SelectField } from './fields.jsx'

// Swaps one color for the paint color on every side and both layers, so recoloring a shirt is one
// step instead of a fill on each side.
export default function ReplaceColor({ pixels, model, paint, paintName, nameOf, onAction }) {
  const i18n = useI18n()
  const { t } = i18n
  const colors = useMemo(
    () => colorChoices(i18n, countColors(pixels, allFaces(model)), nameOf),
    [i18n, pixels, model, nameOf],
  )
  const [chosen, setChosen] = useState(null)
  if (colors.length === 0) return null
  const from = colors.find(({ color }) => color === chosen) ?? colors.find(({ color }) => color !== paint) ?? colors[0]

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onAction({ type: 'replace', from: from.color })
      }}
    >
      <SelectField
        label={t('tools.replaceLabel')}
        value={String(from.color)}
        options={colors.map(({ color, count, name }) => ({
          value: String(color),
          label: t('tools.replaceOption', { color: name, count }),
        }))}
        onChange={(value) => setChosen(Number(value))}
      />
      <button type="submit">{t('tools.replace', { from: from.name, color: paintName })}</button>
    </form>
  )
}

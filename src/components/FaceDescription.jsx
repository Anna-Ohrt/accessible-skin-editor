import { memo } from 'react'
import { useI18n } from '../i18n/context.js'
import { describeArea, describeFace, describeLine } from '../i18n/words.js'
import { findAreas, rowOf } from '../skin/pixels.js'

// The side in words: a count of each color, each area of one color, then every row. Screen reader users
// can read it like any text, and it's a quick check for everyone else.
export default memo(function FaceDescription({ pixels, face, nameOf }) {
  const i18n = useI18n()
  return (
    <>
      <p>{describeFace(i18n, pixels, face, nameOf)}</p>
      <h3>{i18n.t('words.areasHeading')}</h3>
      <ul className="row-list">
        {findAreas(pixels, face, nameOf).map((area, i) => (
          <li key={i}>{describeArea(i18n, area)}</li>
        ))}
      </ul>
      <h3>{i18n.t('words.rowsHeading')}</h3>
      <ul className="row-list">
        {Array.from({ length: face.h }, (_, row) => (
          <li key={row}>
            {i18n.t('words.row', { row: row + 1, line: describeLine(i18n, rowOf(pixels, face, row), nameOf) })}
          </li>
        ))}
      </ul>
    </>
  )
})

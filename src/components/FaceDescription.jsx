import { memo } from 'react'
import { useI18n } from '../i18n/context.js'
import { describeFace, describeLine } from '../i18n/words.js'
import { rowOf } from '../skin/pixels.js'

// The side in words: a count of each color, then every row. Screen reader users can read it like
// any text, and it's a quick check for everyone else.
export default memo(function FaceDescription({ pixels, face, nameOf }) {
  const i18n = useI18n()
  return (
    <>
      <p>{describeFace(i18n, pixels, face, nameOf)}</p>
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

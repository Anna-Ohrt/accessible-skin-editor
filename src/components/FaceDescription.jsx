import { describeFace, describeLine, rowOf } from '../skin/pixels.js'

// The side in words: a count of each color, then every row. Screen reader users can read it like
// any text, and it's a quick check for everyone else.
export default function FaceDescription({ pixels, face, nameOf }) {
  return (
    <>
      <p>{describeFace(pixels, face, nameOf)}</p>
      <ul className="row-list">
        {Array.from({ length: face.h }, (_, row) => (
          <li key={row}>
            Row {row + 1}: {describeLine(rowOf(pixels, face, row), nameOf)}
          </li>
        ))}
      </ul>
    </>
  )
}

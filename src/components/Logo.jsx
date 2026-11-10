import { getFace } from '../skin/layout.js'
import { createSampleSkin, getCell } from '../skin/pixels.js'
import { toCss } from '../skin/color.js'

// The editor's mark is the sample character's face, pixel for pixel. It's decoration, so screen readers skip it.
const FACE = getFace('head', 'front', 'base')
const SAMPLE = createSampleSkin()
const SPOTS = Array.from({ length: FACE.w * FACE.h }, (_, i) => {
  const col = i % FACE.w
  const row = Math.floor(i / FACE.w)
  return { col, row, color: toCss(getCell(SAMPLE, FACE, col, row)) }
})

export default function Logo() {
  return (
    <svg className="logo" viewBox={`0 0 ${FACE.w} ${FACE.h}`} shapeRendering="crispEdges" aria-hidden="true">
      {SPOTS.map(({ col, row, color }) => (
        <rect key={`${col},${row}`} x={col} y={row} width="1" height="1" fill={color} />
      ))}
    </svg>
  )
}

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { VIEWS, composeView, describeView } from '../skin/views.js'
import { pixelsToBytes } from '../skin/png.js'

const SCALE = 8

// Draws colors onto a canvas at a whole-number scale, with no smoothing, so pixels stay square.
export function drawPixels(canvas, data, width, height) {
  const context = canvas?.getContext?.('2d')
  if (!context) return null
  const buffer = document.createElement('canvas')
  buffer.width = width
  buffer.height = height
  buffer.getContext('2d').putImageData(new ImageData(pixelsToBytes(data), width, height), 0, 0)
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.imageSmoothingEnabled = false
  context.drawImage(buffer, 0, 0, canvas.width, canvas.height)
  return context
}

// A flat picture of the character from four sides. Turning it uses buttons, not dragging
// (WCAG 2.5.7), and the picture has a written description generated from its pixels.
export default function Preview({ pixels, model, nameOf }) {
  const id = useId()
  const canvasRef = useRef(null)
  const [viewId, setViewId] = useState('front')
  const [showOuter, setShowOuter] = useState(true)
  const view = useMemo(() => composeView(pixels, viewId, model, { showOuter }), [pixels, viewId, model, showOuter])
  const viewName = VIEWS.find((item) => item.id === viewId).name

  useEffect(() => {
    drawPixels(canvasRef.current, view.data, view.width, view.height)
  }, [view])

  return (
    <>
      <fieldset className="view-choice">
        <legend>View</legend>
        {VIEWS.map((item) => (
          <label key={item.id} className="choice">
            <input type="radio" name={`${id}-view`} checked={viewId === item.id} onChange={() => setViewId(item.id)} />
            {item.name}
          </label>
        ))}
      </fieldset>
      <label className="choice">
        <input type="checkbox" checked={showOuter} onChange={(event) => setShowOuter(event.target.checked)} />
        Show the outer layer
      </label>
      <figure className="preview">
        {/* The figcaption is the long description, tied to the picture by the figure (W3C WAI
            Images tutorial, complex images). No aria-describedby, so it isn't read twice. */}
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`${viewName} view of the skin`}
          width={view.width * SCALE}
          height={view.height * SCALE}
        />
        <figcaption>{describeView(view, nameOf)}</figcaption>
      </figure>
    </>
  )
}

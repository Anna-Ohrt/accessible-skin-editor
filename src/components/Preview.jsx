import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { VIEWS, composeView, describeView } from '../skin/views.js'
import { pixelsToBytes } from '../skin/png.js'
import { ANGLES } from '../skin/camera.js'
import Model3D, { webglAvailable } from './Model3D.jsx'

const SCALE = 8
const SEEN_FROM = { front: 'the front', right: 'the right side', back: 'the back', left: 'the left side' }
const SEEN_AT = { level: '', above: ' and above', below: ' and below' }

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

// The character as a 3D model or as flat pictures from four sides. Either way the View choices
// turn it, so nobody has to drag (WCAG 2.5.7), and the caption describes it in words.
export default function Preview({ pixels, model, nameOf, face, onPickSpot }) {
  const id = useId()
  const canvasRef = useRef(null)
  const [canShow3D, setCanShow3D] = useState(webglAvailable)
  const [style, setStyle] = useState('3d')
  const [viewId, setViewId] = useState('front')
  const [angleId, setAngleId] = useState('level')
  const [showOuter, setShowOuter] = useState(true)
  const [outline, setOutline] = useState(true)
  const [follow, setFollow] = useState(true)
  const [pointing, setPointing] = useState(null)
  const is3D = style === '3d' && canShow3D
  const view = useMemo(() => composeView(pixels, viewId, model, { showOuter }), [pixels, viewId, model, showOuter])
  const viewName = VIEWS.find((item) => item.id === viewId).name

  useEffect(() => {
    if (!is3D) drawPixels(canvasRef.current, view.data, view.width, view.height)
  }, [view, is3D])

  // Turns to the side being edited, so its outline and the new paint are in sight. Tops are seen
  // from above and bottoms from below.
  const faceId = face?.id
  useEffect(() => {
    if (!follow || !face) return
    if (face.sideId === 'top') setAngleId('above')
    else if (face.sideId === 'bottom') setAngleId('below')
    else {
      setViewId(face.sideId)
      setAngleId('level')
    }
    // face is read through faceId, which names it completely.
  }, [faceId, follow]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <fieldset className="view-choice">
        <legend>Show the skin as</legend>
        <label className="choice">
          <input type="radio" name={`${id}-style`} checked={is3D} disabled={!canShow3D} onChange={() => setStyle('3d')} />
          3D model
        </label>
        <label className="choice">
          <input type="radio" name={`${id}-style`} checked={!is3D} onChange={() => setStyle('flat')} />
          Flat pictures
        </label>
      </fieldset>
      {!canShow3D && (
        <p className="hint">The 3D model needs WebGL, which this browser can&rsquo;t use right now, so it shows flat pictures.</p>
      )}
      <fieldset className="view-choice">
        <legend>View</legend>
        {VIEWS.map((item) => (
          <label key={item.id} className="choice">
            <input type="radio" name={`${id}-view`} checked={viewId === item.id} onChange={() => setViewId(item.id)} />
            {item.name}
          </label>
        ))}
      </fieldset>
      {is3D && (
        <fieldset className="view-choice">
          <legend>Angle</legend>
          {ANGLES.map((angle) => (
            <label key={angle.id} className="choice">
              <input type="radio" name={`${id}-angle`} checked={angleId === angle.id} onChange={() => setAngleId(angle.id)} />
              {angle.name}
            </label>
          ))}
        </fieldset>
      )}
      <label className="choice">
        <input type="checkbox" checked={showOuter} onChange={(event) => setShowOuter(event.target.checked)} />
        Show the outer layer
      </label>
      <label className="choice">
        <input type="checkbox" checked={follow} onChange={(event) => setFollow(event.target.checked)} />
        Turn to the side you&rsquo;re editing
      </label>
      {is3D && (
        <label className="choice">
          <input type="checkbox" checked={outline} onChange={(event) => setOutline(event.target.checked)} />
          Outline the side you&rsquo;re editing
        </label>
      )}
      <figure className="preview">
        {/* The figcaption is the long description, tied to the picture by the figure (W3C WAI
            Images tutorial, complex images). No aria-describedby, so it isn't read twice. */}
        {is3D ? (
          <Model3D
            pixels={pixels}
            model={model}
            face={face}
            showOuter={showOuter}
            outline={outline}
            viewId={viewId}
            angleId={angleId}
            label={`3D model of the skin, seen from ${SEEN_FROM[viewId]}${SEEN_AT[angleId]}`}
            onTurn={(nextView, nextAngle) => {
              setViewId(nextView)
              setAngleId(nextAngle)
            }}
            onPick={(spot) => {
              setPointing(null)
              onPickSpot(spot)
            }}
            onPoint={setPointing}
            onUnavailable={() => setCanShow3D(false)}
          />
        ) : (
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`${viewName} view of the skin`}
            width={view.width * SCALE}
            height={view.height * SCALE}
          />
        )}
        <figcaption>{describeView(view, nameOf)}</figcaption>
      </figure>
      {is3D && (
        <p className="hint">
          {pointing
            ? `Pointing at ${pointing.face.label}, row ${pointing.row + 1}, column ${pointing.col + 1}.`
            : 'Drag the model to turn it. Click a spot on it to edit that spot.'}
        </p>
      )}
    </>
  )
}

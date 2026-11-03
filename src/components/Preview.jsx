import { Suspense, lazy, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n/context.js'
import { describeView, faceLabel } from '../i18n/words.js'
import { VIEWS, composeView } from '../skin/views.js'
import { ANGLES } from '../skin/camera.js'
import ErrorBoundary from './ErrorBoundary.jsx'
import { drawPixels, webglAvailable } from './draw.js'

// three.js is most of the code, so it loads only when the 3D model is shown, after the rest of the
// editor works.
const Model3D = lazy(() => import('./Model3D.jsx'))

const SCALE = 8

// The view and angle that show a side: tops from above, bottoms from below, the rest straight on.
function viewFor(sideId, current) {
  if (sideId === 'top') return { viewId: current.viewId, angleId: 'above' }
  if (sideId === 'bottom') return { viewId: current.viewId, angleId: 'below' }
  return { viewId: sideId, angleId: 'level' }
}

// The character as a 3D model or as flat pictures from four sides. Either way the View choices
// turn it, so nobody has to drag (WCAG 2.5.7), and the caption describes it in words.
export default function Preview({ pixels, model, nameOf, face, onPickSpot }) {
  const id = useId()
  const i18n = useI18n()
  const { t } = i18n
  const canvasRef = useRef(null)
  // Why the 3D model isn't showing: 'noWebgl', 'lost' (the graphics were reset) or 'failed'.
  const [problem, setProblem] = useState(() => (webglAvailable() ? null : 'noWebgl'))
  const [style, setStyle] = useState('3d')
  const [camera, setCamera] = useState({ viewId: 'front', angleId: 'level' })
  const [showOuter, setShowOuter] = useState(true)
  const [outline, setOutline] = useState(true)
  const [follow, setFollow] = useState(true)
  const [pointing, setPointing] = useState(null)
  const can3D = problem !== 'noWebgl' && problem !== 'failed'
  const is3D = style === '3d' && can3D
  const { viewId, angleId } = camera
  const view = useMemo(() => composeView(pixels, viewId, model, { showOuter }), [pixels, viewId, model, showOuter])
  const caption = useMemo(() => describeView(i18n, view, nameOf), [i18n, view, nameOf])

  // Turns to the side being edited, so its outline and the new paint are in sight. This updates
  // during render, as the React docs suggest for state that follows a prop.
  const followKey = follow ? face.id : null
  const [followed, setFollowed] = useState(followKey)
  if (followKey !== followed) {
    setFollowed(followKey)
    if (followKey) setCamera(viewFor(face.sideId, camera))
  }

  useEffect(() => {
    if (!is3D) drawPixels(canvasRef.current, view.data, view.width, view.height)
  }, [view, is3D])

  return (
    <>
      <fieldset className="view-choice">
        <legend>{t('preview.style')}</legend>
        <label className="choice">
          <input
            type="radio"
            name={`${id}-style`}
            checked={is3D}
            disabled={!can3D}
            onChange={() => {
              setStyle('3d')
              if (problem === 'lost') setProblem(null)
            }}
          />
          {t('preview.model')}
        </label>
        <label className="choice">
          <input type="radio" name={`${id}-style`} checked={!is3D} onChange={() => setStyle('flat')} />
          {t('preview.flat')}
        </label>
      </fieldset>
      {problem && <p className="hint">{t(`preview.${problem}`)}</p>}
      <fieldset className="view-choice">
        <legend>{t('preview.view')}</legend>
        {VIEWS.map((item) => (
          <label key={item} className="choice">
            <input
              type="radio"
              name={`${id}-view`}
              checked={viewId === item}
              onChange={() => setCamera((current) => ({ ...current, viewId: item }))}
            />
            {t(`view.${item}`)}
          </label>
        ))}
      </fieldset>
      {is3D && (
        <fieldset className="view-choice">
          <legend>{t('preview.angle')}</legend>
          {ANGLES.map((angle) => (
            <label key={angle.id} className="choice">
              <input
                type="radio"
                name={`${id}-angle`}
                checked={angleId === angle.id}
                onChange={() => setCamera((current) => ({ ...current, angleId: angle.id }))}
              />
              {t(`angle.${angle.id}`)}
            </label>
          ))}
        </fieldset>
      )}
      <label className="choice">
        <input type="checkbox" checked={showOuter} onChange={(event) => setShowOuter(event.target.checked)} />
        {t('preview.showOuter')}
      </label>
      <label className="choice">
        <input type="checkbox" checked={follow} onChange={(event) => setFollow(event.target.checked)} />
        {t('preview.follow')}
      </label>
      {is3D && (
        <label className="choice">
          <input type="checkbox" checked={outline} onChange={(event) => setOutline(event.target.checked)} />
          {t('preview.outline')}
        </label>
      )}
      <figure className="preview">
        {/* The figcaption is the long description, tied to the picture by the figure (W3C WAI
            Images tutorial, complex images). No aria-describedby, so it isn't read twice. */}
        {is3D ? (
          <ErrorBoundary onError={() => setProblem('failed')}>
            <Suspense
              fallback={
                <div className="model-wrap is-loading">
                  <p className="hint">{t('preview.loading')}</p>
                </div>
              }
            >
              <Model3D
                pixels={pixels}
                model={model}
                face={face}
                showOuter={showOuter}
                outline={outline}
                viewId={viewId}
                angleId={angleId}
                label={t('preview.modelLabel', { view: viewId, angle: angleId })}
                onTurn={(nextView, nextAngle) => setCamera({ viewId: nextView, angleId: nextAngle })}
                onPick={(spot) => {
                  setPointing(null)
                  onPickSpot(spot)
                }}
                onPoint={setPointing}
                onUnavailable={() => setProblem('noWebgl')}
                onLost={() => {
                  setStyle('flat')
                  setProblem('lost')
                }}
              />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <canvas
            ref={canvasRef}
            // ARIA in HTML allows any role on a canvas, but this lint rule counts canvas as interactive.
            // eslint-disable-next-line jsx-a11y/no-interactive-element-to-noninteractive-role
            role="img"
            aria-label={t('preview.flatLabel', { view: viewId })}
            width={view.width * SCALE}
            height={view.height * SCALE}
          />
        )}
        <figcaption>{caption}</figcaption>
      </figure>
      {is3D && (
        <p className="hint">
          {pointing
            ? t('preview.pointing', { face: faceLabel(i18n, pointing.face), row: pointing.row + 1, col: pointing.col + 1 })
            : t('preview.hint')}
        </p>
      )}
    </>
  )
}

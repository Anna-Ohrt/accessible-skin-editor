import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n/context.js'
import { describeView, faceLabel } from '../i18n/words.js'
import { VIEWS, composeView } from '../skin/views.js'
import { ANGLES } from '../skin/camera.js'
import ErrorBoundary from './ErrorBoundary.jsx'
import { Checkbox, Choices } from './fields.jsx'
import { drawPixels, webglAvailable } from './canvas.js'

// Babylon.js is most of the code, so it loads only when the 3D model is shown.
const Model3D = lazy(() => import('./Model3D.jsx'))

const SCALE = 8

// True once the element is within half a screen of the viewport. On a phone the preview is far down the
// page, so the 3D model's loading waits until someone gets near it instead of slowing the start.
function useNearViewport(ref) {
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    if (near) return undefined
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setNear(true), {
      rootMargin: '50% 0px',
    })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [near, ref])
  return near
}

// The view and angle that show a side: tops from above, bottoms from below, the rest straight on.
function viewFor(sideId, current) {
  if (sideId === 'top') return { viewId: current.viewId, angleId: 'above' }
  if (sideId === 'bottom') return { viewId: current.viewId, angleId: 'below' }
  return { viewId: sideId, angleId: 'level' }
}

// The character as a 3D model or as flat pictures. The View choices turn it without dragging (WCAG 2.5.7),
// and the caption describes it in words.
export default function Preview({ pixels, model, nameOf, face, onPickSpot }) {
  const i18n = useI18n()
  const { t } = i18n
  const canvasRef = useRef(null)
  const figureRef = useRef(null)
  const near = useNearViewport(figureRef)
  // Why the 3D model isn't showing: 'noWebgl', 'failed', or 'lost' when the graphics were reset.
  const [problem, setProblem] = useState(() => (webglAvailable() ? null : 'noWebgl'))
  const [style, setStyle] = useState('3d')
  const [camera, setCamera] = useState({ viewId: 'front', angleId: 'level' })
  const [showOuter, setShowOuter] = useState(true)
  const [outline, setOutline] = useState(true)
  const [follow, setFollow] = useState(true)
  const [pointing, setPointing] = useState(null)
  const is3D = style === '3d' && !problem
  const { viewId, angleId } = camera
  const view = useMemo(() => composeView(pixels, viewId, model, { showOuter }), [pixels, viewId, model, showOuter])
  const caption = useMemo(() => describeView(i18n, view, nameOf), [i18n, view, nameOf])

  // Turns to the side being edited, so its outline and new paint are in sight.
  const followKey = follow ? face.id : null
  const [followed, setFollowed] = useState(followKey)
  if (followKey !== followed) {
    setFollowed(followKey)
    if (followKey) setCamera(viewFor(face.sideId, camera))
  }

  useEffect(() => {
    if (!is3D) drawPixels(canvasRef.current, view.data, view.width, view.height)
  }, [view, is3D])

  const loading = (
    <div className="model-wrap is-loading">
      <p className="hint">{t('preview.loading')}</p>
    </div>
  )

  return (
    <>
      <Choices
        className="view-choice"
        legend={t('preview.style')}
        options={[
          { value: '3d', label: t('preview.model'), disabled: problem === 'noWebgl' || problem === 'failed' },
          { value: 'flat', label: t('preview.flat') },
        ]}
        value={is3D ? '3d' : 'flat'}
        onChange={(next) => {
          setStyle(next)
          if (next === '3d') setProblem(null)
        }}
      />
      {problem && <p className="hint">{t(`preview.${problem}`)}</p>}
      <Choices
        className="view-choice"
        legend={t('preview.view')}
        options={VIEWS.map((item) => ({ value: item, label: t(`view.${item}`) }))}
        value={viewId}
        onChange={(next) => setCamera((current) => ({ ...current, viewId: next }))}
      />
      {is3D && (
        <Choices
          className="view-choice"
          legend={t('preview.angle')}
          options={ANGLES.map((angle) => ({ value: angle.id, label: t(`angle.${angle.id}`) }))}
          value={angleId}
          onChange={(next) => setCamera((current) => ({ ...current, angleId: next }))}
        />
      )}
      <Checkbox checked={showOuter} onChange={setShowOuter}>
        {t('preview.showOuter')}
      </Checkbox>
      <Checkbox checked={follow} onChange={setFollow}>
        {t('preview.follow')}
      </Checkbox>
      {is3D && (
        <Checkbox checked={outline} onChange={setOutline}>
          {t('preview.outline')}
        </Checkbox>
      )}
      {/* The figure ties the caption to the picture (W3C WAI Images tutorial), so it isn't read twice. */}
      <figure className="preview" ref={figureRef}>
        {is3D && !near && loading}
        {is3D && near && (
          <ErrorBoundary onError={() => setProblem('failed')}>
            <Suspense fallback={loading}>
              <Model3D
                pixels={pixels}
                model={model}
                face={face}
                showOuter={showOuter}
                outline={outline}
                viewId={viewId}
                angleId={angleId}
                label={t('preview.modelLabel', { view: viewId, angle: angleId })}
                onTurn={setCamera}
                onPick={(spot) => {
                  setPointing(null)
                  onPickSpot(spot)
                }}
                onPoint={setPointing}
                onProblem={setProblem}
              />
            </Suspense>
          </ErrorBoundary>
        )}
        {!is3D && (
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
            ? t('preview.pointing', {
                face: faceLabel(i18n, pointing.face),
                row: pointing.row + 1,
                col: pointing.col + 1,
              })
            : t('preview.hint')}
        </p>
      )}
    </>
  )
}

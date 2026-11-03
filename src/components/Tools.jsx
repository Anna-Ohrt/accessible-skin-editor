import { useId, useState } from 'react'
import { allFaces } from '../skin/layout.js'

// Whole-side tools, so nobody has to paint pixel by pixel to make big changes.
export default function Tools({ face, model, paintName, canUndo, canRedo, onTool }) {
  const id = useId()
  const targets = allFaces(model).filter((item) => item.id !== face.id && item.w === face.w && item.h === face.h)
  const [targetId, setTargetId] = useState('')
  const [flip, setFlip] = useState(false)
  const target = targets.find((item) => item.id === targetId) ?? targets[0]

  return (
    <>
      <div className="button-row">
        <button type="button" onClick={() => onTool({ type: 'fillSide' })}>
          Fill this side with {paintName}
        </button>
        {face.layerId === 'outer' && (
          <button type="button" onClick={() => onTool({ type: 'clearSide' })}>
            Clear this side
          </button>
        )}
      </div>
      {face.w > 1 && (
        <div className="button-row">
          <button type="button" onClick={() => onTool({ type: 'mirror', from: 'left' })}>
            Mirror the left half onto the right
          </button>
          <button type="button" onClick={() => onTool({ type: 'mirror', from: 'right' })}>
            Mirror the right half onto the left
          </button>
        </div>
      )}
      {/* aria-disabled keeps these focusable, so focus isn't lost when the history runs out. */}
      <div className="button-row">
        <button type="button" aria-disabled={!canUndo} onClick={() => onTool({ type: 'undo' })}>
          Undo
        </button>
        <button type="button" aria-disabled={!canRedo} onClick={() => onTool({ type: 'redo' })}>
          Redo
        </button>
      </div>
      {target && (
        <form
          className="copy-form"
          onSubmit={(event) => {
            event.preventDefault()
            onTool({ type: 'copy', target, flip })
          }}
        >
          <div className="field">
            <label htmlFor={`${id}-target`}>Copy this side to</label>
            <select id={`${id}-target`} value={target.id} onChange={(event) => setTargetId(event.target.value)}>
              {targets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <label className="choice">
            <input type="checkbox" checked={flip} onChange={(event) => setFlip(event.target.checked)} />
            Flip it left to right
          </label>
          <button type="submit">Copy</button>
        </form>
      )}
    </>
  )
}

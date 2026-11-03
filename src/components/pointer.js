// A press that moves less than this many pixels is a click, not a drag.
export const DRAG_THRESHOLD = 4

// Tells clicks from drags on `element`, and reports hovering at most once a frame. Returns a function that
// stops listening.
export function trackPointer(element, { onPress, onDrag, onDragEnd, onClick, onHover, onLeave }) {
  let press = null
  let hoverFrame = 0

  // Only a release ends in a click. A cancelled or lost press ends quietly, unless it was a drag.
  function finish(event) {
    const ended = press
    press = null
    if (ended?.dragging) onDragEnd()
    else if (ended && event.type === 'pointerup') onClick(event)
  }

  const listeners = {
    pointerdown(event) {
      if (event.button !== 0) return
      press = { x: event.clientX, y: event.clientY, dragging: false }
      element.setPointerCapture?.(event.pointerId)
      onPress()
    },
    pointermove(event) {
      if (!press) {
        cancelAnimationFrame(hoverFrame)
        hoverFrame = requestAnimationFrame(() => onHover(event))
        return
      }
      // The button was released where the element couldn't hear it.
      if (event.buttons === 0) {
        finish(event)
        return
      }
      const dx = event.clientX - press.x
      const dy = event.clientY - press.y
      if (!press.dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      press.dragging = true
      onDrag(dx, dy)
    },
    pointerup: finish,
    pointercancel: finish,
    pointerleave() {
      cancelAnimationFrame(hoverFrame)
      if (!press) onLeave()
    },
  }
  for (const [type, listener] of Object.entries(listeners)) element.addEventListener(type, listener)
  return () => {
    for (const [type, listener] of Object.entries(listeners)) element.removeEventListener(type, listener)
    cancelAnimationFrame(hoverFrame)
  }
}

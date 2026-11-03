import { describe, expect, it, vi } from 'vitest'
import { DRAG_THRESHOLD, trackPointer } from '../src/components/pointer.js'

function setup() {
  const element = document.createElement('div')
  const calls = {
    onPress: vi.fn(),
    onDrag: vi.fn(),
    onDragEnd: vi.fn(),
    onClick: vi.fn(),
    onHover: vi.fn(),
    onLeave: vi.fn(),
  }
  const stop = trackPointer(element, calls)
  const fire = (type, x = 10, y = 10, buttons = 1) =>
    element.dispatchEvent(new MouseEvent(type, { button: 0, buttons, clientX: x, clientY: y }))
  return { calls, stop, fire }
}

describe('pointer tracking', () => {
  it('counts a press that barely moves as a click', () => {
    const { calls, fire } = setup()
    fire('pointerdown')
    fire('pointermove', 12, 11)
    fire('pointerup', 12, 11, 0)
    expect(calls.onPress).toHaveBeenCalledTimes(1)
    expect(calls.onDrag).not.toHaveBeenCalled()
    expect(calls.onClick).toHaveBeenCalledTimes(1)
  })

  it('drags once the pointer moves far enough, and a drag never ends in a click', () => {
    const { calls, fire } = setup()
    fire('pointerdown')
    fire('pointermove', 10 + DRAG_THRESHOLD, 10)
    fire('pointermove', 10, 10)
    expect(calls.onDrag.mock.calls).toEqual([
      [DRAG_THRESHOLD, 0],
      [0, 0],
    ])
    fire('pointerup', 10, 10, 0)
    expect(calls.onDragEnd).toHaveBeenCalledTimes(1)
    expect(calls.onClick).not.toHaveBeenCalled()
  })

  it('ends a press without a click when the release is missed or cancelled', () => {
    const { calls, fire } = setup()
    fire('pointerdown')
    fire('pointermove', 11, 10, 0)
    fire('pointerup', 11, 10, 0)
    fire('pointerdown')
    fire('pointercancel')
    expect(calls.onClick).not.toHaveBeenCalled()
    expect(calls.onDragEnd).not.toHaveBeenCalled()
  })

  it('reports leaving unless a drag is under way, and stops listening when asked', () => {
    const { calls, stop, fire } = setup()
    fire('pointerleave')
    fire('pointerdown')
    fire('pointerleave')
    expect(calls.onLeave).toHaveBeenCalledTimes(1)
    stop()
    fire('pointerdown')
    expect(calls.onPress).toHaveBeenCalledTimes(1)
  })
})

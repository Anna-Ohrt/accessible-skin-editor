// The tool a click, a drag or Space uses on a pixel. F, I and Delete still fill, pick and erase with any tool.
export const TOOLS = ['pencil', 'fill', 'eraser', 'pick']

// Pencil and Eraser work along a drag or Shift+arrow. Fill and Pick color work on one pixel.
export const draws = (tool) => tool === 'pencil' || tool === 'eraser'

// Pencil and Fill put down the paint color.
export const paints = (tool) => tool === 'pencil' || tool === 'fill'

export function toolAction(tool, cell, extra) {
  switch (tool) {
    case 'fill':
      return { type: 'fill', ...cell, ...extra }
    case 'eraser':
      return { type: 'erase', cells: [cell], ...extra }
    case 'pick':
      return { type: 'pick', ...cell, byTool: true, ...extra }
    default:
      return { type: 'paint', cells: [cell], ...extra }
  }
}

export const strokeAction = (tool, cells, extra) => ({ type: tool === 'eraser' ? 'erase' : 'paint', cells, ...extra })

// Picking up a color goes back to the tool from before, as Microsoft Paint's eyedropper does.
export function chooseTool(state, next) {
  if (next !== 'pick') return { current: next, before: next }
  return { current: 'pick', before: state.current === 'pick' ? state.before : state.current }
}

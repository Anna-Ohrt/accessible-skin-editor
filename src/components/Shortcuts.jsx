export const SHORTCUTS = [
  ['Arrow keys', 'Move one pixel. At an edge, you hear which edge.'],
  ['Home, End', 'Go to the first or last pixel in the row.'],
  ['Ctrl+Home, Ctrl+End', 'Go to the first or last pixel of the side.'],
  ['Page Up, Page Down', 'Go to the top or bottom pixel in the column.'],
  ['Space or Enter', 'Paint the pixel with the paint color.'],
  ['Shift+arrow key', 'Move and paint the pixel you move to.'],
  ['F', 'Fill: paint the connected pixels that match this one.'],
  ['I', 'Pick up this pixel\u2019s color as the paint color.'],
  ['Delete or Backspace', 'Erase the pixel (outer layer only).'],
  ['R', 'Hear the whole row, left to right.'],
  ['C', 'Hear the whole column, top to bottom.'],
  ['Ctrl+Z', 'Undo.'],
  ['Ctrl+Y or Ctrl+Shift+Z', 'Redo.'],
]

export default function Shortcuts() {
  return (
    <>
      <p>These work while a pixel has focus. Letters only work there, so they don't get in the way of typing elsewhere.</p>
      <table className="shortcuts">
        <thead>
          <tr>
            <th scope="col">Keys</th>
            <th scope="col">What they do</th>
          </tr>
        </thead>
        <tbody>
          {SHORTCUTS.map(([keys, action]) => (
            <tr key={keys}>
              <th scope="row">{keys}</th>
              <td>{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

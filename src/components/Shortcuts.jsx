import { useI18n } from '../i18n/context.js'

// Each row is the keys, then what they do. Letter keys are the same in every language, so they're
// written here; everything else comes from the messages. PixelGrid.jsx handles the keys.
const SHORTCUTS = [
  [{ id: 'keys.arrows' }, 'keys.arrowsAction'],
  [{ id: 'keys.homeEnd' }, 'keys.homeEndAction'],
  [{ id: 'keys.ctrlHomeEnd' }, 'keys.ctrlHomeEndAction'],
  [{ id: 'keys.pages' }, 'keys.pagesAction'],
  [{ id: 'keys.paint' }, 'keys.paintAction'],
  [{ id: 'keys.shift' }, 'keys.shiftAction'],
  [{ letter: 'F' }, 'keys.fillAction'],
  [{ letter: 'I' }, 'keys.pickAction'],
  [{ id: 'keys.erase' }, 'keys.eraseAction'],
  [{ letter: 'R' }, 'keys.rowAction'],
  [{ letter: 'C' }, 'keys.columnAction'],
  [{ id: 'keys.undo' }, 'keys.undoAction'],
  [{ id: 'keys.redo' }, 'keys.redoAction'],
]

export default function Shortcuts() {
  const { t } = useI18n()
  return (
    <>
      <p>{t('keys.intro')}</p>
      <table className="shortcuts">
        <thead>
          <tr>
            <th scope="col">{t('keys.keysHeader')}</th>
            <th scope="col">{t('keys.actionHeader')}</th>
          </tr>
        </thead>
        <tbody>
          {SHORTCUTS.map(([keys, action]) => (
            <tr key={action}>
              <th scope="row">{keys.letter ?? t(keys.id)}</th>
              <td>{t(action)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

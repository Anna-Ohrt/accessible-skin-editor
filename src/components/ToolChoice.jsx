import { useI18n } from '../i18n/context.js'
import { TOOLS, TOOL_KEYS } from '../editor/tools.js'
import { Choices } from './fields.jsx'

// What a click, a drag or Space does to a pixel, with undo and redo beside it, as in other skin editors.
// The panel's heading names the choice, so it has no legend of its own.
export default function ToolChoice({ labelledBy, tool, onChange, canUndo, canRedo, onAction }) {
  const { t } = useI18n()
  return (
    <div className="tool-choice">
      {/* Each shows its key "on the element itself", as the W3C's keyboard guide (APG) advises. */}
      <Choices
        labelledBy={labelledBy}
        options={TOOLS.map((id) => ({ value: id, label: t(`tool.${id}`), shortcut: TOOL_KEYS[id]?.toUpperCase() }))}
        value={tool}
        onChange={onChange}
      />
      {/* aria-disabled keeps these focusable, so focus isn't lost when the history runs out. */}
      <div className="button-row">
        <button type="button" aria-disabled={!canUndo} onClick={() => onAction({ type: 'undo' })}>
          {t('tools.undo')} <kbd>{t('tools.undoKey')}</kbd>
        </button>
        <button type="button" aria-disabled={!canRedo} onClick={() => onAction({ type: 'redo' })}>
          {t('tools.redo')} <kbd>{t('tools.redoKey')}</kbd>
        </button>
      </div>
    </div>
  )
}

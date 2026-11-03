import { useId, useRef } from 'react'

export default function FilePanel({ error, paintName, onOpen, onDownload, onStartOver, onPlain }) {
  const id = useId()
  const inputRef = useRef(null)
  return (
    <>
      <div className="field">
        <label htmlFor={`${id}-open`}>Open a skin (a 64 by 64 PNG)</label>
        <input
          id={`${id}-open`}
          ref={inputRef}
          type="file"
          accept="image/png"
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => {
            const [file] = event.target.files
            if (file) onOpen(file)
            // Lets the same file be chosen again.
            event.target.value = ''
          }}
        />
        {error && (
          <p id={`${id}-error`} role="alert" className="error">
            {error}
          </p>
        )}
      </div>
      <div className="button-row">
        <button type="button" onClick={onDownload}>
          Download skin.png
        </button>
        <button type="button" onClick={onStartOver}>
          Start over with the sample skin
        </button>
        <button type="button" onClick={onPlain}>
          Start a plain skin in {paintName}
        </button>
      </div>
      <p className="hint">Your work and settings are saved in this browser as you go.</p>
    </>
  )
}

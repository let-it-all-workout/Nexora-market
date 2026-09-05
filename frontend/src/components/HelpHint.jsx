import { useEffect, useId, useRef, useState } from 'react';

export function HelpHint({ text, label = 'What is this?' }) {
  const [open, setOpen] = useState(false);
  const popupId = useId();
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.key === 'Escape' || !wrapRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('keydown', close);
    document.addEventListener('pointerdown', close);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('pointerdown', close);
    };
  }, [open]);

  return (
    <span className="hintWrap" ref={wrapRef}>
      <button
        type="button"
        className="hintButton"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        aria-label={label}
        aria-expanded={open}
        aria-controls={popupId}
      >
        ?
      </button>
      {open && <span id={popupId} className="hintPopup" role="tooltip">{text}</span>}
    </span>
  );
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useGuide } from '../lib/guide';

const EDGE = 12;

function measureTarget(id) {
  if (!id) return null;
  const node = document.querySelector(`[data-guide="${id}"]`);
  if (!node) return null;
  const rect = node.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return null;
  const top = Math.min(Math.max(EDGE, rect.top), window.innerHeight - EDGE - 40);
  const left = Math.min(Math.max(EDGE, rect.left), window.innerWidth - EDGE - 40);
  const right = Math.max(left + 40, Math.min(window.innerWidth - EDGE, rect.left + rect.width));
  const bottom = Math.max(top + 40, Math.min(window.innerHeight - EDGE, rect.top + rect.height));
  return {
    top,
    left,
    width: right - left,
    height: bottom - top,
  };
}

function isMostlyVisible(node) {
  const rect = node.getBoundingClientRect();
  return rect.top >= 8 && rect.bottom <= window.innerHeight - 8 && rect.width >= 8;
}

function sameBox(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height
    && a.maxHeight === b.maxHeight;
}

function cardBox(hole, measuredHeight) {
  const width = Math.min(400, window.innerWidth - EDGE * 2);
  const maxHeight = window.innerHeight - EDGE * 2;
  const height = Math.min(Math.max(measuredHeight || 280, 160), maxHeight);
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = hole ? hole.left : (vw - width) / 2;
  left = Math.min(Math.max(EDGE, left), vw - width - EDGE);

  let top;
  if (!hole) {
    top = vh - height - EDGE;
  } else {
    const gap = 12;
    const below = hole.top + hole.height + gap;
    const above = hole.top - height - gap;
    if (below + height <= vh - EDGE) top = below;
    else if (above >= EDGE) top = above;
    else top = vh - height - EDGE;
  }
  top = Math.min(Math.max(EDGE, top), vh - height - EDGE);
  return { left, top, width, maxHeight };
}

export function GuidedTour() {
  const { inviteOpen, active, step, total, current, closeInvite, startTour, stopTour, next, prev } = useGuide();
  const [hole, setHole] = useState(null);
  const [cardPos, setCardPos] = useState(null);
  const cardRef = useRef(null);

  useLayoutEffect(() => {
    if (!active || !current) return undefined;
    let cancelled = false;
    let tries = 0;
    let retryId = 0;
    let frame = 0;

    const apply = (nextHole) => {
      setHole((prev) => (sameBox(prev, nextHole) ? prev : nextHole));
      const nextPos = cardBox(nextHole, cardRef.current?.offsetHeight || 0);
      setCardPos((prev) => (sameBox(prev, nextPos) ? prev : nextPos));
    };

    const place = (shouldScroll) => {
      if (cancelled) return false;
      const node = document.querySelector(`[data-guide="${current.target}"]`);
      const nextHole = measureTarget(current.target);
      if (!nextHole) return false;
      if (shouldScroll && node && !isMostlyVisible(node)) {
        node.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      }
      apply(measureTarget(current.target) || nextHole);
      return true;
    };

    cardRef.current?.querySelector('.guideBody')?.scrollTo(0, 0);
    if (!place(true)) {
      const retry = () => {
        if (cancelled) return;
        if (place(true)) return;
        tries += 1;
        if (tries < 20) retryId = window.setTimeout(retry, 50);
      };
      retryId = window.setTimeout(retry, 20);
    }

    const onReflow = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        place(false);
      });
    };
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, { capture: true, passive: true });
    return () => {
      cancelled = true;
      window.clearTimeout(retryId);
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
  }, [active, current]);

  useEffect(() => {
    if (!active && !inviteOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        if (active) stopTour();
        else closeInvite();
      }
      if (!active) return;
      if (event.key === 'ArrowRight' || event.key === 'Enter') next();
      if (event.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, closeInvite, inviteOpen, next, prev, stopTour]);

  if (inviteOpen && !active) {
    return (
      <div className="guideInvite" role="dialog" aria-labelledby="guide-invite-title">
        <button type="button" className="guideInviteClose" onClick={() => closeInvite(true)} aria-label="Dismiss walkthrough">
          ×
        </button>
        <div className="guideInviteMark" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <span className="welcomeLabel">First visit</span>
        <h3 id="guide-invite-title">Walk through the workspace?</h3>
        <p>
          Eleven stops covering how prices, indicators, and unusual-day marks are organised — and where a licensed broker fits.
        </p>
        <div className="guideInviteActions">
          <button type="button" className="guidePrimary" onClick={() => startTour(0)}>
            Start the tour
            <span aria-hidden="true">→</span>
          </button>
          <button type="button" className="textLinkButton" onClick={() => closeInvite(true)}>
            I will explore myself
          </button>
        </div>
      </div>
    );
  }

  if (!active || !current) return null;

  const progress = ((step + 1) / total) * 100;
  const holeStyle = hole
    ? {
      top: hole.top - 10,
      left: hole.left - 10,
      width: hole.width + 20,
      height: hole.height + 20,
      opacity: 1,
    }
    : { top: '40%', left: '30%', width: '40%', height: 80, opacity: 0 };

  return (
    <div className="guideLayer" aria-live="polite">
      <div className={hole ? 'guideShade isDimmed' : 'guideShade'} onClick={stopTour} />
      <div className={hole ? 'guideHole isOn' : 'guideHole'} style={holeStyle} />
      <section
        ref={cardRef}
        className={cardPos ? 'guideCard isAnchored' : 'guideCard'}
        style={cardPos || undefined}
        role="dialog"
        aria-labelledby="guide-step-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="guideProgress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
        <header className="guideCardHead">
          <span className="guideStepBadge">
            {String(step + 1).padStart(2, '0')}
            <small>/ {String(total).padStart(2, '0')}</small>
          </span>
          <button type="button" className="guideSkip" onClick={stopTour}>Skip tour</button>
        </header>
        <div className="guideBody isIn" key={current.id}>
          <h3 id="guide-step-title">{current.title}</h3>
          {current.when && <p className="guideWhen">{current.when}</p>}
          <p className="guideMeaning">{current.meaning}</p>
          {current.points?.length > 0 && (
            <ul className="guidePoints">
              {current.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          )}
          {current.tryThis && (
            <p className="guideTry"><span>In practice</span>{current.tryThis}</p>
          )}
          {current.note && (
            <p className="guideNot"><span>Note</span>{current.note}</p>
          )}
        </div>
        <div className="guideCardActions">
          <button type="button" className="guideGhost" onClick={prev} disabled={step === 0}>Back</button>
          <div className="guideDots" aria-hidden="true">
            {Array.from({ length: total }, (_, index) => (
              <i key={current.id + index} className={index === step ? 'isActive' : index < step ? 'isDone' : ''} />
            ))}
          </div>
          <button type="button" className="guidePrimary" onClick={next}>
            {step === total - 1 ? 'Finish' : 'Next'}
            <span aria-hidden="true">{step === total - 1 ? '✓' : '→'}</span>
          </button>
        </div>
      </section>
    </div>
  );
}

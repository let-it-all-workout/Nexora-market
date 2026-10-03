import { useCallback, useEffect, useRef, useState } from 'react';
import { LogoMark } from './LogoMark';

const HOLD_MS = 2800;
const FADE_MS = 620;
const REDUCED_HOLD_MS = 350;
const SEEN_KEY = 'nexora-intro-seen';
export const INTRO_DONE_EVENT = 'nexora-intro-done';

function introAlreadySeen() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function WelcomeSplash() {
  const [phase, setPhase] = useState(() => (introAlreadySeen() ? 'gone' : 'in'));
  const doneRef = useRef(phase === 'gone');

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* private mode can block storage; the intro still closes */
    }
    window.dispatchEvent(new Event(INTRO_DONE_EVENT));
    setPhase('gone');
  }, []);

  const dismiss = useCallback(() => {
    if (doneRef.current || phase === 'out' || phase === 'gone') return;
    setPhase('out');
  }, [phase]);

  useEffect(() => {
    if (introAlreadySeen()) return undefined;
    document.documentElement.classList.add('intro-open');
    const hold = prefersReducedMotion() ? REDUCED_HOLD_MS : HOLD_MS;
    const fadeTimer = window.setTimeout(() => setPhase('out'), hold);
    return () => {
      window.clearTimeout(fadeTimer);
      document.documentElement.classList.remove('intro-open');
    };
  }, []);

  useEffect(() => {
    if (phase !== 'out') return undefined;
    const goneTimer = window.setTimeout(finish, FADE_MS);
    return () => window.clearTimeout(goneTimer);
  }, [finish, phase]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Enter' || event.key === 'Escape' || event.key === ' ') {
        event.preventDefault();
        dismiss();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismiss]);

  useEffect(() => {
    if (phase === 'gone') document.documentElement.classList.remove('intro-open');
  }, [phase]);

  if (phase === 'gone') return null;

  return (
    <div
      className={phase === 'out' ? 'welcomeIntro isLeaving' : 'welcomeIntro'}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-intro-title"
      aria-describedby="welcome-intro-copy"
    >
      <div className="welcomeIntroGlow" aria-hidden="true" />
      <div className="welcomeIntroOrb welcomeIntroOrb--one" aria-hidden="true" />
      <div className="welcomeIntroOrb welcomeIntroOrb--two" aria-hidden="true" />

      <div className="welcomeIntroInner">
        <div className="welcomeIntroMark">
          <LogoMark gradientId="logoCoreIntro" />
        </div>
        <p className="welcomeIntroEyebrow">Welcome to</p>
        <h1 id="welcome-intro-title" className="welcomeIntroTitle">Nexora Markets</h1>
        <p id="welcome-intro-copy" className="welcomeIntroCopy">
          Price research workspace
        </p>
        <svg className="welcomeIntroSpark" viewBox="0 0 240 48" aria-hidden="true">
          <path d="M4 34 C28 34 36 18 58 22 S92 40 118 26 S162 8 186 16 S214 28 236 12" />
        </svg>
        <span className="welcomeIntroBar" aria-hidden="true" />
      </div>

      <button type="button" className="welcomeIntroSkip" onClick={dismiss}>
        Continue
      </button>
    </div>
  );
}

/* eslint-disable react-refresh/only-export-components -- provider and its hook stay together */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GUIDE_SEEN_KEY, TOUR_STEPS } from './guideContent';
import { INTRO_DONE_EVENT } from '../components/WelcomeSplash';

const GuideContext = createContext(null);

function readSeen() {
  try {
    return localStorage.getItem(GUIDE_SEEN_KEY) === '1';
  } catch {
    return true;
  }
}

function markSeen() {
  try {
    localStorage.setItem(GUIDE_SEEN_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function GuideProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (readSeen()) return undefined;
    const show = () => setInviteOpen(true);
    const fallback = window.setTimeout(show, 4200);
    const onIntro = () => {
      window.clearTimeout(fallback);
      window.setTimeout(show, 280);
    };
    window.addEventListener(INTRO_DONE_EVENT, onIntro);
    return () => {
      window.clearTimeout(fallback);
      window.removeEventListener(INTRO_DONE_EVENT, onIntro);
    };
  }, []);

  const closeInvite = useCallback((remember = true) => {
    setInviteOpen(false);
    if (remember) markSeen();
  }, []);

  const startTour = useCallback((from = 0) => {
    setInviteOpen(false);
    setStep(from);
    setActive(true);
    const target = TOUR_STEPS[from]?.route;
    if (target && target !== location.pathname) navigate(target);
  }, [location.pathname, navigate]);

  const stopTour = useCallback(() => {
    setActive(false);
    markSeen();
  }, []);

  const goTo = useCallback((index) => {
    const next = Math.max(0, Math.min(TOUR_STEPS.length - 1, index));
    setStep(next);
    const target = TOUR_STEPS[next]?.route;
    if (target && target !== location.pathname) navigate(target);
  }, [location.pathname, navigate]);

  const next = useCallback(() => {
    if (step >= TOUR_STEPS.length - 1) {
      stopTour();
      return;
    }
    goTo(step + 1);
  }, [goTo, step, stopTour]);

  const prev = useCallback(() => {
    if (step <= 0) return;
    goTo(step - 1);
  }, [goTo, step]);

  const value = useMemo(() => ({
    inviteOpen,
    active,
    step,
    total: TOUR_STEPS.length,
    current: TOUR_STEPS[step],
    closeInvite,
    startTour,
    stopTour,
    next,
    prev,
  }), [active, closeInvite, inviteOpen, next, prev, startTour, step, stopTour]);

  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
}

export function useGuide() {
  const value = useContext(GuideContext);
  if (!value) throw new Error('useGuide must be used inside GuideProvider');
  return value;
}

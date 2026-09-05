import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';

const TITLES = {
  signup: 'Create an account',
  login: 'Welcome back',
  reset: 'Reset your password',
  'update-password': 'Choose a new password',
};

export function AuthModal() {
  const {
    authOpen, authMode, openAuth, closeAuth, pendingEmail,
    signup, login, requestPasswordReset, updatePassword,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const firstFieldRef = useRef(null);

  const isSignup = authMode === 'signup';
  const isLogin = authMode === 'login';
  const isReset = authMode === 'reset';
  const isUpdatePassword = authMode === 'update-password';
  const showTabs = isSignup || isLogin;

  useEffect(() => {
    if (!authOpen) return undefined;
    firstFieldRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeAuth();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [authOpen, closeAuth]);

  useEffect(() => {
    setError('');
    setNotice('');
    setPassword('');
    setConfirm('');
  }, [authMode]);

  if (!authOpen) return null;

  function switchMode(mode) {
    if (busy) return;
    openAuth(mode);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    if ((isSignup || isUpdatePassword) && password !== confirm) {
      setError('Those passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      if (isSignup) {
        const { needsEmailConfirmation } = await signup({ email, password });
        if (needsEmailConfirmation) {
          setNotice(`Almost there. We sent a confirmation link to ${email} - click it to finish setting up your account.`);
        }
      } else if (isLogin) {
        await login({ email, password });
      } else if (isReset) {
        await requestPasswordReset(email);
        setNotice(`If an account exists for ${email}, a reset link is on its way. The link opens this page again.`);
      } else if (isUpdatePassword) {
        await updatePassword(password);
      }
    } catch (err) {
      setError(err.message || 'Could not continue. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const submitLabel = isSignup ? 'Create account'
    : isLogin ? 'Log in'
      : isReset ? 'Send reset link'
        : 'Save new password';

  // Once the confirmation or reset email is out, the form has nothing more to
  // collect, so show the next step instead of an empty form.
  const awaitingEmail = Boolean(notice) && (isReset || (isSignup && pendingEmail));

  return (
    <div className="trustModalBackdrop" onClick={closeAuth}>
      <section
        className="trustModal authModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="authModalHead">
          <div>
            <span className="welcomeLabel">Account</span>
            <h3 id="auth-modal-title">{TITLES[authMode] || 'Account'}</h3>
          </div>
          <button type="button" className="researchClose" onClick={closeAuth}>Close</button>
        </div>

        {showTabs && (
          <div className="authTabs" role="tablist" aria-label="Account mode">
            <button
              type="button"
              role="tab"
              aria-selected={isLogin}
              className={isLogin ? 'authTab isActive' : 'authTab'}
              onClick={() => switchMode('login')}
            >
              Log in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isSignup}
              className={isSignup ? 'authTab isActive' : 'authTab'}
              onClick={() => switchMode('signup')}
            >
              Sign up
            </button>
          </div>
        )}

        {awaitingEmail ? (
          <div className="authForm">
            <p className="authNotice" role="status">{notice}</p>
            <p className="authFootNote">
              Nothing in your inbox after a minute? Check the spam folder, or{' '}
              <button type="button" className="textLinkButton" onClick={() => switchMode(isReset ? 'reset' : 'signup')}>
                try a different email address
              </button>.
            </p>
          </div>
        ) : (
          <form className="authForm" onSubmit={handleSubmit}>
            {isReset && (
              <p className="authLead">
                Enter the email you signed up with and we will send you a link to set a new password.
              </p>
            )}
            {isUpdatePassword && (
              <p className="authLead">
                You followed a valid reset link. Pick a new password to finish.
              </p>
            )}

            {!isUpdatePassword && (
              <label>
                Email
                <input
                  ref={firstFieldRef}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
            )}

            {!isReset && (
              <label>
                {isUpdatePassword ? 'New password' : 'Password'}
                <input
                  ref={isUpdatePassword ? firstFieldRef : undefined}
                  type="password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  placeholder={isLogin ? '' : 'At least 8 characters'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </label>
            )}

            {(isSignup || isUpdatePassword) && (
              <label>
                Confirm password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  minLength={8}
                  required
                />
              </label>
            )}

            {error && <p className="authError" role="alert">{error}</p>}
            {notice && !awaitingEmail && <p className="authNotice" role="status">{notice}</p>}

            <div className="authFormActions">
              <button type="submit" className="authSubmit" disabled={busy}>
                {busy ? 'Please wait…' : submitLabel}
              </button>
              {isLogin && (
                <button type="button" className="textLinkButton" onClick={() => switchMode('reset')}>
                  Forgot your password?
                </button>
              )}
              {isReset && (
                <button type="button" className="textLinkButton" onClick={() => switchMode('login')}>
                  Back to log in
                </button>
              )}
            </div>
          </form>
        )}

        {!isUpdatePassword && (
          <p className="authFootNote">
            An account is what lets you save a stocks watchlist. Every chart still works without one — close this to keep browsing as a guest.
          </p>
        )}
      </section>
    </div>
  );
}

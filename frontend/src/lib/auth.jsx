/* eslint-disable react-refresh/only-export-components -- provider and its hook stay together */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authErrorMessage, isSupabaseConfigured, supabase } from './supabase';

const AuthContext = createContext(null);

/** Where the reset email should land the user. */
function passwordResetRedirect() {
  return `${window.location.origin}${window.location.pathname}#recovery`;
}

function toAppUser(sessionUser) {
  if (!sessionUser) return null;
  return {
    id: sessionUser.id,
    email: sessionUser.email,
    emailConfirmed: Boolean(sessionUser.email_confirmed_at || sessionUser.confirmed_at),
  };
}

export function AuthProvider({ children }) {
  const [status, setStatus] = useState(isSupabaseConfigured ? 'loading' : 'guest');
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState(null);
  // Set after a signup that needs an email confirmation before it becomes a session.
  const [pendingEmail, setPendingEmail] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    let cancelled = false;
    supabase.auth.getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setUser(toAppUser(data?.session?.user));
        setStatus(data?.session?.user ? 'signed-in' : 'guest');
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setStatus('guest');
      });

    // Fires on sign-in, sign-out, token refresh, and when the user follows a
    // recovery link, which keeps this provider correct across tabs too.
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      setUser(toAppUser(session?.user));
      setStatus(session?.user ? 'signed-in' : 'guest');
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('update-password');
      } else if (event === 'SIGNED_IN') {
        setPendingEmail('');
      }
    });

    return () => {
      cancelled = true;
      subscription?.subscription?.unsubscribe();
    };
  }, []);

  const openAuth = useCallback((mode = 'signup') => {
    const allowed = ['login', 'signup', 'reset', 'update-password'];
    setPendingEmail('');
    setAuthMode(allowed.includes(mode) ? mode : 'signup');
  }, []);

  const closeAuth = useCallback(() => {
    setAuthMode(null);
    setPendingEmail('');
  }, []);

  const requireConfig = useCallback(() => {
    if (!isSupabaseConfigured) {
      throw new Error('Accounts are not configured for this deployment. Keep browsing as a guest.');
    }
  }, []);

  const signup = useCallback(async ({ email, password }) => {
    requireConfig();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw new Error(authErrorMessage(error));

    // With email confirmation switched on, signUp returns a user but no
    // session. Tell the user to check their inbox rather than pretending
    // they are signed in.
    if (!data.session) {
      setPendingEmail(email);
      return { needsEmailConfirmation: true };
    }
    setAuthMode(null);
    return { needsEmailConfirmation: false };
  }, [requireConfig]);

  const login = useCallback(async ({ email, password }) => {
    requireConfig();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(authErrorMessage(error));
    setAuthMode(null);
    return { needsEmailConfirmation: false };
  }, [requireConfig]);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured) {
      // Drop the local session even if the network call fails.
      await supabase.auth.signOut().catch(() => {});
    }
    setUser(null);
    setStatus('guest');
    setAuthMode(null);
  }, []);

  const requestPasswordReset = useCallback(async (email) => {
    requireConfig();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: passwordResetRedirect(),
    });
    // Supabase deliberately succeeds for unknown addresses so this endpoint
    // cannot be used to discover who has an account.
    if (error) throw new Error(authErrorMessage(error));
    setPendingEmail(email);
  }, [requireConfig]);

  const updatePassword = useCallback(async (password) => {
    requireConfig();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(authErrorMessage(error));
    setAuthMode(null);
  }, [requireConfig]);

  /** The current access token, for API calls that need to prove who the user is. */
  const accessToken = useCallback(async () => {
    if (!isSupabaseConfigured) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  }, []);

  const value = useMemo(() => ({
    status,
    user,
    isSignedIn: status === 'signed-in',
    accountsEnabled: isSupabaseConfigured,
    authMode,
    authOpen: authMode != null,
    pendingEmail,
    openAuth,
    closeAuth,
    signup,
    login,
    logout,
    requestPasswordReset,
    updatePassword,
    accessToken,
  }), [
    accessToken, authMode, closeAuth, login, logout, openAuth, pendingEmail,
    requestPasswordReset, signup, status, updatePassword, user,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

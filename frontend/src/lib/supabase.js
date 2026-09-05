import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
// Newer Supabase projects issue `sb_publishable_...` keys; older ones call the
// same thing the anon key. Accept either so an existing project still works.
const publishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim();

// Both values are safe to ship in the bundle: the publishable key only grants
// what row-level security allows. Accounts are optional in this app, so when the
// keys are absent we run guest-only instead of failing to boot.
export const isSupabaseConfigured = Boolean(url && publishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  })
  : null;

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.info(
    '[auth] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are not set - running in guest-only mode.',
  );
}

/** Maps Supabase's auth errors onto copy we are happy to show a user. */
export function authErrorMessage(error) {
  const raw = String(error?.message || '').toLowerCase();
  if (!raw) return 'Something went wrong. Try again.';
  if (raw.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (raw.includes('email not confirmed')) return 'Confirm your email address first - check your inbox for the link.';
  if (raw.includes('already registered') || raw.includes('already been registered')) {
    return 'An account with that email already exists. Try logging in instead.';
  }
  if (raw.includes('password should be at least')) return 'Password must be at least 8 characters.';
  if (raw.includes('rate limit') || raw.includes('too many requests')) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  if (raw.includes('failed to fetch') || raw.includes('network')) {
    return 'Could not reach the sign-in service. Check your connection.';
  }
  return error.message;
}

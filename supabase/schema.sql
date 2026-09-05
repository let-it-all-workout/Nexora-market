-- Schema for the market analysis app.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> Run.
--
-- Accounts themselves live in Supabase's managed `auth.users` table, so the only
-- application data we own is the watchlist: one row per user, guarded by
-- row-level security so a signed-in user can never read or write another row.

create table if not exists public.watchlists (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  symbols    text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.watchlists enable row level security;

-- Each policy re-checks `auth.uid()` against the row's owner. Postgres enforces
-- this for every query, including ones issued straight from the browser, so the
-- ownership rule cannot be bypassed by a tampered client.
drop policy if exists "watchlists are readable by their owner" on public.watchlists;
create policy "watchlists are readable by their owner"
  on public.watchlists for select
  using (auth.uid() = user_id);

drop policy if exists "watchlists are insertable by their owner" on public.watchlists;
create policy "watchlists are insertable by their owner"
  on public.watchlists for insert
  with check (auth.uid() = user_id);

drop policy if exists "watchlists are updatable by their owner" on public.watchlists;
create policy "watchlists are updatable by their owner"
  on public.watchlists for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "watchlists are deletable by their owner" on public.watchlists;
create policy "watchlists are deletable by their owner"
  on public.watchlists for delete
  using (auth.uid() = user_id);

-- True when every element looks like a ticker. A check constraint may not
-- contain a subquery, so the per-element test lives in an immutable function
-- that the constraint can call instead.
-- The parameter is deliberately not called `symbols`, so it cannot be confused
-- with the column of that name at the call site.
create or replace function public.is_ticker_list(tickers text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  -- bool_and over an empty array yields null, which coalesces to a pass.
  select coalesce(bool_and(candidate ~ '^[A-Z0-9][A-Z0-9./-]{0,11}$'), true)
  from unnest(tickers) as candidate;
$$;

-- Reject anything that is not a plausible ticker, and cap the list length, so a
-- modified client cannot use this table as free storage.
alter table public.watchlists drop constraint if exists watchlists_symbols_valid;
alter table public.watchlists add constraint watchlists_symbols_valid check (
  coalesce(array_length(symbols, 1), 0) <= 12
  and public.is_ticker_list(symbols)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists watchlists_touch_updated_at on public.watchlists;
create trigger watchlists_touch_updated_at
  before update on public.watchlists
  for each row execute function public.touch_updated_at();

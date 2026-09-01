-- SwingLab Pro — Supabase schema.
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).
-- The app itself uploads NOTHING here. This table only records who paid,
-- and it is written exclusively by the Stripe webhook (service_role key).

create table if not exists public.founders (
  id                  uuid primary key default gen_random_uuid(),
  stripe_session_id   text unique not null,
  stripe_customer_id  text,
  email               text,
  amount_total        integer,       -- in the smallest currency unit (e.g. cents)
  currency            text,
  lang                text,
  paid                boolean default false,
  created_at          timestamptz default now()
);

-- Lock the table down: no browser client may read or write it.
alter table public.founders enable row level security;

-- (No policies are created on purpose.) With RLS enabled and no policies,
-- the anon/public key cannot read or write rows. Only the service_role key,
-- used server-side by the Stripe webhook, bypasses RLS.

-- Optional helper index for looking up a buyer by email.
create index if not exists founders_email_idx on public.founders (email);

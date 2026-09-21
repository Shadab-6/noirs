-- Newsletter sign-ups from the "Join Our Journey" form on the home page.
--   public.subscribe_newsletter(email) -> { ok: true } | { ok: false, message }
-- Visitors cannot read or write the table directly (RLS on, no policies): they can only call the function.
-- Signing up the same address twice is not an error and does not reveal that the address was already there.

create table public.newsletter_subscribers (
  id          bigint generated always as identity primary key,
  email       text not null unique,
  created_at  timestamptz not null default now(),
  constraint newsletter_subscribers_email_format
    check (length(email) <= 254 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$')
);

alter table public.newsletter_subscribers enable row level security;

create or replace function public.subscribe_newsletter(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if length(v_email) > 254 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    return jsonb_build_object('ok', false, 'message', 'Enter a valid email address.');
  end if;

  if not private.check_rate_limit('subscribe_newsletter', 5, interval '10 minutes') then
    return jsonb_build_object('ok', false, 'message', 'Too many attempts. Please try again in a few minutes.');
  end if;

  insert into public.newsletter_subscribers (email)
  values (v_email)
  on conflict (email) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.subscribe_newsletter(text) from public;
grant execute on function public.subscribe_newsletter(text) to anon, authenticated;

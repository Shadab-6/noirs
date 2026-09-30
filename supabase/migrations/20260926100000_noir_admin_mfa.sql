-- Server-side two-factor enforcement for the admin panel.
--
-- The admin panel now lets an admin enroll a TOTP authenticator (via Supabase Auth's built-in
-- MFA endpoints — no new tables needed for that part, GoTrue already has auth.mfa_factors).
-- This migration is the part that actually matters for security: once an admin has a *verified*
-- factor, private.require_admin() now refuses any admin_* call unless the caller's session has
-- completed that challenge (aal2). A stolen aal1 access token is useless against the admin API
-- for an account that has 2FA turned on, even though the frontend login screen is what normally
-- asks for the code — the database enforces it either way, per the project's existing pattern of
-- never trusting frontend-only checks.
--
-- Accounts that have never enrolled a factor are unaffected (aal1 is expected and fine for them).

create or replace function private.require_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;

  if exists (select 1 from auth.mfa_factors where user_id = auth.uid() and status = 'verified')
     and coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2' then
    raise exception 'Two-factor verification required.' using errcode = '42501';
  end if;

  return true;
end;
$$;

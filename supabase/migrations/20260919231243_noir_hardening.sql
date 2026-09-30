-- Hardening after the first advisor run.

-- Supabase's own event-trigger helper does not need to be callable through the public API.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- The shop filters by category in the browser; a 10-row table does not need this index.
drop index if exists public.products_category_idx;

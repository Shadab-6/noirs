-- NOIR security sync: canonical production security state.
-- Privileged implementations live in private; public RPCs are SECURITY INVOKER
-- wrappers with an empty search_path and narrowly scoped EXECUTE grants.

-- Copy the tested public implementations into private on a fresh database.
-- On an already-hardened production database the private implementations exist,
-- so this block deliberately does nothing.
do $$
declare d text;
begin
  if to_regprocedure('private.create_order(jsonb)') is null then
    select pg_get_functiondef('public.create_order(jsonb)'::regprocedure) into d;
    execute replace(d, 'FUNCTION public.create_order(', 'FUNCTION private.create_order(');
  end if;

  if to_regprocedure('private.validate_coupon(text, integer)') is null then
    select pg_get_functiondef('public.validate_coupon(text, integer)'::regprocedure) into d;
    execute replace(d, 'FUNCTION public.validate_coupon(', 'FUNCTION private.validate_coupon(');
  end if;

  if to_regprocedure('private.subscribe_newsletter(text)') is null then
    select pg_get_functiondef('public.subscribe_newsletter(text)'::regprocedure) into d;
    execute replace(d, 'FUNCTION public.subscribe_newsletter(', 'FUNCTION private.subscribe_newsletter(');
  end if;

  if to_regprocedure('private.my_orders()') is null then
    select pg_get_functiondef('public.my_orders()'::regprocedure) into d;
    execute replace(d, 'FUNCTION public.my_orders(', 'FUNCTION private.my_orders(');
  end if;

  if to_regprocedure('private.cancel_order(uuid)') is null then
    select pg_get_functiondef('public.cancel_order(uuid)'::regprocedure) into d;
    execute replace(d, 'FUNCTION public.cancel_order(', 'FUNCTION private.cancel_order(');
  end if;
end $$;

create or replace function public.create_order(payload jsonb)
returns jsonb language sql set search_path = ''
as $$ select private.create_order(payload); $$;

create or replace function public.validate_coupon(p_code text, p_subtotal integer default 0)
returns jsonb language sql set search_path = ''
as $$ select private.validate_coupon(p_code, p_subtotal); $$;

create or replace function public.subscribe_newsletter(p_email text)
returns jsonb language sql set search_path = ''
as $$ select private.subscribe_newsletter(p_email); $$;

create or replace function public.my_orders()
returns jsonb language sql stable set search_path = ''
as $$ select private.my_orders(); $$;

create or replace function public.cancel_order(p_order_id uuid)
returns jsonb language sql set search_path = ''
as $$ select private.cancel_order(p_order_id); $$;

revoke all on function private.create_order(jsonb) from public, anon, authenticated;
revoke all on function private.validate_coupon(text, integer) from public, anon, authenticated;
revoke all on function private.subscribe_newsletter(text) from public, anon, authenticated;
revoke all on function private.my_orders() from public, anon, authenticated;
revoke all on function private.cancel_order(uuid) from public, anon, authenticated;
grant usage on schema private to anon, authenticated;
grant execute on function private.create_order(jsonb) to authenticated;
grant execute on function private.validate_coupon(text, integer) to authenticated;
grant execute on function private.subscribe_newsletter(text) to anon, authenticated;
grant execute on function private.my_orders() to authenticated;
grant execute on function private.cancel_order(uuid) to authenticated;

revoke all on function public.create_order(jsonb) from public, anon, authenticated;
revoke all on function public.validate_coupon(text, integer) from public, anon, authenticated;
revoke all on function public.subscribe_newsletter(text) from public, anon, authenticated;
revoke all on function public.my_orders() from public, anon, authenticated;
revoke all on function public.cancel_order(uuid) from public, anon, authenticated;
grant execute on function public.create_order(jsonb) to authenticated;
grant execute on function public.validate_coupon(text, integer) to authenticated;
grant execute on function public.subscribe_newsletter(text) to anon, authenticated;
grant execute on function public.my_orders() to authenticated;
grant execute on function public.cancel_order(uuid) to authenticated;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.coupons enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table private.rate_limits enable row level security;

revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;
revoke all on table public.coupons from anon, authenticated;
revoke all on table public.newsletter_subscribers from anon, authenticated;
revoke all on table private.rate_limits from anon, authenticated;

drop policy if exists "No direct order access" on public.orders;
drop policy if exists "No direct order item access" on public.order_items;
drop policy if exists "No direct coupon access" on public.coupons;
drop policy if exists "No direct newsletter table access" on public.newsletter_subscribers;
create policy "No direct order access" on public.orders for all to anon, authenticated using (false) with check (false);
create policy "No direct order item access" on public.order_items for all to anon, authenticated using (false) with check (false);
create policy "No direct coupon access" on public.coupons for all to anon, authenticated using (false) with check (false);
create policy "No direct newsletter table access" on public.newsletter_subscribers for all to anon, authenticated using (false) with check (false);

drop policy if exists "Anyone can read active products" on public.products;
drop policy if exists "Public can view active products" on public.products;
create policy "Public can view active products" on public.products
  for select to anon, authenticated using (is_active = true);

drop policy if exists "Anyone can read active shipping methods" on public.shipping_methods;
drop policy if exists "Public can view active shipping methods" on public.shipping_methods;
create policy "Public can view active shipping methods" on public.shipping_methods
  for select to anon, authenticated using (is_active = true);

drop policy if exists "Customers add their own addresses" on public.addresses;
drop policy if exists "Customers change their own addresses" on public.addresses;
drop policy if exists "Customers delete their own addresses" on public.addresses;
drop policy if exists "Customers read their own addresses" on public.addresses;
drop policy if exists "Users can create own addresses" on public.addresses;
drop policy if exists "Users can delete own addresses" on public.addresses;
drop policy if exists "Users can update own addresses" on public.addresses;
drop policy if exists "Users can view own addresses" on public.addresses;
create policy "Users can view own addresses" on public.addresses
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create own addresses" on public.addresses
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own addresses" on public.addresses
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete own addresses" on public.addresses
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on table public.addresses from anon, authenticated;
grant select, insert, update, delete on table public.addresses to authenticated;
revoke all on table public.products from anon, authenticated;
grant select on table public.products to anon, authenticated;
revoke all on table public.shipping_methods from anon, authenticated;
grant select on table public.shipping_methods to anon, authenticated;

alter function private.create_order(jsonb) set search_path = '';
alter function private.validate_coupon(text, integer) set search_path = '';
alter function private.subscribe_newsletter(text) set search_path = '';
alter function private.my_orders() set search_path = '';
alter function private.cancel_order(uuid) set search_path = '';

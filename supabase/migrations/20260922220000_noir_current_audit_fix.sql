-- NOIR current audit fixes / synchronization snapshot.
-- Reconciles the live catalogue with the storefront fallback, preserves cancelled-order history,
-- accepts both clothing and shoe sizes, and reasserts the current RPC/RLS boundaries.

-- ---------------------------------------------------------------- catalogue sync
-- Legacy IDs 1-4 are the current four sweatshirt cards shown by the frontend.
insert into public.products
  (id, name, price, old_price, category, genders, sizes, image, sale, popular, is_active)
overriding system value
values
  (1, 'Sage Curve Sweatshirt', 2999, 6999, 'sweatshirt', array['men','women'], array['S','M','L','XL'], 'assets/images/item1(1).png', true, true, true),
  (2, 'Ivory Panel Sweatshirt', 2499, 7499, 'sweatshirt', array['men','women'], array['S','M','L','XL'], 'assets/images/item2(1).png', true, true, true),
  (3, 'Graphite Panel Sweatshirt', 3499, 7999, 'sweatshirt', array['men','women'], array['S','M','L','XL'], 'assets/images/item3(1).png', true, true, true),
  (4, 'Mocha Curve Sweatshirt', 1999, 8999, 'sweatshirt', array['men','women'], array['S','M','L','XL'], 'assets/images/item4(1).png', true, true, true),
  (19, 'Sage Arc Panel Sweatshirt', 3999, 6999, 'sweatshirt', array['men','women'], array['S','M','L','XL'], 'assets/images/item2(1).png', true, true, true),
  (20, 'Graphite Contrast Curve Sweatshirt', 3999, 7499, 'sweatshirt', array['men','women'], array['S','M','L','XL'], 'assets/images/item3(1).png', true, true, true),
  (21, 'Earth Tone Curve Sweatshirt', 3999, 6999, 'sweatshirt', array['men','women'], array['S','M','L','XL'], 'assets/images/item4(1).png', true, true, true),
  (22, 'Olive Modern Curve Sweatshirt', 3999, 6999, 'sweatshirt', array['men','women'], array['S','M','L','XL'], 'assets/images/item1(1).png', true, true, true),
  (23, 'Urban Panel Sweatshirt', 3999, 7499, 'sweatshirt', array['men','women'], array['S','M','L','XL'], 'assets/images/sweatshirt-urban-panel.webp', true, true, true),
  (24, 'Forest Collared Zip Sweatshirt', 3999, 7999, 'sweatshirt', array['men','women'], array['S','M','L','XL'], 'assets/images/sweatshirt-collared-zip.webp', true, true, true),
  (25, 'Forest Collared Half-Zip Sweatshirt', 1999, 3999, 'sweatshirt', array['men','women'], array['S','M','L','XL'], 'assets/images/sweatshirt-forest-zip-collar.webp', true, false, true)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  old_price = excluded.old_price,
  category = excluded.category,
  genders = excluded.genders,
  sizes = excluded.sizes,
  image = excluded.image,
  sale = excluded.sale,
  popular = excluded.popular,
  is_active = excluded.is_active,
  updated_at = now();

update public.products set is_active = false, popular = false where id in (5,6,19,20,21,22);
select setval(pg_get_serial_sequence('public.products', 'id'), greatest((select coalesce(max(id), 1) from public.products), 25));

-- ---------------------------------------------------------------- order item size compatibility
-- The catalogue contains both clothing sizes (S-XL) and shoe sizes (3-8).
alter table public.order_items drop constraint if exists order_items_size_check;
alter table public.order_items add constraint order_items_size_check
  check (char_length(size) >= 1 and char_length(size) <= 6);

-- ---------------------------------------------------------------- cancellation behavior
-- Keep cancelled orders for the customer's order history instead of deleting them.
create or replace function private.cancel_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'code', 'auth_required', 'error', 'Please sign in to manage your orders.');
  end if;

  select * into v_order
  from public.orders o
  where o.id = p_order_id and o.user_id = auth.uid()
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'We couldn''t find that order.');
  end if;

  if v_order.status <> 'pending' or v_order.payment_status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'This order can''t be cancelled any more. Please contact us.');
  end if;

  update public.orders
  set status = 'cancelled', updated_at = now()
  where id = v_order.id;

  if v_order.coupon_code is not null then
    update public.coupons c
    set used_count = greatest(c.used_count - 1, 0)
    where c.code = v_order.coupon_code;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function private.cancel_order(uuid) from public, anon, authenticated;
grant execute on function private.cancel_order(uuid) to authenticated;
revoke all on function public.cancel_order(uuid) from public, anon, authenticated;
grant execute on function public.cancel_order(uuid) to authenticated;

-- ---------------------------------------------------------------- current security boundaries
alter table public.products enable row level security;
alter table public.shipping_methods enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.addresses enable row level security;

revoke all on table public.orders, public.order_items, public.coupons, public.newsletter_subscribers from anon, authenticated;
revoke all on table public.products, public.shipping_methods from anon, authenticated;
grant select on table public.products, public.shipping_methods to anon, authenticated;
grant select, insert, update, delete on table public.addresses to authenticated;

revoke all on function private.validate_coupon(text, integer) from public, authenticated;
grant execute on function private.validate_coupon(text, integer) to anon;
grant execute on function private.validate_coupon(text, integer) to authenticated;
revoke all on function public.validate_coupon(text, integer) from public, authenticated;
grant execute on function public.validate_coupon(text, integer) to anon;
grant execute on function public.validate_coupon(text, integer) to authenticated;

revoke all on function public.create_order(jsonb) from public, anon;
grant execute on function public.create_order(jsonb) to authenticated;
revoke all on function public.my_orders() from public, anon;
grant execute on function public.my_orders() to authenticated;
revoke all on function public.subscribe_newsletter(text) from public;
grant execute on function public.subscribe_newsletter(text) to anon, authenticated;

alter function private.create_order(jsonb) set search_path = '';
alter function private.validate_coupon(text, integer) set search_path = '';
alter function private.subscribe_newsletter(text) set search_path = '';
alter function private.my_orders() set search_path = '';
alter function private.cancel_order(uuid) set search_path = '';

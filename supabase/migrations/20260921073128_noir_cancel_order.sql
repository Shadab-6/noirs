-- Customers can cancel (remove) their own order while it is still pending: not paid, not confirmed or shipped yet.
--   public.cancel_order(order_id) deletes the order and its items and gives back the coupon use it took.
-- Only the customer who placed the order can call it (auth.uid() must match orders.user_id).
create or replace function public.cancel_order(p_order_id uuid)
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

  delete from public.orders where id = v_order.id; -- order_items go with it (on delete cascade)

  if v_order.coupon_code is not null then
    update public.coupons c set used_count = greatest(c.used_count - 1, 0) where c.code = v_order.coupon_code;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.cancel_order(uuid) from public, anon;
grant execute on function public.cancel_order(uuid) to authenticated;

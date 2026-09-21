-- NOIR storefront backend: private helpers and the two public RPC entry points.
--   public.validate_coupon(code, subtotal)  -> coupon definition if valid
--   public.create_order(payload)            -> validates everything, prices the order, saves it
-- Both are SECURITY DEFINER with an empty search_path, executable by the browser roles only.

-- ---------------------------------------------------------------- helpers
create or replace function private.normalize_phone(p_phone text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := regexp_replace(coalesce(p_phone, ''), '[\s\-().]', '', 'g');
begin
  if v like '+91%' then
    v := substr(v, 4);
  elsif v like '0091%' then
    v := substr(v, 5);
  elsif length(v) = 12 and v like '91%' then
    v := substr(v, 3);
  elsif length(v) = 11 and v like '0%' then
    v := substr(v, 2);
  end if;

  if v ~ '^[6-9][0-9]{9}$' then
    return v;
  end if;
  return null;
end;
$$;

-- Fixed-window per-IP limiter. Returns false when the caller is over the limit.
-- Requests without an IP header (SQL editor, tests) are not limited.
create or replace function private.check_rate_limit(p_scope text, p_max integer, p_window interval)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_headers text := nullif(current_setting('request.headers', true), '');
  v_ip      text;
  v_hits    integer;
begin
  if v_headers is null then
    return true;
  end if;

  v_ip := btrim(split_part(coalesce((v_headers::jsonb) ->> 'x-forwarded-for', ''), ',', 1));
  if v_ip = '' then
    return true;
  end if;

  insert into private.rate_limits as r (key, bucket_start, hits)
  values (p_scope || ':' || v_ip, date_bin(p_window, now(), timestamptz 'epoch'), 1)
  on conflict (key, bucket_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  if random() < 0.02 then
    delete from private.rate_limits where bucket_start < now() - interval '1 day';
  end if;

  return v_hits <= p_max;
end;
$$;

create or replace function private.order_to_json(p_order_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id',           o.id,
    'orderNumber',  o.order_number,
    'createdAt',    o.created_at,
    'status',       o.status,
    'items',        coalesce((
                      select jsonb_agg(jsonb_build_object(
                               'productId', i.product_id,
                               'name',      i.product_name,
                               'price',     i.unit_price,
                               'quantity',  i.quantity,
                               'size',      i.size) order by i.id)
                      from public.order_items i
                      where i.order_id = o.id), '[]'::jsonb),
    'subtotal',     o.subtotal,
    'discount',     o.discount,
    'shipping',     o.shipping,
    'total',        o.total,
    'couponCode',   o.coupon_code,
    'customer',     jsonb_build_object(
                      'email',          o.customer_email,
                      'name',           o.customer_name,
                      'phone',          '+91' || o.customer_phone,
                      'marketingOptIn', o.marketing_opt_in),
    'shippingAddress', jsonb_build_object(
                      'address', o.ship_address,
                      'city',    o.ship_city,
                      'state',   o.ship_state,
                      'pin',     o.ship_pin),
    'shippingMethod', jsonb_build_object('id', sm.id, 'label', sm.label, 'eta', sm.eta),
    'payment',      jsonb_build_object('method', o.payment_method, 'status', o.payment_status)
  )
  from public.orders o
  join public.shipping_methods sm on sm.id = o.shipping_method_id
  where o.id = p_order_id;
$$;

-- ---------------------------------------------------------------- validate_coupon
create or replace function public.validate_coupon(p_code text, p_subtotal integer default 0)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code     text := upper(btrim(coalesce(p_code, '')));
  v_subtotal integer := greatest(coalesce(p_subtotal, 0), 0);
  v_coupon   public.coupons%rowtype;
  v_discount integer;
begin
  if v_code = '' then
    return jsonb_build_object('valid', false, 'message', 'Enter a coupon code.');
  end if;

  if not private.check_rate_limit('validate_coupon', 30, interval '1 minute') then
    return jsonb_build_object('valid', false, 'message', 'Too many attempts. Please wait a minute and try again.');
  end if;

  select * into v_coupon
  from public.coupons c
  where c.code = v_code
    and c.is_active
    and (c.starts_at is null or c.starts_at <= now())
    and (c.expires_at is null or c.expires_at > now())
    and (c.max_uses is null or c.used_count < c.max_uses);

  if not found then
    return jsonb_build_object('valid', false, 'message', 'Invalid coupon code.');
  end if;

  if v_subtotal < v_coupon.min_subtotal then
    return jsonb_build_object('valid', false,
      'message', 'This coupon needs a minimum order of ₹' || v_coupon.min_subtotal || '.');
  end if;

  v_discount := case v_coupon.discount_type
    when 'percent' then round((v_subtotal::numeric * v_coupon.discount_value) / 100)::integer
    else least(v_coupon.discount_value, v_subtotal)
  end;

  return jsonb_build_object(
    'valid',       true,
    'code',        v_coupon.code,
    'type',        v_coupon.discount_type,
    'value',       v_coupon.discount_value,
    'minSubtotal', v_coupon.min_subtotal,
    'discount',    v_discount
  );
end;
$$;

-- ---------------------------------------------------------------- create_order
create or replace function public.create_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_states constant text[] := array[
    'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
    'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
    'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
    'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];

  v_items    jsonb := payload -> 'items';
  v_customer jsonb := coalesce(payload -> 'customer', '{}'::jsonb);
  v_addr     jsonb := coalesce(payload -> 'shippingAddress', '{}'::jsonb);

  v_email    text := btrim(coalesce(v_customer ->> 'email', ''));
  v_name     text := btrim(coalesce(v_customer ->> 'name', ''));
  v_phone_in text := btrim(coalesce(v_customer ->> 'phone', ''));
  v_phone    text := private.normalize_phone(v_customer ->> 'phone');
  v_optin    boolean := coalesce(v_customer ->> 'marketingOptIn', 'false') in ('true', 't', '1');
  v_address  text := btrim(coalesce(v_addr ->> 'address', ''));
  v_city     text := btrim(coalesce(v_addr ->> 'city', ''));
  v_state    text := btrim(coalesce(v_addr ->> 'state', ''));
  v_pin      text := btrim(coalesce(v_addr ->> 'pin', ''));
  v_ship_id  text := payload ->> 'shippingMethod';
  v_pay      text := payload ->> 'paymentMethod';
  v_code     text := upper(btrim(coalesce(payload ->> 'couponCode', '')));

  v_key      uuid;
  v_existing uuid;
  v_errors   jsonb := '{}'::jsonb;
  v_ship     public.shipping_methods%rowtype;
  v_coupon   public.coupons%rowtype;
  v_item     jsonb;
  v_product  public.products%rowtype;
  v_qty      integer;
  v_size     text;
  v_lines    jsonb := '[]'::jsonb;
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_shipping integer := 0;
  v_total    integer;
  v_order_id uuid;
  v_attempt  integer := 0;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'Invalid order request.');
  end if;

  -- Idempotency: a retried request with the same key returns the order created the first time.
  if coalesce(payload ->> 'idempotencyKey', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     and coalesce(payload ->> 'idempotencyKey', '') <> '' then
    return jsonb_build_object('ok', false, 'error', 'Invalid order request.');
  end if;

  v_key := nullif(payload ->> 'idempotencyKey', '')::uuid;

  if v_key is not null then
    select o.id into v_existing from public.orders o where o.idempotency_key = v_key;
    if found then
      return jsonb_build_object('ok', true, 'order', private.order_to_json(v_existing));
    end if;
  end if;

  if not private.check_rate_limit('create_order', 10, interval '10 minutes') then
    return jsonb_build_object('ok', false,
      'error', 'Too many orders from your network. Please wait a few minutes and try again.');
  end if;

  -- ---- customer + address validation (same rules as the checkout form)
  if v_email = '' then
    v_errors := v_errors || jsonb_build_object('email', 'Enter your email address.');
  elsif length(v_email) > 254 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    v_errors := v_errors || jsonb_build_object('email', 'Enter a valid email address.');
  end if;

  if v_name = '' then
    v_errors := v_errors || jsonb_build_object('name', 'Enter your full name.');
  elsif char_length(v_name) < 2 then
    v_errors := v_errors || jsonb_build_object('name', 'Name looks too short.');
  elsif char_length(v_name) > 100 then
    v_errors := v_errors || jsonb_build_object('name', 'Name is too long.');
  end if;

  if v_phone_in = '' then
    v_errors := v_errors || jsonb_build_object('phone', 'Enter your phone number.');
  elsif v_phone is null then
    v_errors := v_errors || jsonb_build_object('phone', 'Enter a valid 10-digit mobile number.');
  end if;

  if v_address = '' then
    v_errors := v_errors || jsonb_build_object('address', 'Enter your delivery address.');
  elsif char_length(v_address) < 6 then
    v_errors := v_errors || jsonb_build_object('address', 'Add a little more detail to the address.');
  elsif char_length(v_address) > 300 then
    v_errors := v_errors || jsonb_build_object('address', 'Address is too long.');
  end if;

  if v_city = '' then
    v_errors := v_errors || jsonb_build_object('city', 'Enter your city.');
  elsif char_length(v_city) < 2 or char_length(v_city) > 100 then
    v_errors := v_errors || jsonb_build_object('city', 'Enter a valid city.');
  end if;

  if v_state = '' then
    v_errors := v_errors || jsonb_build_object('state', 'Select your state.');
  elsif not (v_state = any (c_states)) then
    v_errors := v_errors || jsonb_build_object('state', 'Select a valid state.');
  end if;

  if v_pin = '' then
    v_errors := v_errors || jsonb_build_object('pin', 'Enter your PIN code.');
  elsif v_pin !~ '^[1-9][0-9]{5}$' then
    v_errors := v_errors || jsonb_build_object('pin', 'Enter a valid 6-digit PIN code.');
  end if;

  select * into v_ship from public.shipping_methods sm where sm.id = v_ship_id and sm.is_active;
  if not found then
    v_errors := v_errors || jsonb_build_object('shippingMethod', 'Select a shipping method.');
  end if;

  if v_pay is null or v_pay not in ('upi', 'card', 'netbanking', 'wallet') then
    v_errors := v_errors || jsonb_build_object('paymentMethod', 'Select a payment method.');
  end if;

  if v_errors <> '{}'::jsonb then
    return jsonb_build_object('ok', false, 'error', 'Please check the highlighted details.', 'fields', v_errors);
  end if;

  -- ---- items: prices always come from the products table, never from the request
  if v_items is null or jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Your cart is empty.');
  end if;

  if jsonb_array_length(v_items) > 50 then
    return jsonb_build_object('ok', false, 'error', 'Too many items in one order.');
  end if;

  for v_item in select value from jsonb_array_elements(v_items) loop
    if jsonb_typeof(v_item) <> 'object'
       or coalesce(v_item ->> 'productId', '') !~ '^[0-9]{1,18}$'
       or coalesce(v_item ->> 'quantity', '') !~ '^[0-9]{1,3}$' then
      return jsonb_build_object('ok', false, 'error', 'Each item must have a valid product and quantity.');
    end if;

    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty < 1 or v_qty > 20 then
      return jsonb_build_object('ok', false, 'error', 'Quantity must be between 1 and 20.');
    end if;

    select * into v_product from public.products p
    where p.id = (v_item ->> 'productId')::bigint and p.is_active;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'One of the items in your cart is no longer available.');
    end if;

    v_size := v_item ->> 'size';
    if v_size is null or v_size not in ('S', 'M', 'L', 'XL') then
      return jsonb_build_object('ok', false, 'error', 'Select a size for ' || v_product.name || '.');
    end if;

    v_subtotal := v_subtotal + v_product.price * v_qty;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id, 'name', v_product.name, 'price', v_product.price,
      'qty', v_qty, 'size', v_size));
  end loop;

  -- ---- coupon, shipping, total
  if v_code <> '' then
    select * into v_coupon
    from public.coupons c
    where c.code = v_code
      and c.is_active
      and (c.starts_at is null or c.starts_at <= now())
      and (c.expires_at is null or c.expires_at > now())
      and (c.max_uses is null or c.used_count < c.max_uses)
      and v_subtotal >= c.min_subtotal;

    if not found then
      return jsonb_build_object('ok', false, 'error', 'Please check the highlighted details.',
        'fields', jsonb_build_object('couponCode', 'Invalid coupon code.'));
    end if;

    v_discount := case v_coupon.discount_type
      when 'percent' then round((v_subtotal::numeric * v_coupon.discount_value) / 100)::integer
      else least(v_coupon.discount_value, v_subtotal)
    end;
  end if;

  v_shipping := case
    when v_ship.free_from is not null and v_subtotal >= v_ship.free_from then 0
    else v_ship.fee
  end;

  v_total := greatest(0, v_subtotal - v_discount + v_shipping);

  -- ---- write (one transaction: order, items and coupon use commit together or not at all)
  begin
    loop
      v_attempt := v_attempt + 1;
      begin
        insert into public.orders (
          order_number, idempotency_key, payment_method, shipping_method_id, coupon_code,
          subtotal, discount, shipping, total,
          customer_name, customer_email, customer_phone, marketing_opt_in,
          ship_address, ship_city, ship_state, ship_pin)
        values (
          'NOIR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
          v_key, v_pay, v_ship.id, nullif(v_code, ''),
          v_subtotal, v_discount, v_shipping, v_total,
          v_name, v_email, v_phone, v_optin,
          v_address, v_city, v_state, v_pin)
        returning id into v_order_id;
        exit;
      exception when unique_violation then
        -- Two identical submits racing, or an (extremely unlikely) order-number clash.
        if v_key is not null then
          select o.id into v_existing from public.orders o where o.idempotency_key = v_key;
          if found then
            return jsonb_build_object('ok', true, 'order', private.order_to_json(v_existing));
          end if;
        end if;
        if v_attempt >= 5 then
          raise;
        end if;
      end;
    end loop;

    insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, size)
    select v_order_id, (l ->> 'product_id')::bigint, l ->> 'name', (l ->> 'price')::integer,
           (l ->> 'qty')::integer, l ->> 'size'
    from jsonb_array_elements(v_lines) as l;

    if v_code <> '' then
      update public.coupons c
      set used_count = c.used_count + 1
      where c.code = v_code and (c.max_uses is null or c.used_count < c.max_uses);

      if not found then
        raise exception 'coupon_exhausted' using errcode = 'P0001';
      end if;
    end if;
  exception
    when sqlstate 'P0001' then
      -- Rolls back the order and items inserted above.
      return jsonb_build_object('ok', false, 'error', 'Please check the highlighted details.',
        'fields', jsonb_build_object('couponCode', 'This coupon has reached its usage limit.'));
  end;

  return jsonb_build_object('ok', true, 'order', private.order_to_json(v_order_id));
end;
$$;

-- ---------------------------------------------------------------- privileges
revoke all on function private.normalize_phone(text)                     from public, anon, authenticated;
revoke all on function private.check_rate_limit(text, integer, interval) from public, anon, authenticated;
revoke all on function private.order_to_json(uuid)                       from public, anon, authenticated;
revoke all on function private.touch_updated_at()                        from public, anon, authenticated;

revoke all on function public.validate_coupon(text, integer) from public;
revoke all on function public.create_order(jsonb)            from public;
grant execute on function public.validate_coupon(text, integer) to anon, authenticated;
grant execute on function public.create_order(jsonb)            to anon, authenticated;

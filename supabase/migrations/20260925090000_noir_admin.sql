-- NOIR admin panel backend.
--
-- Design (matches the storefront's existing pattern): every privileged read/write goes through a
-- SECURITY DEFINER function in `private`, exposed to the browser via a thin `public` wrapper. Every
-- private.admin_* function starts by calling private.is_admin() and raises if the caller isn't one.
-- Direct table access for admins goes through these functions too — admins never get broad table
-- grants, so a bug in one RPC can't turn into an unrestricted read/write of the whole database.
--
-- Admin identity: private.admin_users (user_id -> auth.users). Nothing (not even authenticated)
-- can read or write this table directly; it's only touched by the functions below. Since there is
-- no way to seed this table from the browser, private.admin_bootstrap() lets the FIRST authenticated
-- user who calls it become admin — and only while the table is empty. After that it always fails.
-- Run `select private.admin_bootstrap();` is not needed manually: the admin login page calls
-- public.admin_bootstrap() automatically the first time any signed-in NOIR account opens /admin.

-- ---------------------------------------------------------------- admin identity

create table private.admin_users (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table private.admin_users enable row level security;
-- No policies at all: private already has zero grants to anon/authenticated, and RLS with no
-- policies denies everything by default even to a role that somehow had table privileges.

create or replace function private.is_admin(p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_uid is not null and exists (select 1 from private.admin_users a where a.user_id = p_uid);
$$;

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
  return true;
end;
$$;

create or replace function public.am_i_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select private.is_admin(); $$;

create or replace function private.admin_bootstrap()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  if exists (select 1 from private.admin_users) then
    return private.is_admin();
  end if;
  insert into private.admin_users (user_id) values (auth.uid());
  return true;
end;
$$;

create or replace function public.admin_bootstrap()
returns boolean
language sql
security definer
set search_path = ''
as $$ select private.admin_bootstrap(); $$;

-- ---------------------------------------------------------------- products: stock

alter table public.products
  add column stock integer not null default 0 check (stock >= 0),
  add column description text;

comment on column public.products.stock is 'Units on hand. Low-stock threshold is 10 (matches the admin panel filters).';
comment on column public.products.description is 'Admin-facing product description. Nullable: not every product has one yet.';

-- ---------------------------------------------------------------- product image uploads

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Product images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "Admins manage product images"
  on storage.objects for all to authenticated
  using (bucket_id = 'product-images' and private.is_admin())
  with check (bucket_id = 'product-images' and private.is_admin());

-- ---------------------------------------------------------------- helpers

create or replace function private.admin_product_status(p_active boolean, p_stock integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when not p_active then 'Draft'
    when p_stock <= 0 then 'Out of Stock'
    when p_stock <= 10 then 'Low Stock'
    else 'Active'
  end;
$$;

create or replace function private.admin_product_to_json(p public.products)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'name', p.name, 'sku', 'NOIR-' || lpad(p.id::text, 4, '0'),
    'cat', p.category, 'price', p.price, 'mrp', p.old_price,
    'stock', p.stock, 'status', private.admin_product_status(p.is_active, p.stock),
    'featured', p.popular, 'sale', p.sale, 'isActive', p.is_active,
    'genders', to_jsonb(p.genders), 'sizes', to_jsonb(p.sizes),
    'image', p.image, 'desc', p.description, 'createdAt', p.created_at
  );
$$;

-- ---------------------------------------------------------------- dashboard

create or replace function private.admin_dashboard_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'totalOrders',    (select count(*) from public.orders),
    'totalRevenue',   (select coalesce(sum(total), 0) from public.orders where status <> 'cancelled'),
    'totalCustomers', (select count(distinct lower(customer_email)) from public.orders),
    'totalProducts',  (select count(*) from public.products where is_active),
    'pendingOrders',    (select count(*) from public.orders where status in ('pending', 'confirmed', 'processing')),
    'completedOrders',  (select count(*) from public.orders where status = 'delivered'),
    'cancelledOrders',  (select count(*) from public.orders where status = 'cancelled'),
    'lowStockCount', (select count(*) from public.products where is_active and stock <= 10),
    'recentOrders', (
      select coalesce(jsonb_agg(private.order_to_json(o.id) order by o.created_at desc), '[]'::jsonb)
      from (select id, created_at from public.orders order by created_at desc limit 5) o
    ),
    'lowStockProducts', (
      select coalesce(jsonb_agg(private.admin_product_to_json(p) order by p.stock asc), '[]'::jsonb)
      from (select * from public.products where is_active and stock <= 10 order by stock asc limit 5) p
    ),
    'orderStatusBreakdown', (
      select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
      from (select status, count(*) n from public.orders group by status) s
    )
  )
  where private.require_admin();
$$;

create or replace function public.admin_dashboard_stats()
returns jsonb language sql stable security definer set search_path = ''
as $$ select private.admin_dashboard_stats(); $$;

create or replace function private.admin_sales_trend(p_days integer default 14)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('date', day::date, 'orders', coalesce(o.n, 0), 'revenue', coalesce(o.rev, 0)) order by day), '[]'::jsonb)
  from generate_series(
    (current_date - (greatest(coalesce(p_days, 14), 1) - 1) * interval '1 day'),
    current_date,
    interval '1 day'
  ) as day
  left join (
    select created_at::date od, count(*) n, sum(total) rev
    from public.orders
    where status <> 'cancelled'
    group by created_at::date
  ) o on o.od = day::date
  where private.require_admin();
$$;

create or replace function public.admin_sales_trend(p_days integer default 14)
returns jsonb language sql stable security definer set search_path = ''
as $$ select private.admin_sales_trend(p_days); $$;

create or replace function private.admin_top_products(p_limit integer default 5)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', i.product_id, 'name', i.product_name, 'orders', i.n, 'rev', i.rev) order by i.rev desc), '[]'::jsonb)
  from (
    select oi.product_id, oi.product_name, count(distinct oi.order_id) n, sum(oi.unit_price * oi.quantity) rev
    from public.order_items oi
    join public.orders o on o.id = oi.order_id and o.status <> 'cancelled'
    group by oi.product_id, oi.product_name
    order by rev desc
    limit greatest(coalesce(p_limit, 5), 1)
  ) i
  where private.require_admin();
$$;

create or replace function public.admin_top_products(p_limit integer default 5)
returns jsonb language sql stable security definer set search_path = ''
as $$ select private.admin_top_products(p_limit); $$;

-- ---------------------------------------------------------------- products

create or replace function private.admin_list_products(p_search text default null, p_category text default null, p_status text default null, p_limit integer default 200, p_offset integer default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_rows jsonb;
  v_total integer;
begin
  perform private.require_admin();

  select count(*) into v_total
  from public.products p
  where (v_search is null or p.name ilike '%' || v_search || '%')
    and (p_category is null or p_category = 'All Categories' or p.category = lower(p_category))
    and (p_status is null or p_status = 'All Status' or private.admin_product_status(p.is_active, p.stock) = p_status);

  select coalesce(jsonb_agg(private.admin_product_to_json(p) order by p.created_at desc), '[]'::jsonb) into v_rows
  from (
    select *
    from public.products p
    where (v_search is null or p.name ilike '%' || v_search || '%')
      and (p_category is null or p_category = 'All Categories' or p.category = lower(p_category))
      and (p_status is null or p_status = 'All Status' or private.admin_product_status(p.is_active, p.stock) = p_status)
    order by p.created_at desc
    limit greatest(coalesce(p_limit, 200), 1) offset greatest(coalesce(p_offset, 0), 0)
  ) p;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end;
$$;

create or replace function public.admin_list_products(p_search text default null, p_category text default null, p_status text default null, p_limit integer default 200, p_offset integer default 0)
returns jsonb language sql stable security definer set search_path = ''
as $$ select private.admin_list_products(p_search, p_category, p_status, p_limit, p_offset); $$;

create or replace function private.admin_upsert_product(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id       bigint := nullif(p_payload->>'id', '')::bigint;
  v_name     text := btrim(coalesce(p_payload->>'name', ''));
  v_category text := lower(btrim(coalesce(p_payload->>'category', '')));
  v_price    integer := nullif(p_payload->>'price', '')::integer;
  v_old      integer := nullif(p_payload->>'oldPrice', '')::integer;
  v_stock    integer := coalesce(nullif(p_payload->>'stock', '')::integer, 0);
  v_image    text := nullif(btrim(coalesce(p_payload->>'image', '')), '');
  v_desc     text := nullif(btrim(coalesce(p_payload->>'desc', '')), '');
  v_featured boolean := coalesce((p_payload->>'featured')::boolean, false);
  v_active   boolean := coalesce((p_payload->>'isActive')::boolean, true);
  v_sale     boolean := coalesce((p_payload->>'sale')::boolean, v_old is not null and v_old > v_price);
  v_genders  text[] := coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_payload->'genders', '["men"]'::jsonb)) x), array['men']);
  v_sizes    text[] := coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_payload->'sizes', '["S","M","L","XL"]'::jsonb)) x), array['S','M','L','XL']);
  v_row      public.products%rowtype;
begin
  perform private.require_admin();

  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'Product name must be between 2 and 120 characters.' using errcode = 'P0001';
  end if;
  if char_length(v_category) < 2 or char_length(v_category) > 40 then
    raise exception 'Choose a category.' using errcode = 'P0001';
  end if;
  if v_price is null or v_price <= 0 then
    raise exception 'Enter a valid price.' using errcode = 'P0001';
  end if;
  if v_old is not null and v_old < v_price then
    raise exception 'Compare-at price can''t be lower than the price.' using errcode = 'P0001';
  end if;
  if v_stock < 0 then
    raise exception 'Stock can''t be negative.' using errcode = 'P0001';
  end if;
  if v_id is null and v_image is null then
    raise exception 'Upload a product image.' using errcode = 'P0001';
  end if;

  if v_id is null then
    insert into public.products (name, price, old_price, category, image, description, sale, popular, is_active, stock, genders, sizes)
    values (v_name, v_price, v_old, v_category, v_image, v_desc, v_sale, v_featured, v_active, v_stock, v_genders, v_sizes)
    returning * into v_row;
  else
    update public.products set
      name = v_name, price = v_price, old_price = v_old, category = v_category,
      image = coalesce(v_image, image), description = coalesce(v_desc, description), sale = v_sale, popular = v_featured,
      is_active = v_active, stock = v_stock, genders = v_genders, sizes = v_sizes
    where id = v_id
    returning * into v_row;

    if not found then
      raise exception 'Product not found.' using errcode = 'P0001';
    end if;
  end if;

  return private.admin_product_to_json(v_row);
end;
$$;

create or replace function public.admin_upsert_product(p_payload jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select private.admin_upsert_product(p_payload); $$;

create or replace function private.admin_set_product_active(p_id bigint, p_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_row public.products%rowtype;
begin
  perform private.require_admin();
  update public.products set is_active = p_active where id = p_id returning * into v_row;
  if not found then raise exception 'Product not found.' using errcode = 'P0001'; end if;
  return private.admin_product_to_json(v_row);
end;
$$;

create or replace function public.admin_set_product_active(p_id bigint, p_active boolean)
returns jsonb language sql security definer set search_path = ''
as $$ select private.admin_set_product_active(p_id, p_active); $$;

create or replace function private.admin_set_product_featured(p_id bigint, p_featured boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_row public.products%rowtype;
begin
  perform private.require_admin();
  update public.products set popular = p_featured where id = p_id returning * into v_row;
  if not found then raise exception 'Product not found.' using errcode = 'P0001'; end if;
  return private.admin_product_to_json(v_row);
end;
$$;

create or replace function public.admin_set_product_featured(p_id bigint, p_featured boolean)
returns jsonb language sql security definer set search_path = ''
as $$ select private.admin_set_product_featured(p_id, p_featured); $$;

create or replace function private.admin_set_product_stock(p_id bigint, p_stock integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_row public.products%rowtype;
begin
  perform private.require_admin();
  if p_stock < 0 then raise exception 'Stock can''t be negative.' using errcode = 'P0001'; end if;
  update public.products set stock = p_stock where id = p_id returning * into v_row;
  if not found then raise exception 'Product not found.' using errcode = 'P0001'; end if;
  return private.admin_product_to_json(v_row);
end;
$$;

create or replace function public.admin_set_product_stock(p_id bigint, p_stock integer)
returns jsonb language sql security definer set search_path = ''
as $$ select private.admin_set_product_stock(p_id, p_stock); $$;

-- ---------------------------------------------------------------- categories (derived from products.category)

create or replace function private.admin_list_categories()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', initcap(category), 'slug', category,
    'totalProducts', total, 'activeProducts', active
  ) order by category), '[]'::jsonb)
  from (
    select category, count(*) total, count(*) filter (where is_active) active
    from public.products
    group by category
  ) c
  where private.require_admin();
$$;

create or replace function public.admin_list_categories()
returns jsonb language sql stable security definer set search_path = ''
as $$ select private.admin_list_categories(); $$;

create or replace function private.admin_rename_category(p_old text, p_new text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old text := lower(btrim(coalesce(p_old, '')));
  v_new text := lower(btrim(coalesce(p_new, '')));
  v_n integer;
begin
  perform private.require_admin();
  if char_length(v_new) < 2 or char_length(v_new) > 40 then
    raise exception 'Category name must be between 2 and 40 characters.' using errcode = 'P0001';
  end if;
  update public.products set category = v_new where category = v_old;
  get diagnostics v_n = row_count;
  return jsonb_build_object('renamed', v_n);
end;
$$;

create or replace function public.admin_rename_category(p_old text, p_new text)
returns jsonb language sql security definer set search_path = ''
as $$ select private.admin_rename_category(p_old, p_new); $$;

-- ---------------------------------------------------------------- orders

create or replace function private.admin_list_orders(p_search text default null, p_status text default null, p_limit integer default 100, p_offset integer default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_rows jsonb;
  v_total integer;
begin
  perform private.require_admin();

  select count(*) into v_total
  from public.orders o
  where (v_search is null or o.order_number ilike '%'||v_search||'%' or o.customer_name ilike '%'||v_search||'%' or o.customer_email ilike '%'||v_search||'%')
    and (p_status is null or p_status = 'All Status' or o.status = p_status);

  select coalesce(jsonb_agg(private.order_to_json(o.id) order by o.created_at desc), '[]'::jsonb) into v_rows
  from (
    select id, created_at
    from public.orders o
    where (v_search is null or o.order_number ilike '%'||v_search||'%' or o.customer_name ilike '%'||v_search||'%' or o.customer_email ilike '%'||v_search||'%')
      and (p_status is null or p_status = 'All Status' or o.status = p_status)
    order by created_at desc
    limit greatest(coalesce(p_limit, 100), 1) offset greatest(coalesce(p_offset, 0), 0)
  ) o;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end;
$$;

create or replace function public.admin_list_orders(p_search text default null, p_status text default null, p_limit integer default 100, p_offset integer default 0)
returns jsonb language sql stable security definer set search_path = ''
as $$ select private.admin_list_orders(p_search, p_status, p_limit, p_offset); $$;

create or replace function private.admin_get_order(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_json jsonb;
begin
  perform private.require_admin();
  select private.order_to_json(p_id) into v_json;
  if v_json is null then raise exception 'Order not found.' using errcode = 'P0001'; end if;
  return v_json;
end;
$$;

create or replace function public.admin_get_order(p_id uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$ select private.admin_get_order(p_id); $$;

create or replace function private.admin_update_order_status(p_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  if p_status not in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') then
    raise exception 'Not a valid order status.' using errcode = 'P0001';
  end if;
  update public.orders set status = p_status where id = p_id;
  if not found then raise exception 'Order not found.' using errcode = 'P0001'; end if;
  return private.order_to_json(p_id);
end;
$$;

create or replace function public.admin_update_order_status(p_id uuid, p_status text)
returns jsonb language sql security definer set search_path = ''
as $$ select private.admin_update_order_status(p_id, p_status); $$;

-- ---------------------------------------------------------------- customers (derived from orders — there is no separate profiles table)

create or replace function private.admin_list_customers(p_search text default null, p_limit integer default 100, p_offset integer default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text := nullif(lower(btrim(coalesce(p_search, ''))), '');
  v_rows jsonb;
  v_total integer;
begin
  perform private.require_admin();

  select count(*) into v_total from (
    select lower(customer_email) e from public.orders
    where v_search is null or customer_name ilike '%'||v_search||'%' or customer_email ilike '%'||v_search||'%'
    group by lower(customer_email)
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object(
    'email', c.email, 'name', c.name, 'phone', c.phone, 'userId', c.user_id,
    'orders', c.n, 'spent', c.spent, 'firstOrderAt', c.first_at, 'lastOrderAt', c.last_at,
    'loc', c.loc,
    'status', case when c.last_at > now() - interval '90 days' then 'Active' else 'Inactive' end,
    'recent', c.recent
  ) order by c.last_at desc), '[]'::jsonb) into v_rows
  from (
    select
      lower(o.customer_email) email,
      (array_agg(o.customer_name order by o.created_at desc))[1] name,
      (array_agg(o.customer_phone order by o.created_at desc))[1] phone,
      (array_agg(o.user_id order by o.created_at desc))[1] user_id,
      (array_agg(o.ship_city || ', ' || o.ship_state order by o.created_at desc))[1] loc,
      count(*) n,
      sum(o.total) filter (where o.status <> 'cancelled') spent,
      min(o.created_at) first_at,
      max(o.created_at) last_at,
      (select coalesce(jsonb_agg(jsonb_build_object('id', o2.order_number, 'date', o2.created_at, 'amt', o2.total, 'status', o2.status) order by o2.created_at desc), '[]'::jsonb)
       from (select * from public.orders where lower(customer_email) = min(lower(o.customer_email)) order by created_at desc limit 3) o2) recent
    from public.orders o
    where v_search is null or o.customer_name ilike '%'||v_search||'%' or o.customer_email ilike '%'||v_search||'%'
    group by lower(o.customer_email)
    order by max(o.created_at) desc
    limit greatest(coalesce(p_limit, 100), 1) offset greatest(coalesce(p_offset, 0), 0)
  ) c;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end;
$$;

create or replace function public.admin_list_customers(p_search text default null, p_limit integer default 100, p_offset integer default 0)
returns jsonb language sql stable security definer set search_path = ''
as $$ select private.admin_list_customers(p_search, p_limit, p_offset); $$;

-- ---------------------------------------------------------------- coupons

create or replace function private.admin_list_coupons()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'code', c.code, 'discountType', c.discount_type, 'discountValue', c.discount_value,
    'minSubtotal', c.min_subtotal, 'maxUses', c.max_uses, 'usedCount', c.used_count,
    'startsAt', c.starts_at, 'expiresAt', c.expires_at, 'isActive', c.is_active, 'createdAt', c.created_at
  ) order by c.created_at desc), '[]'::jsonb)
  from public.coupons c
  where private.require_admin();
$$;

create or replace function public.admin_list_coupons()
returns jsonb language sql stable security definer set search_path = ''
as $$ select private.admin_list_coupons(); $$;

create or replace function private.admin_upsert_coupon(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code   text := upper(btrim(coalesce(p_payload->>'code', '')));
  v_type   text := coalesce(p_payload->>'discountType', 'percent');
  v_value  integer := nullif(p_payload->>'discountValue', '')::integer;
  v_min    integer := coalesce(nullif(p_payload->>'minSubtotal', '')::integer, 0);
  v_max    integer := nullif(p_payload->>'maxUses', '')::integer;
  v_starts timestamptz := nullif(p_payload->>'startsAt', '')::timestamptz;
  v_expires timestamptz := nullif(p_payload->>'expiresAt', '')::timestamptz;
  v_active boolean := coalesce((p_payload->>'isActive')::boolean, true);
  v_row public.coupons%rowtype;
begin
  perform private.require_admin();

  if v_code !~ '^[A-Z0-9_-]{3,32}$' then
    raise exception 'Coupon code must be 3-32 characters: letters, numbers, - or _.' using errcode = 'P0001';
  end if;
  if v_type not in ('percent', 'fixed') then
    raise exception 'Discount type must be percent or fixed.' using errcode = 'P0001';
  end if;
  if v_value is null or v_value <= 0 or (v_type = 'percent' and v_value > 100) then
    raise exception 'Enter a valid discount value.' using errcode = 'P0001';
  end if;

  insert into public.coupons (code, discount_type, discount_value, min_subtotal, max_uses, starts_at, expires_at, is_active)
  values (v_code, v_type, v_value, v_min, v_max, v_starts, v_expires, v_active)
  on conflict (code) do update set
    discount_type = excluded.discount_type, discount_value = excluded.discount_value,
    min_subtotal = excluded.min_subtotal, max_uses = excluded.max_uses,
    starts_at = excluded.starts_at, expires_at = excluded.expires_at, is_active = excluded.is_active
  returning * into v_row;

  return jsonb_build_object('code', v_row.code, 'discountType', v_row.discount_type, 'discountValue', v_row.discount_value,
    'minSubtotal', v_row.min_subtotal, 'maxUses', v_row.max_uses, 'usedCount', v_row.used_count,
    'startsAt', v_row.starts_at, 'expiresAt', v_row.expires_at, 'isActive', v_row.is_active, 'createdAt', v_row.created_at);
end;
$$;

create or replace function public.admin_upsert_coupon(p_payload jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select private.admin_upsert_coupon(p_payload); $$;

create or replace function private.admin_set_coupon_active(p_code text, p_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  update public.coupons set is_active = p_active where code = upper(btrim(p_code));
  if not found then raise exception 'Coupon not found.' using errcode = 'P0001'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_set_coupon_active(p_code text, p_active boolean)
returns jsonb language sql security definer set search_path = ''
as $$ select private.admin_set_coupon_active(p_code, p_active); $$;

create or replace function private.admin_delete_coupon(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  delete from public.coupons where code = upper(btrim(p_code));
  if not found then raise exception 'Coupon not found.' using errcode = 'P0001'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_delete_coupon(p_code text)
returns jsonb language sql security definer set search_path = ''
as $$ select private.admin_delete_coupon(p_code); $$;

-- ---------------------------------------------------------------- grants

revoke all on function private.is_admin(uuid) from public, anon, authenticated;
revoke all on function private.require_admin() from public, anon, authenticated;
grant execute on function private.is_admin(uuid) to authenticated;

revoke all on function public.am_i_admin() from public, anon;
grant execute on function public.am_i_admin() to authenticated;
revoke all on function public.admin_bootstrap() from public, anon;
grant execute on function public.admin_bootstrap() to authenticated;

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'admin\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname like 'admin\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;

alter function private.is_admin(uuid) set search_path = '';
alter function private.require_admin() set search_path = '';
alter function private.admin_bootstrap() set search_path = '';

-- Customer accounts: orders belong to the signed-in customer, and customers can save addresses.
--   * orders.user_id is filled by create_order() from the caller's login (auth.uid()); guests still order with user_id = NULL.
--   * public.my_orders() returns the signed-in customer's own orders (newest first, last 50).
--   * public.addresses: saved delivery addresses. Row Level Security: a customer can only see and change their own rows.

-- ---------------------------------------------------------------- orders <-> accounts
alter table public.orders
  add column user_id uuid references auth.users (id) on delete set null;

create index orders_user_created_idx on public.orders (user_id, created_at desc) where user_id is not null;

do $$
declare
  d text;
begin
  select pg_get_functiondef('public.create_order(jsonb)'::regprocedure) into d;
  d := replace(d, 'ship_address, ship_city, ship_state, ship_pin)', 'ship_address, ship_city, ship_state, ship_pin, user_id)');
  d := replace(d, 'v_address, v_city, v_state, v_pin)', 'v_address, v_city, v_state, v_pin, auth.uid())');
  if d not like '%ship_pin, user_id)%' or d not like '%v_pin, auth.uid())%' then
    raise exception 'create_order was not patched';
  end if;
  execute d;
end $$;

create or replace function public.my_orders()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(private.order_to_json(t.id) order by t.created_at desc), '[]'::jsonb)
  from (
    select o.id, o.created_at
    from public.orders o
    where auth.uid() is not null and o.user_id = auth.uid()
    order by o.created_at desc
    limit 50
  ) t;
$$;

revoke all on function public.my_orders() from public, anon;
grant execute on function public.my_orders() to authenticated;

-- ---------------------------------------------------------------- saved addresses
create table public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label       text not null default 'Home' check (char_length(btrim(label)) between 1 and 30),
  full_name   text not null check (char_length(btrim(full_name)) between 2 and 100),
  phone       text not null check (phone ~ '^[6-9][0-9]{9}$'),
  address     text not null check (char_length(btrim(address)) between 6 and 300),
  city        text not null check (char_length(btrim(city)) between 2 and 100),
  state       text not null check (state = any (array[
                'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
                'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
                'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
                'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
                'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
                'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'])),
  pin         text not null check (pin ~ '^[1-9][0-9]{5}$'),
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index addresses_user_idx on public.addresses (user_id, created_at);
create unique index addresses_one_default_idx on public.addresses (user_id) where is_default;

create trigger addresses_touch_updated_at
  before update on public.addresses
  for each row execute function private.touch_updated_at();

-- At most 10 saved addresses per customer.
create or replace function private.limit_addresses()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.addresses a where a.user_id = new.user_id) >= 10 then
    raise exception 'You can save up to 10 addresses.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger addresses_limit
  before insert on public.addresses
  for each row execute function private.limit_addresses();

-- Making an address the default clears the flag on the customer's other addresses.
create or replace function private.single_default_address()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_default then
    update public.addresses a set is_default = false where a.user_id = new.user_id and a.id <> new.id and a.is_default;
  end if;
  return new;
end;
$$;

create trigger addresses_single_default
  before insert or update of is_default on public.addresses
  for each row execute function private.single_default_address();

alter table public.addresses enable row level security;

create policy "Customers read their own addresses"
  on public.addresses for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Customers add their own addresses"
  on public.addresses for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Customers change their own addresses"
  on public.addresses for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Customers delete their own addresses"
  on public.addresses for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.addresses from anon, authenticated;
grant select, insert, update, delete on public.addresses to authenticated;

revoke all on function private.limit_addresses()          from public, anon, authenticated;
revoke all on function private.single_default_address()   from public, anon, authenticated;

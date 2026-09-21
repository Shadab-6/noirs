-- Women's collection (8 pieces) + per-product sizes.
--   * products.sizes: which sizes a product is sold in (clothes S-XL, shoes UK 3-8).
--   * create_order now checks the chosen size against that product's own list (it was hard-coded to S/M/L/XL),
--     and order_items.size accepts any short size label.
--   * New products 11-18 are Women's only (genders = {women}) and are not flagged popular,
--     so the Home "Best Sellers" row and the Men's section stay exactly as they were.

alter table public.products
  add column sizes text[] not null default array['S', 'M', 'L', 'XL']::text[],
  add constraint products_sizes_valid check (cardinality(sizes) between 1 and 12);

alter table public.order_items drop constraint order_items_size_check;
alter table public.order_items add constraint order_items_size_check check (char_length(size) between 1 and 6);

do $$
declare
  d text;
begin
  select pg_get_functiondef('public.create_order(jsonb)'::regprocedure) into d;
  d := replace(d,
    'if v_size is null or v_size not in (''S'', ''M'', ''L'', ''XL'') then',
    'if v_size is null or not (v_size = any (v_product.sizes)) then');
  if d not like '%v_size = any (v_product.sizes)%' then
    raise exception 'create_order size check was not patched';
  end if;
  execute d;
end $$;

insert into public.products (id, name, price, old_price, category, genders, sizes, image, sale, popular) overriding system value
values
  (11, 'Heritage Court Sneaker',      4999, 9499, 'shoes',    array['women'], array['3','4','5','6','7','8'], 'assets/images/item11.webp', true, false),
  (12, 'Classic Canvas Low-Top',      2799, 5499, 'shoes',    array['women'], array['3','4','5','6','7','8'], 'assets/images/item12.webp', true, false),
  (13, 'Light Wash Wide-Leg Jeans',   3399, 7999, 'bottoms',  array['women'], array['S','M','L','XL'],        'assets/images/item13.webp', true, false),
  (14, 'Striped Half-Zip Sweater',    3899, 9199, 'knitwear', array['women'], array['S','M','L','XL'],        'assets/images/item14.webp', true, false),
  (15, 'Pleated Wide-Leg Trousers',   3799, 8599, 'bottoms',  array['women'], array['S','M','L','XL'],        'assets/images/item15.webp', true, false),
  (16, 'Layered Collar Cardigan',     3999, 9599, 'knitwear', array['women'], array['S','M','L','XL'],        'assets/images/item16.webp', true, false),
  (17, 'Wide-Leg Cargo Pants',        3599, 8899, 'bottoms',  array['women'], array['S','M','L','XL'],        'assets/images/item17.webp', true, false),
  (18, 'Bow Detail Flare-Sleeve Top', 3199, 8299, 'tops',     array['women'], array['S','M','L','XL'],        'assets/images/item18.webp', true, false)
on conflict (id) do nothing;

select setval(pg_get_serial_sequence('public.products', 'id'), (select max(id) from public.products));

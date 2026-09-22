-- NOIR sweatshirt collection.
-- The old ids 1-6 are archived instead of deleted so historical order_items keep their product references.
update public.products
set is_active = false, popular = false
where id in (1, 2, 3, 4, 5, 6);

insert into public.products
  (id, name, price, old_price, category, genders, sizes, image, sale, popular, is_active)
overriding system value
values
  (19, 'Sage Arc Panel Sweatshirt',     3999, 6999, 'sweatshirt', array['men','women'], array['S','M','L','XL'], 'assets/images/item2(1).png', true, true, true),
  (20, 'Graphite Contrast Curve Sweatshirt',  3999, 7499, 'sweatshirt', array['men','women'], array['S','M','L','XL'], 'assets/images/item3(1).png', true, true, true),
  (21, 'Earth Tone Curve Sweatshirt',      3999, 6999, 'sweatshirt', array['men','women'], array['S','M','L','XL'], 'assets/images/item4(1).png', true, true, true),
  (22, 'Olive Modern Curve Sweatshirt',    3999, 6999, 'sweatshirt', array['men','women'], array['S','M','L','XL'], 'assets/images/item1(1).png', true, true, true),
  (23, 'Urban Panel Sweatshirt',     3999, 7499, 'sweatshirt', array['men','women'], array['S','M','L','XL'], 'assets/images/sweatshirt-urban-panel.webp', true, true, true),
  (24, 'Forest Collared Zip Sweatshirt',    3999, 7999, 'sweatshirt', array['men','women'], array['S','M','L','XL'], 'assets/images/sweatshirt-collared-zip.webp', true, true, true)
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
  is_active = excluded.is_active;

select setval(pg_get_serial_sequence('public.products', 'id'), greatest((select coalesce(max(id), 1) from public.products), 24));

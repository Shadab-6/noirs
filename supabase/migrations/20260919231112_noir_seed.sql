-- NOIR seed data: catalogue (same ids as the old product.json so existing links and carts keep working),
-- shipping methods and starter coupons.

insert into public.products (id, name, price, old_price, category, image, sale, popular) overriding system value
values
  (1, 'Minimal Black Hoodie', 2999, 4999, 'hoodie', 'assets/images/item1.png', true, true),
  (2, 'luxury jersey', 5999, 8999, 'jersey', 'assets/images/item2.png', true, true),
  (3, 'Premium Grey jersey', 7999, 11999, 'jersey', 'assets/images/item3.png', false, true),
  (4, 'classic jersey', 6499, 9999, 'jersey', 'assets/images/item4.png', true, false),
  (5, 'Black Hoodie', 3999, 7999, 'hoodie', 'assets/images/item5.png', true, true),
  (6, 'Brown Hoodie', 2999, 5999, 'hoodie', 'assets/images/item6.png', true, true),
  (7, 'Forest Green Hoodie', 2499, 8799, 'hoodie', 'assets/images/item7.webp', true, true),
  (8, 'Noir Black Hoodie', 2199, 8499, 'hoodie', 'assets/images/item8.webp', true, true),
  (9, 'Taupe Bomber Jacket', 3299, 9299, 'jacket', 'assets/images/item9.webp', true, true),
  (10, 'Black Bomber Jacket', 3699, 9799, 'jacket', 'assets/images/item10.webp', true, true)
on conflict (id) do update set
  name = excluded.name, price = excluded.price, old_price = excluded.old_price,
  category = excluded.category, image = excluded.image, sale = excluded.sale, popular = excluded.popular;

-- New products created from the dashboard continue after the seeded ids.
select setval(pg_get_serial_sequence('public.products', 'id'), (select max(id) from public.products));

insert into public.shipping_methods (id, label, eta, min_days, max_days, fee, free_from, sort_order) values
  ('standard', 'Standard Shipping', '3–7 business days', 3, 7, 99, 1999, 1),
  ('express',  'Express Shipping',  '1–3 business days', 1, 3, 199, null, 2)
on conflict (id) do update set
  label = excluded.label, eta = excluded.eta, min_days = excluded.min_days, max_days = excluded.max_days,
  fee = excluded.fee, free_from = excluded.free_from, sort_order = excluded.sort_order;

insert into public.coupons (code, discount_type, discount_value) values
  ('NOIR10',  'percent', 10),
  ('NOIR15',  'percent', 15),
  ('FIRST10', 'percent', 10),
  ('SAVE500', 'fixed',  500)
on conflict (code) do nothing;

-- Removes "Black Hoodie" (id 5) and "Brown Hoodie" (id 6) from the catalogue.
-- Rows that no order refers to are deleted. If a past order used one, its row is kept (order history needs it)
-- but hidden from the shop by setting is_active = false.
delete from public.products p
where p.id in (5, 6)
  and not exists (select 1 from public.order_items oi where oi.product_id = p.id);

update public.products set is_active = false where id in (5, 6);

-- Retire the Forest Collared Zip Sweatshirt from the storefront.
-- Keep the row for referential integrity/history; do not delete product 24.
update public.products
set is_active = false, popular = false, updated_at = now()
where id = 24;

-- The Half-Zip is the replacement storefront product.
update public.products
set is_active = true, popular = true, updated_at = now()
where id = 25;

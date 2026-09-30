-- NOIR catalogue deduplication: 1-4 are the canonical four replacement sweatshirts.
-- IDs 19-22 are retained for historical order references but removed from the active storefront.
update public.products
set is_active = false, popular = false, updated_at = now()
where id in (19,20,21,22);

-- Men's / Women's sections of the shop.
-- A product can belong to one or both sections. Everything stays in Men's; products 8 and 9
-- (Noir Black Hoodie, Taupe Bomber Jacket) are also in Women's.
alter table public.products
  add column genders text[] not null default array['men']::text[],
  add constraint products_genders_valid
    check (cardinality(genders) > 0 and genders <@ array['men', 'women']::text[]);

comment on column public.products.genders is 'Shop sections the product appears in: men, women or both.';

update public.products set genders = array['men', 'women']::text[] where id in (8, 9);

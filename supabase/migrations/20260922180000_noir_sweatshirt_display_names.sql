-- NOIR sweatshirt customer-facing display names.
-- Image paths are intentionally unchanged so existing product photography is preserved.
update public.products
set name = case id
  when 19 then 'Sage Arc Panel Sweatshirt'
  when 20 then 'Graphite Contrast Curve Sweatshirt'
  when 21 then 'Earth Tone Curve Sweatshirt'
  when 22 then 'Olive Modern Curve Sweatshirt'
  when 23 then 'Urban Panel Sweatshirt'
  when 24 then 'Forest Collared Zip Sweatshirt'
end
where id in (19, 20, 21, 22, 23, 24);

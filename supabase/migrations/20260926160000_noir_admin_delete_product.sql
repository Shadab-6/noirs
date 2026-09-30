-- Real delete for products, not just archive.
--
-- order_items.product_id references products with ON DELETE NO ACTION specifically so that a
-- historical order never loses the product row it points to. That means a product that has ever
-- been ordered genuinely can't be hard-deleted without corrupting order history — for those,
-- admin_set_product_active(id, false) (Archive in the UI) is the correct way to pull it off the
-- storefront while keeping past orders intact. This function is for the other case: a duplicate,
-- a mistake, or a test product with no order history, where the admin wants it gone for good.

create or replace function private.admin_delete_product(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();

  begin
    delete from public.products where id = p_id;
  exception when foreign_key_violation then
    raise exception 'This product has order history and can''t be deleted — archive it instead to remove it from the store while keeping past orders intact.' using errcode = 'P0001';
  end;

  if not found then
    raise exception 'Product not found.' using errcode = 'P0001';
  end if;

  return jsonb_build_object('ok', true, 'deleted', p_id);
end;
$$;

create or replace function public.admin_delete_product(p_id bigint)
returns jsonb language sql security definer set search_path = ''
as $$ select private.admin_delete_product(p_id); $$;

revoke all on function private.admin_delete_product(bigint) from public, anon, authenticated;
revoke all on function public.admin_delete_product(bigint) from public, anon;
grant execute on function public.admin_delete_product(bigint) to authenticated;

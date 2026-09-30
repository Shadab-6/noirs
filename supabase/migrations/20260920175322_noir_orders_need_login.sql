-- Orders now need a signed-in customer. create_order() answers { ok: false, code: 'auth_required' } for guests,
-- so the rule can't be skipped by calling the API directly. (Orders already in the table are not touched.)
do $$
declare
  d text;
begin
  select pg_get_functiondef('public.create_order(jsonb)'::regprocedure) into d;
  d := replace(d,
    '  if payload is null or jsonb_typeof(payload) <> ''object'' then',
    E'  if auth.uid() is null then\n    return jsonb_build_object(''ok'', false, ''code'', ''auth_required'', ''error'', ''Please sign in to place your order.'');\n  end if;\n\n  if payload is null or jsonb_typeof(payload) <> ''object'' then');
  if d not like '%auth_required%' then
    raise exception 'create_order was not patched';
  end if;
  execute d;
end $$;

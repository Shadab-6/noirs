-- Coupon validation is intentionally public: it returns only the validated coupon
-- terms/discount and is rate-limited. The sensitive coupons table itself remains
-- inaccessible through the REST table endpoint.
-- This lets guests validate a coupon before the checkout authentication gate.

grant execute on function private.validate_coupon(text, integer) to anon, authenticated;
grant execute on function public.validate_coupon(text, integer) to anon, authenticated;

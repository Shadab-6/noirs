/*
 * Supabase connection for the NOIR storefront.
 *
 * The URL and the publishable key are meant to be public: they only identify the project.
 * What a visitor can actually do is limited by the database itself (Row Level Security plus the
 * create_order / validate_coupon functions), see supabase/migrations.
 * NEVER put the service_role or secret key in this file or anywhere in the website code.
 */
window.NOIR_SUPABASE = {
  url: "https://yzmztcxgfoxfxbwslxqb.supabase.co",
  key: "sb_publishable_iAr_xaqLb3ICESNMjceRXw_doG7e8_u"
};

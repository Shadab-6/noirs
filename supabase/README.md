# NOIR backend (Supabase)

The website is static HTML/CSS/JS. Everything server-side lives in Supabase:

| Piece | What it does |
|-------|--------------|
| `products` | Catalogue shown on Home, Shop, Product and the checkout "More for Your Style" row |
| `shipping_methods` | Shipping rates and delivery windows (Standard / Express) |
| `coupons` | Discount codes. Not readable from the browser; checked through `validate_coupon()` |
| `orders`, `order_items` | Customer orders. Written only by `create_order()`; read them in the Supabase dashboard |
| `addresses` | Saved delivery addresses of signed-in customers (max 10 each). Row Level Security: a customer only ever sees and changes their own rows |
| `cancel_order(id)` | Lets a customer cancel (remove) their own order while it is still pending and unpaid: deletes the order and its items and gives the coupon use back |
| `my_orders()` | Returns the signed-in customer's own orders (needs a login) |
| `create_order(payload)` | Requires a signed-in customer (guests get `auth_required`), validates the form, links the order to the customer, re-prices every item from `products`, applies the coupon and shipping, saves the order, returns the confirmation data. Safe to retry (idempotency key) |
| `newsletter_subscribers` | Emails from the home page "Join Our Journey" form. Written only by `subscribe_newsletter()`; read them in the Supabase dashboard |
| `subscribe_newsletter(email)` | Validates and saves the address (duplicates are ignored). Limit: 5 sign-ups / 10 minutes per IP |
| `validate_coupon(code, subtotal)` | Returns the coupon definition if it is valid right now |

## Security model

* The browser uses the **publishable** key (`assets/js/supabase-config.js`). It is public by design.
* Row Level Security is on for every table. Visitors can only **read** active products and shipping methods.
  Orders, order items and coupons have no public policy, so they cannot be read or written directly.
* `create_order` / `validate_coupon` are `SECURITY DEFINER` on purpose (so they can write orders and read coupons for the visitor)
  with an empty `search_path`. Prices are never taken from the request.
* Simple per-IP rate limits: 10 orders / 10 minutes, 30 coupon checks / minute and 5 newsletter sign-ups / 10 minutes.
* Never put the `service_role` / secret key in the website code.

## Everyday tasks (Supabase dashboard, Table Editor)

* **Add / edit a product:** `products` table. Set `is_active` = false to hide one. Upload the image into `assets/images/`
  and put its path (for example `assets/images/item11.webp`) in `image`. `popular` = true shows it in Home "Best Sellers" (first four). `genders` decides Men / Women: `{men}`, `{women}` or `{men,women}`. `sizes` lists what the product is sold in (`{S,M,L,XL}` or shoe sizes like `{3,4,5,6,7,8}`).
* **Coupon:** `coupons` table. `discount_type` is `percent` or `fixed`; optional `min_subtotal`, `max_uses`, `starts_at`, `expires_at`.
* **Shipping charges:** `shipping_methods` (`fee`, `free_from`).
* **Orders:** `orders` (+ `order_items`); `user_id` is the customer who placed it (orders from before accounts were required have none). Change `status` / `payment_status` as you process them.

## Migrations

`migrations/` holds the exact SQL that was applied to the project, in order. To rebuild the database elsewhere run them in
filename order (SQL editor or `supabase db push`).

## Customer accounts (Supabase Auth)

The account page (`account.html`) uses Supabase Auth through `assets/js/noir-auth.js`: email + password sign-up and sign-in,
"forgot password", and Google. Accounts live in `auth.users` (managed by Supabase, passwords are never stored by the site).
Set these in the Supabase dashboard (Authentication):

* **URL Configuration:** set *Site URL* to your real website address and add it (and `account.html`) to *Redirect URLs*.
  Confirmation and password-reset links send people back there.
* **Email:** with *Confirm email* on (recommended), new accounts must click the emailed link. Supabase's built-in email sender is
  heavily limited and meant for testing, so add your own SMTP provider (Authentication > SMTP) before real customers sign up.
* **Google:** see "Turning on Google sign-in" below. The Google button on the account page switches on by itself once it is enabled.
* **Phone:** not built yet (the button shows "Soon").

## Turning on Google sign-in

Google sign-in covers both "Sign In" and "Create Account" (a new Google user gets an account the first time). It needs a Google
OAuth client, which only you can create with your Google account:

1. **Google Cloud Console** (console.cloud.google.com) > pick or create a project > *APIs & Services* > *OAuth consent screen*
   (External, add app name and your email) > *Credentials* > *Create credentials* > *OAuth client ID* > type **Web application**.
2. Under *Authorized redirect URIs* add exactly: `https://yzmztcxgfoxfxbwslxqb.supabase.co/auth/v1/callback`
   Copy the **Client ID** and **Client secret**.
3. **Supabase dashboard** > *Authentication* > *Sign In / Providers* > **Google** > switch on, paste the Client ID and secret, save.
4. **Supabase dashboard** > *Authentication* > *URL Configuration*:
   * *Site URL*: your real website address (for example `https://www.yourstore.com`).
   * *Redirect URLs*: add the addresses the site is opened from, for example `https://www.yourstore.com/**`,
     `http://127.0.0.1:5500/**` and `http://localhost:5500/**` (for testing with Live Server).
5. Open the site from a web address (Live Server or your hosting), not from a file in a folder, and reload the account page:
   the "Soon" tag on the Google button disappears.

Google sign-in cannot work when the site is opened straight from a folder (`file://`), because Google needs a web address to come back to.

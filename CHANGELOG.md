## 2.3.8.1

- Added a database migration that retires duplicate active sweatshirt rows 19–22 while preserving their IDs for historical orders.
- Retired duplicate sweatshirt rows 19–22 from the local storefront catalogue; IDs 1–4 remain the canonical four replacement cards, with 23–25 as the later additions.

## 2.3.8.0

- Audit fixes: synchronize the live catalogue with the storefront, keep cancelled orders in customer history, accept clothing and shoe sizes in order items, and escape backend-controlled product image URLs.
- Reassert current Supabase RPC/RLS permissions in a canonical migration.

# Changelog

## 2.3.7.3 — Favicon update
- Replaced the previous NOIR favicon with the supplied NOIR monogram artwork.
- Updated all site pages to use the new PNG favicon.
- Removed the unused previous SVG favicon asset.

## 2.3.7.2

- Added a new Forest Collared Half-Zip Sweatshirt to the storefront at ₹1,999 (MRP ₹3,999).
- Added the optimized product image to the local catalogue and product fallback.
- Extended the current sweatshirt fallback set so the new product loads even when it is not yet present in Supabase.

## 2.3.7.1
- Removed four duplicate sweatshirt WebP assets that duplicated the new uploaded sweatshirt images.
- Kept the canonical uploaded filenames `item1(1).png` through `item4(1).png`.
- Updated catalogue, product fallback, homepage reference, and local Supabase migration to use the single canonical assets.
- Normalized live catalogue rows 19–22 in the frontend so stale duplicate WebP paths cannot produce broken images.

## 2.3.7.0

- Replaced product IDs 1–4 with the new four sweatshirt images while preserving the uploaded image filenames.
- Added descriptive customer-facing sweatshirt names and randomized in-range sale pricing/MRPs.
- Restored products 1–4 to the frontend catalogue without changing Supabase.
- Updated product-page fallbacks and regression tests for the replacement catalogue.

# Changelog

## 2.3.6.0
- Replaced the old first six catalogue products with a six-piece sweatshirt collection using the supplied product photography.
- Set sweatshirt prices to ₹3,999 with MRP values from ₹6,999 to ₹7,999.
- Added the `sweatshirt` collection filter and homepage collection tile.
- Archived legacy product ids 1–6 in the Supabase migration instead of deleting them, preserving historical order references.

## [2.3.5.0] - 2026-09-22

### Changed
- **About page rebuilt end-to-end** to match the supplied reference design: hero with a "Shop Now" CTA, a black stats bar (Happy Customers / Premium Products / Average Rating / Shipping), an "Our Story" section with a timeline (2024 / 2025 / Today), a "What We Stand For" values grid (4 icons), a full-bleed dark "Good Things Take Time." philosophy quote, a 3-panel editorial strip, a "Community" section with a photo/text mosaic, and a "Be Part of the Journey" newsletter panel wired to the real Supabase `subscribe_newsletter` function (same as the Home page form).
- Removed the old fake "team" section, which reused product photos (item1/2/3) captioned as if they were staff portraits — replaced with the honest, typography-led sections above. No fabricated people or stock photography was used anywhere on the page.
- Reused two existing real product photographs (`noir-hero-model.webp`, `noir-about-hero.webp`) for the hero and editorial strip; every other visual (hangtag, poster card, book/label panels, community tiles, stat/value icons) is hand-built with CSS/SVG — there is no AI image generation available in this environment, so nothing was fabricated to *look* like a photo.
- `assets/css/about.css` rewritten from scratch, scoped under a new `.ab-page` wrapper class (mirrors the existing `.pd-page` / `.co-page` pattern) so the page can use its own dark and light sections without fighting `palette.css`'s global forced colors.
- `palette.css`: added `.ab-page` to the existing opt-out list (text, buttons, inputs, placeholders) and removed now-dead legacy selectors (`.about-hero`, `.stat-box`, `.team-card`) that no longer match anything.

### Verification
- Automated test suite: 39/39 passing.
- Checked in a headless browser at 1440px and 390px widths: no horizontal overflow, no console errors, on any page (Home, Shop, Product, Wishlist, Account, About, Contact, Checkout, Privacy, Terms).
- Confirmed the About page newsletter form submits to the real `subscribe_newsletter` Supabase function (same backend call used on Home).

## [2.3.4.5] - 2026-09-22

### Fixed
- Fixed the Contact page “Send on WhatsApp” button text and icon contrast so both remain white on the dark button background.
- Supabase/backend unchanged.

### Verification
- Automated test suite: 39/39 passing.

## [2.3.4.4] - 2026-09-22

- Fixed mobile Contact page jank by disabling expensive backdrop-filter compositing on stacked contact surfaces.
- Preserved the Contact page glass appearance using translucent fills, borders, and shadows.
- Kept the shared navigation bar and Supabase backend unchanged.

## [2.3.4.3] - 2026-09-22

### Maintenance
- Removed the Git metadata directory from the distribution archive; `.git` remains required in the local Git working copy and is not part of the application payload.
- Removed unused legacy CSS files (`footer.css`, `navbar.css`) that were not referenced by any page or stylesheet.
- Removed unused image assets (`noir-hero-banner.webp`, `noir-logo.webp`, `online-shopping.png`, `remove.png`) that had no project references.
- Corrected the security changelog wording so the exposed RPC wrappers are documented as `SECURITY INVOKER` wrappers while privileged implementations remain `SECURITY DEFINER`.
- Synchronized the project version across `package.json` and `VERSION`.

### Verification
- Automated test suite: 39/39 passing.

## [2.3.4.1] - 2026-09-22

### Changed
- Redesigned the Contact page with a premium light glassmorphism layout: editorial hero, glass contact cards, refined message form, rounded fields, and responsive spacing.
- Added an explicit Privacy Policy + Terms & Conditions consent checkbox with a visual check mark before sending a message.
- Improved the WhatsApp contact form to include optional phone details, subject selection, client-side validation, and a live message character counter.
- Kept the existing shared NOIR header, bottom navigation bar, footer, Supabase integration, and backend unchanged.

### Maintenance
- Synchronized the project version across `package.json` and `VERSION`.

Versioning scheme: `MAJOR.MINOR.FEATURE.PATCH`

## [2.3.4.0] - 2026-09-22

### UI
- Redesigned the signed-in **My Orders** screen with a premium mobile-first layout inspired by the provided reference: refined order cards, status pills, tracking steps, filter tabs, order details, responsive action buttons, and a glass-style help control.
- Kept the existing global glass bottom navigation unchanged.
- No Supabase schema, data, permissions or functions were changed for this UI update.


### Fixed
- Coupon validation now works for signed-out shoppers: the `validate_coupon` RPC is callable by the anonymous browser role while the `coupons` table remains blocked from direct browser access. Coupon validation is still rate-limited and returns only the minimum discount information needed by the storefront.

### Security
- Synced the repository migration history with the live Supabase security hardening.
- Privileged order, coupon, account-order, cancellation and newsletter implementations live in the private schema; public RPCs are controlled `SECURITY INVOKER` wrappers with an empty `search_path`; the private implementations remain `SECURITY DEFINER`.
- Restricted RPC execution to the roles required by each operation and blocked direct browser access to orders, order items, coupons, newsletter subscribers and rate-limit data.
- Removed duplicate RLS policies and kept one ownership policy per action for saved addresses.
- Kept catalogue and shipping-method reads limited to active rows; browser writes remain blocked.

### Maintenance
- Synchronized the project version across `package.json` and `VERSION`.
- Added the canonical `20260922000000_noir_security_sync.sql` migration so a fresh database can reproduce the current production security state.
- Automated test suite: 39/39 passing.

## [2.3.3.0] - 2026-09-21

### Changed
- **Sign out is now a light red button** (on the account page and in Settings).
- **My Orders: "Buy again" is gone; there is a light red "Cancel order" button instead.** It asks for confirmation, then **removes the order from the database** (the order and its items are deleted, and a coupon it used is given back), and the list and the Orders count update.
- The button only appears while an order is still pending and unpaid. Orders that are confirmed, shipped, delivered or paid have no cancel button, and the database refuses to cancel them even if someone calls it directly.

### Added
- Database function `cancel_order(order_id)` (`supabase/migrations/20260921073128_noir_cancel_order.sql`, applied to the live project). Tested: guests can't call it, one customer can't cancel another's order, paid or shipped orders are refused, and a pending order is fully removed.
- `NoirApi.cancelOrder` and a unit test (39 tests).

## [2.3.2.1] - 2026-09-20

### Changed
- `supabase/README.md`: step-by-step guide for turning on Google sign-in (Google Cloud OAuth client, the exact Supabase callback address, Supabase provider and URL settings). No code changes: the Google button was already wired and switches on by itself once Google is enabled in Supabase; it shows "Soon" until then and asks for a web address when the site is opened from a folder.

## [2.3.2.0] - 2026-09-20

### Changed
- **Order confirmation now plays the supplied check-mark animation** ("Gpay Tick", a 3-second Lottie) as soon as the confirmation page opens, in place of the black circle with a check. It plays once, is larger (200px, 160px on small phones), and shows the finished tick without movement for visitors who prefer reduced motion. It also plays when the confirmation is shown again after a refresh.
- The animation is stored inside `assets/js/order-success-anim.js`, so it works when the site is opened from a folder (file://). It is drawn by lottie-web (light build), loaded while the customer fills in the form: from `assets/js/vendor/lottie_light.min.js` if that file is there (put it there to work fully offline), otherwise from the cdnjs CDN. If the player cannot load, the original check mark stays and the confirmation shows as before.

## [2.3.1.0] - 2026-09-20

### Added
- **Privacy Policy** (`privacy.html`) and **Terms & Conditions** (`terms.html`), written for how NOIR. really works: accounts and sign-in through Supabase, orders that need an account, saved addresses, the email list, the bag / wishlist kept in the browser, delivery partners, the 7-day exchange support, delivery and payment at checkout. They use the store header and footer, a contents list (sticky beside the text on desktop) with numbered sections, and link to each other. Contact details are `support@noir.com` and the Contact page. Style: `assets/css/legal.css`.

### Changed
- **Every "Privacy" and "Terms" link now works**: in the footer of Home, Shop, Product, Wishlist, About and Contact, and the "Terms of Service" / "Privacy Policy" links on the Create Account form (these open in a new tab so the form is not lost).

### Notes
- These are drafts written from what the site does. Have a lawyer read them before launch, and add your registered business name, address and grievance officer details if you have them.

## [2.3.0.4] - 2026-09-20

### Changed
- **The signed-in account page has no footer any more** (desktop and phone), the same as checkout and the Create Account / Sign In screen: the NOIR. wordmark, tagline, social icons, links and copyright line under it are gone. The header and the phone tab bar stay.

## [2.3.0.3] - 2026-09-20

### Changed
- **Checkout page has no footer any more**: the NOIR. wordmark, tagline, social icons, Privacy / Terms / Contact / Account links and the copyright line under the checkout are gone, so the page ends with the checkout itself (desktop and phone).

## [2.3.0.2] - 2026-09-20

### Changed
- **Create Account / Sign In page has no footer any more** (desktop and phone): the white NOIR. block underneath is gone, so the page ends with the soft hills. The signed-in account page keeps its footer.

## [2.3.0.1] - 2026-09-20

### Fixed
- **The bag icon now opens the cart sidebar on every page, on desktop and phones, and no longer jumps to another page.** The sidebar used to be loaded with a background request, which browsers block when the site is opened straight from a folder (file://), so the icon fell back to `cart.html`. The sidebar markup is now part of every page (Home, Shop, Product, Wishlist, Account, About, Contact, Checkout).

### Removed
- **`cart.html` is deleted completely**, together with its stylesheet (`assets/css/cart-page.css`), the cart-page code in `cart.js`, the `cart.html` fallbacks in `cart.js` / `noir-store.js`, and `components/cart-sidebar.html` (its markup now lives in each page).

### Changed
- Checkout: "Edit Cart" opens the sidebar instead of a separate page.

## [2.3.0.0] - 2026-09-20

### Changed (breaking)
- **Orders now need an account.** The database function `create_order` refuses guests (`auth_required`), so the rule can't be skipped by calling the API directly (`supabase/migrations/20260920175322_noir_orders_need_login.sql`, applied to the live project). Orders already in the table are untouched.

### Added
- **"Create an account to continue" screen** (from the supplied designs) whenever a visitor who is not signed in presses **Checkout** in the bag or on the cart page: a popup with a bag illustration on desktop, a bottom sheet on phones. Perks (Faster Checkout, Save Your Favorites, Track Your Orders, Exclusive Offers), **Sign In** and **Create Account** buttons, closes with the X, Esc or a tap outside.
- Sign In / Create Account open the account page in the right mode (`account.html?mode=signin|create&next=checkout.html`) and, once signed in or signed up, **return straight to the checkout**. Only known pages are accepted as the return target.
- Opening `checkout.html` directly while signed out shows the same screen instead of the form, and if the server ever answers "sign in first" the checkout switches to it too.
- `assets/js/checkout-gate.js`, `assets/css/gate.css`, `test/gate.test.js`.

### Fixed
- **Checkout on phones:** no more sideways overflow on narrow screens (320px), side margins now match the header, long content can't push the page wider, and the city / state / PIN row and shipping notes adapt on very small phones.

## [2.2.0.1] - 2026-09-20

### Changed
- **Account icon is back in the header on desktop only**, right beside the bag icon on every page (it opens `account.html`). On phones it stays hidden because the bottom tab bar already has Account.

## [2.2.0.0] - 2026-09-20

### Changed
- **The account icon is gone from the header on every page** (the header is back to search, wishlist on desktop, bag, and the menu on phones). The Account tab of the bottom tab bar stays, and there is a new **Account** link in the footer so desktop visitors can still reach it.
- Not signed in: the Create Account / Sign In screen is unchanged.

### Added
- **Signed-in account, following the supplied design** (`account.html`): profile header with initial avatar, name, email and "Better Choices, A Better You"; a stats card (Orders, Wishlist, Addresses); the "Style Speaks Your Story / Edit Profile" card; and the menu rows My Orders, Wishlist, Addresses, Payment Methods, Notifications, Settings and Help & Support.
  - **My Orders** shows the customer's orders (number, date, status, items with photos, total, payment status) with a working **Buy again** that puts the items back in the bag.
  - **Addresses**: add, edit, delete and set a default (up to 10). Checkout fills in the email, name and default address for signed-in customers.
  - **Settings** (also opened by the gear and "Edit Profile"): change name, change password, sign out.
  - Wishlist opens the wishlist; Help & Support opens Contact. **Payment Methods** and **Notifications** are shown as "Soon" (no payment gateway or notification service yet).
- Database (applied to the live project, `supabase/migrations/20260920130443_noir_accounts.sql`): `orders.user_id` (set from the customer's login when they order while signed in), `my_orders()`, and the `addresses` table with Row Level Security. Tested as different customers: nobody can read, change or delete another customer's addresses or orders, and guests can't call `my_orders()`.
- `test/api.test.js` and `test/auth.test.js` cover the new calls (36 tests).

### Notes
- Only orders placed while signed in appear under My Orders. Earlier and guest orders stay unlinked (matching by email would let anyone claim someone else's orders).
- The design's "Coupons" count, the camera badge / profile photo and order tracking or returns are not built, so they are not shown.

## [2.1.5.0] - 2026-09-20

### Added
- **Create Account screen** (from the supplied design) on `account.html` for visitors who are not signed in: back button, "Already have an account? Sign In", "Create Account" heading, Shop / Save / Track perks, Full Name, Email, Password and Confirm Password fields with show/hide eye buttons, terms checkbox, black "Create Account" button, "Or continue with" Google and Phone buttons, and the soft hills, leaf and "Good Choices Brighter Days" tagline at the bottom. Works on phones and desktop.
- **It really creates accounts** with Supabase Auth: sign-up, **Sign In** (the "Sign In" link switches the same screen to "Welcome back"), **Forgot password** (emails a reset link; coming back from the link opens "New password"), and **Sign out**. The session is kept on the device and refreshed automatically.
- Clear inline messages: empty or invalid fields, passwords under 8 characters or not matching, terms not ticked, "email already exists", wrong password, unconfirmed email, too many attempts, no connection.
- If email confirmation is on, sign-up shows a "Check your email" panel instead of signing in.
- **Google** sign-in is wired up and switches on by itself once Google is enabled in Supabase; until then it shows "Soon". **Phone** sign-in is not built yet ("Soon").
- Signed-in visitors see a simple placeholder account page (greeting, email, Wishlist / Bag / Shop / Contact, Sign out) until the real account design is added.
- `assets/js/noir-auth.js` (Auth client), `assets/js/account.js`, `assets/css/auth.css`, `test/auth.test.js` (10 tests). Setup notes in `supabase/README.md`.

### Notes
- The "Terms of Service" and "Privacy Policy" links point to `#` until those pages exist.
- Confirmation and reset emails need Supabase's Site URL / SMTP set up (see `supabase/README.md`); orders are still placed without an account.

## [2.1.4.3] - 2026-09-20

### Added
- **Account icon in the header on every page**, right beside the bag icon (desktop and phone), linking to `account.html`. On the Account page the icon is marked as the current page. Home, Shop, Product, Wishlist, Account, About, Contact, Cart and Checkout all have it.

## [2.1.4.2] - 2026-09-20

### Changed
- **Checkout page now uses the same header and footer as the rest of the store**: NOIR. wordmark, Home / Shop / About / Contact, search, wishlist and bag icons (with the bag count; the bag still opens the slide-in bag), and on phones the menu button. The old grey navbar and footer are gone from every page.
- The checkout summary card stays pinned just under the new header while scrolling.
- The bottom tab bar is deliberately not shown on checkout, so it can't cover the "Place Order" bar on phones.

## [2.1.4.1] - 2026-09-20

### Changed
- **Product page now has the same header as the rest of the store**: NOIR. wordmark, Home / Shop / About / Contact (Shop marked as current), and the search, wishlist and bag icons (with the bag count). On phones it also gets the menu button, the bottom tab bar and the new footer, like Shop, About and Contact. The bag icon still opens the slide-in bag.
- Product page content lines up with the header (same side margins and maximum width).
- Phones: the sticky "Add To Cart" bar now sits just above the tab bar, and it appears as soon as the main button is hidden behind the tab bar (before, the button could be covered with no sticky bar showing).

### Notes
- Checkout still uses its previous header. (Updated in 2.1.4.2.)

## [2.1.4.0] - 2026-09-20

### Added
- **Women's collection: 8 new pieces, Women's only.** Nothing was added to Men's (it still shows the same 8 pieces). Applied to the live Supabase project (`supabase/migrations/20260920074514_noir_women_collection.sql`).

  | ID | Piece | Section | Price | MRP |
  |----|-------|---------|-------|-----|
  | 11 | Heritage Court Sneaker | Shoes | ₹4,999 | ₹9,499 |
  | 12 | Classic Canvas Low-Top | Shoes | ₹2,799 | ₹5,499 |
  | 13 | Light Wash Wide-Leg Jeans | Bottoms | ₹3,399 | ₹7,999 |
  | 14 | Striped Half-Zip Sweater | Knitwear | ₹3,899 | ₹9,199 |
  | 15 | Pleated Wide-Leg Trousers | Bottoms | ₹3,799 | ₹8,599 |
  | 16 | Layered Collar Cardigan | Knitwear | ₹3,999 | ₹9,599 |
  | 17 | Wide-Leg Cargo Pants | Bottoms | ₹3,599 | ₹8,899 |
  | 18 | Bow Detail Flare-Sleeve Top | Tops | ₹3,199 | ₹8,299 |

  Shoes are priced ₹1,999-₹6,999 with MRP ₹3,999-₹9,999; the six clothing pieces use ₹1,999-₹3,999 with MRP ₹7,999-₹9,999, all prices and MRPs different (discounts 47%-61%). They are not flagged "popular", so Home "Best Sellers" is unchanged.
- **New shop sections:** Shoes, Bottoms, Knitwear and Tops. A section only appears in the filter bar when the chosen Men / Women view has pieces in it (Men still shows Hoodies, Jackets, Jersey; Women shows Hoodies, Jackets, Bottoms, Knitwear, Tops, Shoes).
- **Per-product sizes** (`products.sizes`): clothes are S-XL, shoes are UK sizes 3-8. The product page shows each product's own sizes, the checkout size picker does too, and `create_order` now checks the size against that product's list (it was fixed to S/M/L/XL).
- Product photos converted to WebP (`item11.webp` to `item18.webp`); the three portrait shots were extended to a square so nothing is cropped in the shop cards.

### Changed
- `assets/data/product.json` and the built-in product list carry the new products and `sizes`. `test/catalogue.test.js` now also checks that Men's is untouched, the price/MRP ranges, distinct prices and that every image exists.

## [2.1.3.0] - 2026-09-20

### Added
- **Men and Women in the shop.** The filter bar is now `All | Men | Women | Hoodies | Jackets | Jersey`. Men / Women can be combined with a category (for example Women + Hoodies) and clicking the selected one again turns it off; the piece count shows the section ("2 pieces · Women"). The choice is kept in the address bar: `shop.html?gender=women&category=hoodie`.
- Home: **Shop now** (top banner) opens the shop with **Men** already selected (`shop.html?gender=men`); **Shop Women** opens it with **Women** already selected (`shop.html?gender=women`).
- Database: `products.genders` (`men`, `women` or both). Everything is in Men; **Noir Black Hoodie (8) and Taupe Bomber Jacket (9) are in both Men and Women.** Applied to the live Supabase project (`supabase/migrations/20260920073541_noir_product_genders.sql`). To change a product's section later, edit `genders` in the Supabase Table Editor.
- `assets/data/product.json` and the built-in product list carry `genders` too (used if Supabase can't be reached). `test/catalogue.test.js` checks them.

## [2.1.2.2] - 2026-09-20

### Changed
- **Both pending migrations were applied to the live Supabase project**: the newsletter table + `subscribe_newsletter()` and the removal of products 5 and 6 (the catalogue now has 8 products). Checked as an anonymous visitor: sign-up works, a repeat sign-up is silently accepted, an invalid email is rejected, the subscriber list cannot be read directly.
- Migration files renamed to the versions Supabase recorded, and one small follow-up added: `noir_newsletter_least_privilege` (removes the default table grants on `newsletter_subscribers`).

## [2.1.2.1] - 2026-09-20

### Removed
- Products 5 (Black Hoodie) and 6 (Brown Hoodie): removed from the built-in product list (`product.js`), `assets/data/product.json`, and their images `item5.png` / `item6.png` were deleted.
- **Run `supabase/migrations/20260920130000_noir_remove_products_5_6.sql` in Supabase** so the live catalogue matches. It deletes the two rows (or just hides them if an old order used them).

## [2.1.2.0] - 2026-09-20

### Added
- Home: under the banner, a trust strip (Free Shipping, Easy Returns, Secure Payment) and a "Join Our Journey" newsletter sign-up. The free-shipping amount is read from the shipping settings (currently ₹1,999), so it always matches what checkout charges.
- Newsletter backend: `newsletter_subscribers` table and `subscribe_newsletter()` function (`supabase/migrations/20260920120000_noir_newsletter.sql`). **Run this migration in Supabase before the form can save emails.** Duplicates are ignored, addresses are validated, 5 sign-ups / 10 minutes per IP.
- `NoirApi.subscribeNewsletter()`, `NoirShared.isValidEmail()` and tests for both.

### Changed
- New centred footer on Home, Shop, Wishlist, Account, About and Contact: NOIR. wordmark, tagline, Instagram / X / YouTube / Pinterest icons, Privacy / Terms / Contact, copyright line.

### Notes
- The social icons and the Privacy and Terms links still point to `#` until real URLs and pages exist.

## [2.1.1.0] - 2026-09-20

### Changed
- Product cards: the size boxes were replaced by a full-width black "Add to cart" button with white text (Home, Shop, Wishlist). A toast offers "View cart"; the checkout asks for the size.
- About, Contact and Cart now use the same header, footer and mobile tab bar as Home (`.n-chrome` in `store.css`). Product and Checkout keep the previous header.

### Added
- Home: "Minimal Looks, Maximum You." banner under Collections with a working "Shop Women" button (links to the full shop; there is no women's category in the catalogue yet). Images: `noir-women-banner.webp` / `-sm.webp`.

### Fixed
- The cart page showed the slide-in cart drawer as loose text under the page. The drawer is no longer loaded on `cart.html`, and the page now ends at Checkout.

## [2.1.0.0] - 2026-09-20

### Changed
- **Home page redesigned** from the supplied desktop and mobile mockups: full-bleed "More Than Clothes." hero (desktop) / rounded hero card (phone), "Shop now" and "Explore collection" buttons, "Best Sellers" grid with a working "View all", and a "Collections" section (Hoodies, Jackets, Jersey) linking to the filtered shop.
- **Shop page redesigned** to use the same product cards: category chips, search, sort. Filters live in the address bar (`shop.html?category=jacket&q=black&sort=low`), so a filtered view can be linked to.
- New product card: heart, sale tag, old price and an add-to-bag control, heart to save to the wishlist, sale tag and old price.
- Phones get a bottom tab bar (Home, Shop, Wishlist, Account) and a slide-in menu; desktop gets an inline header with search, wishlist and bag.

### Added
- `wishlist.html` (saved pieces, kept in the browser's localStorage, with Undo) and `account.html` (guest page linking to wishlist, bag, contact, about; sign-in is not built yet).
- `assets/js/noir-store.js` (shared cards, wishlist, toast, header behaviour), `assets/css/store.css`, `test/store.test.js`.
- Hero photo cut from the supplied mockup: `assets/images/noir-hero-model.webp` and `noir-hero-model-sm.webp`.

### Notes
- Colour swatches from the mockup are not included: products have no colour variants in the database.
- The mockup's "01 / 03" slide counter is not included: there is a single banner.
- `palette.css` now also exempts `.n-shell` (like `.pd-page` and `.co-page`). `home.css` and `shop.css` were rewritten; `products.js` and `shop.js` were rewritten. Product and Checkout keep the previous header.
- Fonts (Newsreader, Inter) load from Google Fonts.

## [2.0.0.0] - 2026-09-19

### Changed (breaking)
- **Supabase is now the backend. The local Node/Express server is gone.** The site is fully static and can be opened with Live Server or any static host; `npm start`, `server.js`, `data/orders.json`, `.env` and the Express/cors/dotenv dependencies were removed.
- Orders are saved in Supabase by the `create_order` database function, which validates the form, **re-prices every item from the `products` table**, applies the coupon and shipping, and returns the confirmation data. Retrying is safe (idempotency key).
- Coupons live in the `coupons` table and are checked with `validate_coupon` (they can no longer be read from the website code). A coupon saved in the cart is re-checked at checkout.
- Shipping charges and delivery windows come from the `shipping_methods` table.
- Products come from the `products` table on Home ("Trending Products" = first four flagged `popular`), Shop, Product page and the checkout "More for Your Style" row. If Supabase can't be reached the built-in product list is shown, but orders cannot be placed.
- The two hand-written product cards in `shop.html` and the four on the home page were removed; every card is now rendered from the catalogue, so a price edited in Supabase is the price shown everywhere.
- The "demo order" fallback of the checkout was removed (orders now need the backend).

### Added
- Database (see `supabase/`): tables `products`, `shipping_methods`, `coupons`, `orders`, `order_items`; Row Level Security on all of them (visitors can only read active products and shipping methods); `create_order` and `validate_coupon` functions with input validation and per-IP rate limits (10 orders / 10 min, 30 coupon checks / min); constraints and indexes; migrations in `supabase/migrations/`.
- `assets/js/noir-api.js` (only place that talks to Supabase) and `assets/js/supabase-config.js` (project URL + publishable key).
- Unit tests for the price/validation rules and the API client (`npm test`, no dependencies).

### Files changed
Added: `assets/js/noir-api.js`, `assets/js/supabase-config.js`, `supabase/`, `test/shared.test.js`, `test/api.test.js` (rewritten). Changed: `assets/js/noir-shared.js`, `cart.js`, `checkout.js`, `shop.js`, `product.js`, `products.js`, `assets/data/product.json` (product 4 flagged popular), `index.html`, `shop.html`, all page `<script>` lists, `package.json`, `.gitignore`. Removed: `server.js`, `package-lock.json`, `.env.example`, old server tests.

## [1.1.1.0] - 2026-09-19

### Changed
- **Order confirmation page redesigned** to follow the supplied mockup: large "Order Confirmed!" heading with a black check badge, order number / order date / estimated delivery / payment method tiles, a "Delivering to" card, and an Order Summary card (item count, sizes, quantities, subtotal, discount, shipping, total). The checkout title and progress steps are hidden once the order is placed.
- Estimated delivery is calculated from the chosen shipping method (Standard 3-7 / Express 1-3 business days, weekends skipped).
- New "More for Your Style" section under the confirmation with four store products (newest first, excluding what was just ordered), each linking to its product page.
- "Continue Shopping" and "Print Order" buttons (print view keeps only the order details). Fully responsive.
- The mockup's "confirmation email" sentence and non-working "Track Your Order" / wishlist hearts were left out because those features don't exist yet.

### Files changed
`assets/js/checkout.js`, `assets/css/checkout.css`, `assets/js/noir-shared.js` (numeric delivery windows), `test/checkout.test.js`, `VERSION`, `CHANGELOG.md`

## [1.1.0.0] - 2026-09-19

### Added
- **Checkout page (`checkout.html`)**, built from the supplied mockup: contact information, shipping address (with India state list, PIN and mobile-number validation), shipping method (Standard / Express), order summary with quantity controls and discount code, payment method (UPI, Card, Net Banking, Wallets), "Place Order" button, three-step progress indicator (Shipping, Payment, Review) and an order confirmation view with order number.
- Items added from the shop without a size get an inline size picker in the checkout summary, so every order line has a size.
- Phone: sticky total + "Place Order" bar while scrolling the form. Checkout form is remembered per tab until the order is placed.
- `assets/js/noir-shared.js`: coupons, shipping charges and checkout validation shared by the browser and the server, so displayed prices always match what the server charges.
- Order API: `POST /api/orders` now accepts checkout details (customer, address, shipping method, payment method, coupon, item sizes), validates them, and calculates subtotal / discount / shipping / total on the server. Plain `{ items }` orders behave exactly as before.
- Tests for the shared rules and the checkout order API (`test/checkout.test.js`); tests write to a temporary orders file (`ORDERS_FILE`).

### Changed
- **The cart's order button no longer opens WhatsApp.** The drawer button ("Proceed to Checkout") and the cart page button ("Proceed To Order") are now black "Checkout" buttons that go to `checkout.html`. `whatsapp-order.js` and its script tags were removed; the Contact page's WhatsApp message form is untouched.
- Coupons are remembered across pages (localStorage), so a code applied in the cart is still applied at checkout. The cart page total now includes the coupon.
- Shipping charges follow the shared rules: Standard is free from ₹1,999, otherwise ₹99; Express is ₹199. (The cart previously always showed "Free".)
- Cart drawer no longer shows a made-up "Size M" / "Grey" for items that have no size or colour.
- Cart page IDs renamed (`cartPageTotal`, `cartPageCheckoutBtn`) to remove duplicate IDs with the drawer.
- `palette.css`: the checkout page opts out of the global forced colours (`.co-page`), like the product page.

### Files changed
`checkout.html`, `assets/css/checkout.css`, `assets/js/checkout.js`, `assets/js/noir-shared.js`, `assets/js/cart.js`, `assets/js/main.js`, `assets/css/cart.css`, `assets/css/cart-page.css`, `assets/css/palette.css`, `components/cart-sidebar.html`, `cart.html`, `index.html`, `shop.html`, `product.html`, `about.html`, `contact.html`, `server.js`, `test/checkout.test.js`, `.env.example`, `VERSION`, `CHANGELOG.md`. Removed: `assets/js/whatsapp-order.js`.

### Known limits
- Payment methods are recorded with the order (status `pending`); no payment gateway is connected yet. Orders are saved to `data/orders.json` on the server.
- Opened from Live Server without `npm start`, Place Order falls back to a clearly labelled demo order stored in the browser only.

## [1.0.4.0] - 2026-09-19

### Added
- **4 new products in the shop** (also on the product detail page, cart and "You May Also Like"):

  | ID | Product | Category | Price | MRP |
  |----|---------|----------|-------|-----|
  | 7  | Forest Green Hoodie | hoodie | ₹2,499 | ₹8,799 |
  | 8  | Noir Black Hoodie   | hoodie | ₹2,199 | ₹8,499 |
  | 9  | Taupe Bomber Jacket | jacket | ₹3,299 | ₹9,299 |
  | 10 | Black Bomber Jacket | jacket | ₹3,699 | ₹9,799 |

- New images `assets/images/item7.webp` to `item10.webp` (about 100-180 KB each, converted from the 2+ MB PNGs supplied). The existing "Jackets" filter option now has products.

### Changed
- Shop page keeps products in catalogue order and respects sorting. Before, the two hand-written cards (Black Hoodie, Brown Hoodie) were always pushed to the end, so Price Low To High put them last.
- Product page detects photos with their own backdrop by checking all four corners, and sizes the gallery card to the photo's shape (between 4:5 and 1:1) so square photos are not cropped. Related-product cards use the same detection.

### Files changed
`assets/data/product.json`, `assets/js/shop.js`, `assets/js/product.js`, `assets/js/products.js`, `assets/css/product.css`, `assets/images/item7-10.webp`, `VERSION`, `CHANGELOG.md`

## [1.0.3.0] - 2026-09-18

### Changed
- **Product detail page (`product.html`, reached from Quick View) redesigned**: breadcrumb, rounded gallery card with sale / new-arrival badge and gentle hover zoom, larger title, refined price block (₹7,999 formatting, discount pill, "You save" amount), pill-style size selector, quantity stepper, and icon-based shipping / returns / finish highlights.
- **"Add To Cart" is now a black button with white text.** `palette.css` was forcing it white-on-white, and it also turned the discount badge and selected size black-on-black.
- Missing size now shows an inline message with a small shake and scrolls to the size options, instead of a browser `alert()`. The button confirms with "Added To Cart" after adding.
- Photos that ship with their own backdrop fill the gallery card; white-background product shots blend into it.
- Product page only re-renders when `product.json` actually differs from the built-in list, so a picked size is no longer reset when the data finishes loading.

### Added
- Quantity selector (1-10) on the product page.
- "You May Also Like" section with related products (same category first).
- Sticky add-to-cart bar on phones while the main button is off screen.

### Files changed
`product.html`, `assets/css/product.css`, `assets/js/product.js`, `assets/css/palette.css` (product page opts out of the global forced colours via `.pd-page`; other pages unchanged), `VERSION`, `CHANGELOG.md`

## [1.0.2.0] - 2026-09-18

### Added
- **About page hero image**: the model photo now sits beside the "ABOUT NOIR. / Minimal Luxury Redefined." text in a two-column layout, vertically centered, with rounded corners, a soft shadow and a thin offset outline frame.
- New asset `assets/images/noir-about-hero.webp` (~42 KB, 756x941). It is the photo area of the supplied About mockup, so the headline text baked into the mockup is not repeated.

### Changed
- `about.html` hero: existing text wrapped in `.about-hero-text` and the image added in a `<figure class="about-hero-media">`. Text content, navbar and typography are unchanged.
- Layout stacks (image below the text) at 1200px and below; the image always keeps its natural aspect ratio (no crop, no stretch).

### Files changed
`about.html`, `assets/css/about.css`, `assets/images/noir-about-hero.webp`, `VERSION`, `CHANGELOG.md`

## [1.0.1.0] - 2026-09-18

### Changed
- **Cart sidebar redesigned**: card-style items with rounded product images, size/colour chips, per-item line total, SVG remove icon, pill quantity stepper, circular close button, refreshed empty state.
- **Subtotal, total and "Proceed to Checkout" are now pinned to the bottom** of the cart; only the item list scrolls, so the order button is always visible without scrolling.
- Coupon entry is now a collapsible "Have a coupon code?" row to save vertical space. The Discount row only appears when a coupon is active.
- **"Proceed to Checkout" is now black with white text** (cart sidebar) and "Proceed To Order" on the cart page. Previously `palette.css` forced every `<button>` to white/black with `!important`.
- Cart page (`cart.html`): card layout, formatted prices (₹7,999), shipping line, black order button.

### Fixed
- Cart mobile UI: full-width panel using dynamic viewport height (`100dvh`), safe-area padding, 16px coupon input (prevents iOS zoom), compact layout on short screens, background page no longer scrolls behind the open cart.
- Cart page on mobile: total and order button stay pinned to the bottom of the screen while scrolling the item list.
- Hidden cart is now `visibility: hidden` when closed, so it can't be tabbed into; ARIA dialog attributes added.

### Files changed
`components/cart-sidebar.html`, `assets/css/cart.css`, `assets/css/cart-page.css`, `assets/js/cart.js`, `cart.html`, `VERSION`, `CHANGELOG.md`

## [1.0.0.0]
- Baseline version received (package.json `1.0.0`).

## 2.3.7.0
- Renamed the six new sweatshirt display names to Item 1, Item 2, Item 3, Item 4, Item 20 and Item 21.
- Fixed the homepage featured-product selection so the current sweatshirt collection is shown even when Supabase still contains stale legacy popular rows.
- Added a local current-collection fallback when the Supabase catalogue is missing any of the six sweatshirt products.

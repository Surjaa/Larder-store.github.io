# Larder — a modern commerce system

A complete demo store you can run on your own computer: storefront, shopping cart, checkout, order tracking, a small backend that **saves customers and orders**, and an **admin page** that lists who ordered what.

No frameworks. No build step. No `npm install`. Just Node.js.

---

## Why use this

| Instead of… | Larder gives you… |
|---|---|
| A basic Amazon clone (grid of products + "Add to cart" text change) | A commerce *system*: mega menu, multi-select filters, compare, quick view, cart drawer, coupon interface, checkout stepper, order tracking |
| A front-end-only demo whose data vanishes | A real backend that stores users and orders in `data/db.json`, plus an admin dashboard |
| Trusting the browser for prices | Server-side price checking, so a customer cannot change a price from the browser console |
| Heavy tooling | Plain HTML, CSS and JavaScript you can read, edit and learn from |

Good for: learning, prototyping a shop, showing a client a working concept, or as a starting point for a small real store.

---

## Quick start (2 minutes)

1. Install **Node.js 18 or newer** from https://nodejs.org
2. Open a terminal in this folder and run:

   ```bash
   node server.js
   ```
3. Open **http://localhost:3000** — the store.
4. Open **http://localhost:3000/admin.html** — the admin page. Default key: `admin123`.

To change the admin key (do this before showing the site to anyone):

```bash
# Mac / Linux
ADMIN_KEY=my-secret-key node server.js

# Windows (PowerShell)
$env:ADMIN_KEY="my-secret-key"; node server.js
```

To use another port: `PORT=8080 node server.js`.

> **No Node installed?** You can double-click `index.html` and browse the store. Cart, wishlist and checkout all work, but orders and accounts are saved **only in your browser**, not sent to the shop. You will see a notice saying so.

---

## How to use it

### As a customer
1. **Browse** — hover **Shop** for the mega menu, or search (suggestions appear as you type).
2. **Filter** — on *All products* or a category: tick several categories and brands, drag the price range, pick a rating, hide out-of-stock items, change the sort. Active filters appear as removable chips.
3. **Compare** — tick *Compare* on up to 3 products, then open the tray at the bottom.
4. **Quick view** — hover a product card and click *Quick view* to pick size and flavour without leaving the page.
5. **Product page** — switch between 4 images (hover the big image to zoom), choose size and variant, check delivery by PIN code, read specs and reviews.
6. **Add to cart** — the product flies to the cart, the badge counts up, and a toast appears with a *View cart* shortcut. The cart drawer lets you change quantity, remove with **Undo**, and try coupons.
7. **Coupons** — `WELCOME10` (10% off above ₹299), `FLAT50` (₹50 off above ₹399), `FREESHIP` (free delivery above ₹199).
8. **Checkout** — four steps: Address → Delivery → Payment → Review. On the first step you can leave a **note for the shop**.
9. **Track** — after ordering you land on the order page with an animated tracking timeline. (The timeline moves automatically every 40 seconds for demo purposes. Use *Skip to next step* to speed it up.)
10. **Account** — create an account or sign in (optional; guests can check out), save addresses, see all your orders.

### As the shop owner (admin page)
Open `/admin.html` and enter the admin key. You will see, for every order:

- Order number and date/time
- **Customer name, phone** (tap to call), email
- **Delivery address**
- **Items** (name, size, flavour, quantity)
- **Customer note**
- Total, payment method, coupon used
- **Status** dropdown: New → Packed → Shipped → Delivered (or Cancelled)

Also: search, filter by status, **Export CSV** (opens in Excel/Sheets), a **Customers** tab listing registered accounts, and automatic refresh every 12 seconds (new orders flash yellow).

---

## What is in this folder

```
larder-store/
├── index.html            The storefront page
├── admin.html            The admin dashboard page
├── server.js             Backend: serves the site, saves users + orders
├── package.json          "npm start" shortcut (no dependencies)
├── css/
│   ├── styles.css        Storefront styles + animations (colours are variables at the top)
│   └── admin.css         Admin styles
├── js/
│   ├── data.js           Products, categories, coupons, pricing rules (shared by browser AND server)
│   ├── app.js            All storefront behaviour (routing, cart, filters, checkout, tracking…)
│   └── admin.js          Admin dashboard behaviour
├── images/
│   ├── products/         80 product images (front, back, close-up, serving views)
│   ├── logo.svg  favicon.svg  og-cover.svg
├── data/
│   └── db.json           Created on the first order/signup. THIS is your database.
└── tools/
    └── generate-images.js  Re-creates all images (node tools/generate-images.js)
```

---

## Where is my data?

Everything is in **`data/db.json`**: customers (passwords are salted-hashed, never stored as text), orders, and sign-in sessions. It is plain JSON, so you can open it in any editor. Back it up by copying the file. Delete it to start fresh.

The browser also keeps a copy of the visitor's own cart, wishlist and orders in `localStorage`.

---

## Customising

| I want to… | Do this |
|---|---|
| Change products, prices, stock | Edit `js/data.js` → `PRODUCTS` (restart not needed for the browser; restart `server.js` so it re-reads prices) |
| Add a product image of my own | Put `my-id-front.jpg` (and `-back`, `-detail`, `-life`, `-front-bare`) in `images/products/` and set `IMG_EXT = 'jpg'` at the top of `js/app.js` |
| Regenerate the sample images | `node tools/generate-images.js` |
| Add or edit coupons | `js/data.js` → `COUPONS` |
| Change free-delivery limit | `js/data.js` → `FREE_AT` |
| Change brand colours | `css/styles.css` → `:root` variables (`--brand`, `--saffron`, …) |
| Change order statuses | `js/data.js` → `ORDER_STATUSES` |
| Rename the store | Search for "Larder" in `index.html`, `js/app.js`, `admin.html` |

---

## Animations included

Add-to-cart flight → badge bounce → toast with countdown bar · wishlist heart pop with particle burst · cart drawer slide · mega-menu drop · hero words, floating packs and morphing blob · card entrance (staggered) · image hover zoom · gallery cross-fade · scroll-reveal sections · checkout stepper progress fill · coupon "stamp" · animated tracking truck and pulsing stage · order-placed checkmark + confetti. All of it switches off automatically for visitors who set "reduce motion" in their device.

---

## API (for developers)

| Method & path | Who | What |
|---|---|---|
| `POST /api/register` | public | Create account → `{token, user}` |
| `POST /api/login` | public | Sign in → `{token, user}` |
| `GET /api/me` · `POST /api/logout` | signed in | Current user / sign out |
| `POST /api/orders` | public | Place an order (server re-checks prices and stock) |
| `GET /api/my-orders` | signed in | The user's orders |
| `GET /api/admin/orders` | admin key | All orders |
| `GET /api/admin/users` | admin key | All customers |
| `PATCH /api/admin/orders/:id` | admin key | Change order status |
| `GET /api/admin/export.csv` | admin key | Orders as CSV |

Send the admin key in the `x-admin-key` header. Send user tokens as `Authorization: Bearer <token>`.

---

## Honest limits — read before going live

This is a solid foundation, not a finished production shop.

- **Payments are fake.** No money moves. For real sales, integrate a gateway (Razorpay, Stripe, PayU…) on the server. Never collect card numbers yourself.
- **Order tracking is simulated** in the customer's browser. Changing a status in the admin page updates the order for *signed-in* customers (Delivered/Cancelled), but there is no courier integration, SMS or email.
- **The database is a JSON file.** Fine for a few hundred orders and one server. For more traffic, move to SQLite/PostgreSQL.
- **Admin protection is a single shared key.** Change it, and put the site behind **HTTPS** (e.g. a reverse proxy like Caddy/Nginx, or a host that provides it). Without HTTPS, keys and passwords travel in the clear.
- **Stock is not decremented** when an order is placed (stock is just in/out in `data.js`).
- **Customers cannot cancel an order that the shop already received** — they should contact you. (Cancelling is only offered for orders saved on their own device.)
- There is no email/SMS confirmation, password reset, or rate limiting beyond a basic per-IP cap.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Shop server not reachable" notice | Start the server: `node server.js`, then open `http://localhost:3000` (not the file directly) |
| Admin says "key is not correct" | Use the key you set with `ADMIN_KEY`; default is `admin123` |
| Port already in use | `PORT=3001 node server.js` |
| Fonts look different offline | Fonts load from Google Fonts; a system font is used if offline |
| Want a clean slate | Stop the server, delete `data/db.json`, start again. In the browser: Account → *Reset demo data* |

Node 18+ is required (check with `node -v`).

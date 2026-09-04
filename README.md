# Nivelle

Storefront site for the Nivelle Shopify store, deployed to GitHub Pages.

Products, prices, images, colourways and stock are synced from
`www.nivellebags.shop`. Nothing is hand-written in the catalog — every
buy button links to a Shopify cart permalink, so carts, payment and delivery
are handled by Shopify.

## Structure

| Path | What it is |
|---|---|
| `index.html` | Landing page — hero, full range, tote spotlight, colourways |
| `shop.html` | All products, with colour / price / availability filters |
| `product.html?slug=<handle>` | Product detail, rendered from the catalog |
| `about.html`, `contact.html` | Brand and support pages |
| `js/products-data.js` | **Generated.** The synced Shopify catalog |
| `js/catalog.js` | Card markup, cart permalinks, colourway strip |
| `js/shop.js`, `js/pdp.js` | Shop filters, product detail rendering |
| `js/main.js` | Header, drawer, reveal observer, forms |
| `js/motion.js` | Scroll choreography and the animated illustrations |
| `css/styles.css` | Design tokens and all page styles |
| `scripts/sync-shopify.mjs` | Pulls the catalog from Shopify |

## Re-syncing the catalog

Prices, stock and new products only change on this site when the catalog is
regenerated. `SHOPIFY_STORE_DOMAIN` is the Admin API host (the `.myshopify.com`
one); the public storefront domain used for every product and cart link is read
back off the products, so moving to a new domain fixes itself on the next sync:

```bash
SHOPIFY_STORE_DOMAIN=bc31be-dv.myshopify.com \
SHOPIFY_ADMIN_TOKEN=shpat_xxx \
node scripts/sync-shopify.mjs
```

Then commit the updated `js/products-data.js`.

The token needs **`read_products` only**. Create it in Shopify admin →
Settings → Apps and sales channels → Develop apps → your app → Admin API
access token. Keep it out of the repo — pass it as an environment variable, or
store it as a GitHub Actions secret if you want the sync to run on a schedule.

Nothing secret ends up in the generated file: it contains only product data
that is already public on the storefront.

## Local preview

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Notes

- Product descriptions are empty in Shopify, so product pages fall back to a
  generated line. Filling in descriptions in Shopify and re-running the sync
  will surface them automatically.
- The contact form has no backend — it composes a message in the visitor's own
  mail client addressed to the shop email.

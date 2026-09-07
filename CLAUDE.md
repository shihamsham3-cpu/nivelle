# Nivelle

A Shopify store selling affordable faux-leather handbags and plush bag charms.
The live storefront is **https://www.nivellebags.shop**, served by Shopify from
a custom theme in `theme/`.

## Read this first

This repo contains **two separate storefronts**, and only one of them is live:

| | Status |
|---|---|
| `theme/` — a Shopify Online Store 2.0 theme | **Live.** This is the real storefront. |
| `index.html`, `shop.html`, `product.html`, `css/`, `js/` | **Superseded.** A static GitHub Pages site from before the Shopify rebuild. |

The static site was the original build; the theme is a port of its design to
Liquid. `README.md` documents only the static site and is out of date. Work on
`theme/` unless asked otherwise. The static files are kept because the design
originated there, not because they serve traffic.

## Catalogue

Products are the source of truth in Shopify, not in this repo. Query the Admin
API rather than trusting anything written here — this table is a snapshot.

**Bags** (`productType: Handbag`) — The Odette, The Marlowe, The Vesper, The Wren
**Charms** (`productType: Bag Charm`) — The Scrapper Bunny, The Bramble Bear, The Clover Alpaca

### Conventions that the theme depends on

- **`productType` drives everything.** Two automatic (smart) collections filter
  on it: `bags` (= `Handbag`) and `charms` (= `Bag Charm`). Those collections
  feed the nav, the "Add a charm" upsell, the cart-drawer upsell, the
  breadcrumb, and the hero's live product counts. A new product with the wrong
  type silently disappears from all of it. Nothing needs sorting by hand.
- **Names follow "The ___".** Bags are the bare name (`The Odette`). Accessories
  keep a searchable noun (`The Bramble Bear Bag Charm`) — nobody searches "The
  Bramble", plenty search "woven bear keychain".
- **Colour option must be named `Color`** and be the only option, or the swatch
  pickers fall back to plain text. Variant title is then the colour name.
- **Colour names stay plain and shared** across products (Black, Tan, Cream…),
  because they render as swatches from one shared map. Invent a poetic name and
  it renders as a neutral grey chip.
- **Every variant gets its own photo** via `mediaId`, so picking a colour swaps
  the gallery image.
- **Write alt text naming the colour on every image.** This is not only for
  accessibility and image search: it is the only way an agent can tell which
  photo is which colour, because the sandbox cannot load `cdn.shopify.com`
  (see Constraints). Phone uploads arrive named `rn-image_picker_lib_temp_*`
  with no metadata at all.
- **Renaming a product?** Change the handle too and add a `urlRedirect` from the
  old one. Deleting a product? Delete its redirect, or it points at a 404.

## Theme architecture

Vanilla Liquid + CSS + ES5-flavoured JS. No build step, no framework, no
dependencies. `theme/` is zipped and uploaded as-is.

| Path | Notes |
|---|---|
| `assets/styles.css` | Every style. Design tokens at the top; no preprocessor. |
| `assets/cart.js` | AJAX cart. Owns the **only** add-to-cart path. |
| `assets/product.js` | Variant selection on the product page. |
| `assets/upsell.js` | Colour selection inside "Complete the look" cards. |
| `assets/scene3d.js`, `motion.js`, `main.js` | 3D hero layer, scroll motion, chrome. |
| `snippets/swatch-color.liquid` | Colour name → hex. Unknown names → neutral chip. |
| `snippets/complete-the-look.liquid` | Accessory upsell. `layout: 'inline'` (buy box) or section. |
| `sections/main-product.liquid` | Product page. Buy box order: picker → qty → add → upsell → description. |
| `sections/cart-drawer.liquid` | Drawer + its upsell. Re-rendered server-side on every cart change. |

### Two rules worth keeping

**One add-to-cart path.** `cart.js` has a delegated `submit` listener on
`document` for `[data-add-to-cart-form]`. Every add — main buy button, upsell
card, drawer upsell — is a real form carrying that attribute, so they all go
through one code path and one Section Rendering refresh. The drawer's colour
`<select>` is literally the form's `name="id"` field, so adding from the drawer
needs no JavaScript of its own. **Do not add a second fetch-based add path.**

**Delegate every listener that touches the drawer.** `swapDrawer()` replaces the
drawer's `innerHTML` wholesale on each cart change. Anything bound directly to
nodes inside it dies after the first add.

## Bugs that already cost a day — don't reintroduce them

- **Untracked inventory is not a stock signal.** These products have
  `tracked: false`, so `variant.available` is `false` for everything and every
  colourway rendered "sold out". Correct test, used everywhere:
  `inventory_management == blank or variant.available`. Never `| where: 'available'`.
- **`forloop.parentloop` is one loop up, not the outer one you meant.** Using it
  to index options from inside a values loop produced wrong availability. Assign
  an explicit `option_index = forloop.index0` in the options loop.
- **Bare `1fr` grid tracks have an *auto* minimum, not zero.** A nowrap flex row
  of nine 40px swatches gave a 456px min-content that propagated up and made the
  whole document 480px wide on a 390px phone, so mobile Chrome zoomed the page
  out. Use `minmax(0, 1fr)` for every track, and let swatch rows wrap.
- **`clip-path` on an IntersectionObserver target zeroes its ratio**, so the
  reveal never fires. Animate a `::before` curtain instead.
- **`[hidden]` loses to any author `display` rule.** Keep the
  `[hidden] { display: none !important; }` reset.
- **Shopify has emptied `config/settings_schema.json` to `[]` on import.** Check
  it after every upload; repair with `themeFilesUpsert`.
- **Accessories are the wrong scale for the 3D hero.** It skips `Bag Charm`, and
  its `limit` is on a running count, not the loop, so the filter can't starve it.
- **Don't hardcode catalogue counts in copy.** They went stale three times. The
  hero counts the `bags` and `charms` collections at render time.

## Shipping a theme change

```bash
rm -f dist/nivelle-theme.zip
(cd theme && zip -rq ../dist/nivelle-theme.zip . -x '*.DS_Store')
git add -A && git commit && git push -u origin <branch>
```

Then `themeCreate` with the raw GitHub URL of `dist/nivelle-theme.zip` pinned to
the commit SHA, name it the next `Nivelle — 3D storefront vN`, and ask the user
to publish it. Verify by comparing each file's `checksumMd5` from the theme API
against `md5sum` locally — the upload is silent about corruption.

Validate before shipping: `python3 -c "import json;json.load(open(...))"` on every
JSON template and `{% schema %}` block, `node --check` on JS, and check Liquid
tag balance. A malformed `{% schema %}` is accepted at upload and only fails when
the page renders.

## Constraints on the agent sandbox

- **`cdn.shopify.com`, `www.nivellebags.shop` and the `.myshopify.com` host are
  blocked** by the environment's network policy (the proxy returns 403 on
  CONNECT). So: the rendered site cannot be viewed, and **product photos cannot
  be seen**. Colours must come from alt text, supplier descriptions, or user
  screenshots. A session inherits its network policy at startup — changing the
  policy needs a *new* session, it cannot be reloaded into a running one.
- **Publishing a theme is blocked** by the Shopify connector's safety policy, as
  is deleting one. Upload, then ask the user to publish in Online Store → Themes.
- **Writes to the live (MAIN) theme are blocked.** Ship a new version instead of
  patching the live one — this is why versions are numbered.
- Verify layout changes by copying `theme/assets/styles.css` into a local HTML
  harness and driving it with Playwright (Chromium is at `/opt/pw-browsers/chromium`;
  never run `playwright install`). Serve over `python3 -m http.server`, not `file://`.

## Working notes

- Store is real and takes real orders. Prices, publishing and anything
  customer-visible are the owner's call — confirm before changing them. A
  product priced `0.00` must not be published.
- **Never list counterfeit goods.** A branded replica was proposed and declined:
  a trademark complaint terminates the Shopify store and the payment account,
  including the legitimate products. Unbranded versions of the same silhouette
  are fine.
- The charm range skews "creepy-cute" (The Scrapper) while the bags read quiet
  and grown-up. That tension is known and deliberate — charms are merchandised
  as add-ons rather than given equal billing on the homepage.
- `.mcp.json` references a `21st` MCP server needing `API_KEY_21ST`; it is
  unauthorised in most sessions and nothing depends on it.
- `.github/workflows/deploy-pages.yml` deploys the **old static site** to GitHub
  Pages. It is unrelated to the live Shopify storefront.

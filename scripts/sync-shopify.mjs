#!/usr/bin/env node
/**
 * Sync the Nivelle catalog from Shopify into js/products-data.js
 *
 *   SHOPIFY_STORE_DOMAIN=nivellestore.myshopify.com \
 *   SHOPIFY_ADMIN_TOKEN=shpat_xxx \
 *   node scripts/sync-shopify.mjs
 *
 * The token needs read_products only. It is never written into the repo —
 * the script only emits product data that is already public on the storefront.
 *
 * Offline mode, for regenerating from a saved Admin API response:
 *   node scripts/sync-shopify.mjs --from-json response.json
 */

import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'js', 'products-data.js');
const API_VERSION = '2025-07';

const QUERY = `
query Catalog($first: Int!, $after: String) {
  products(first: $first, after: $after, sortKey: CREATED_AT, query: "status:active") {
    pageInfo { hasNextPage endCursor }
    edges {
      node {
        id
        title
        handle
        productType
        descriptionHtml
        onlineStoreUrl
        totalInventory
        options { name values }
        media(first: 12) {
          edges { node { ... on MediaImage { image { url width height altText } } } }
        }
        variants(first: 50) {
          edges {
            node {
              id
              title
              price
              compareAtPrice
              availableForSale
              inventoryQuantity
              selectedOptions { name value }
              image { url }
            }
          }
        }
      }
    }
  }
}`;

/* ------------------------------------------------------------------ */
/* Normalisation — the single definition of the shape the site reads   */
/* ------------------------------------------------------------------ */

const numericId = (gid) => String(gid).split('/').pop();
const stripHtml = (html) =>
  String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function normaliseProduct(node) {
  const images = node.media.edges
    .map((e) => e.node && e.node.image)
    .filter(Boolean)
    .map((img) => ({
      url: img.url,
      width: img.width,
      height: img.height,
      alt: img.altText || '',
    }));

  const variants = node.variants.edges.map(({ node: v }) => {
    const options = {};
    v.selectedOptions.forEach((o) => {
      options[o.name] = o.value;
    });
    return {
      id: numericId(v.id),
      title: v.title,
      price: Number(v.price),
      was: v.compareAtPrice ? Number(v.compareAtPrice) : null,
      /* Shopify reports availableForSale true for oversell-enabled variants,
         so stock level is what the site actually shows. */
      available: v.availableForSale && v.inventoryQuantity > 0,
      inventory: v.inventoryQuantity,
      image: v.image ? v.image.url : images[0] ? images[0].url : null,
      options,
    };
  });

  const prices = variants.map((v) => v.price);
  const comparePrices = variants.map((v) => v.was).filter(Boolean);

  return {
    id: numericId(node.id),
    slug: node.handle,
    name: node.title,
    category: node.productType || 'Bags',
    desc: stripHtml(node.descriptionHtml),
    descHtml: node.descriptionHtml || '',
    price: Math.min(...prices),
    priceMax: Math.max(...prices),
    was: comparePrices.length ? Math.max(...comparePrices) : null,
    available: variants.some((v) => v.available),
    inventory: node.totalInventory,
    storeUrl: node.onlineStoreUrl,
    options: node.options.map((o) => ({ name: o.name, values: o.values })),
    images,
    variants,
  };
}

/* ------------------------------------------------------------------ */
/* File output                                                         */
/* ------------------------------------------------------------------ */

export function renderCatalogFile(products, { domain, currency, syncedAt }) {
  return `/* ==========================================================================
   Nivelle product catalog — GENERATED FILE, DO NOT EDIT BY HAND
   Synced from ${domain} on ${syncedAt}
   Regenerate with: node scripts/sync-shopify.mjs
   ========================================================================== */
window.SHOPIFY_STORE = ${JSON.stringify(
    { domain, currency, syncedAt, cartUrl: `https://${domain}/cart` },
    null,
    2
  )};

window.PRODUCT_CATALOG = ${JSON.stringify(products, null, 2)};
`;
}

/* ------------------------------------------------------------------ */
/* Fetching                                                            */
/* ------------------------------------------------------------------ */

async function fetchAll(domain, token) {
  const edges = [];
  let after = null;
  for (;;) {
    const res = await fetch(`https://${domain}/admin/api/${API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ query: QUERY, variables: { first: 50, after } }),
    });
    if (!res.ok) {
      throw new Error(`Shopify responded ${res.status} ${res.statusText}`);
    }
    const body = await res.json();
    if (body.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(body.errors)}`);
    }
    const page = body.data.products;
    edges.push(...page.edges);
    if (!page.pageInfo.hasNextPage) break;
    after = page.pageInfo.endCursor;
  }
  return edges;
}

async function main() {
  const fromJsonIdx = process.argv.indexOf('--from-json');
  const domain = process.env.SHOPIFY_STORE_DOMAIN || 'nivellestore.myshopify.com';
  const currency = process.env.SHOPIFY_CURRENCY || 'USD';

  let edges;
  if (fromJsonIdx > -1) {
    const raw = JSON.parse(await readFile(process.argv[fromJsonIdx + 1], 'utf8'));
    edges = raw.data.products.edges;
  } else {
    const token = process.env.SHOPIFY_ADMIN_TOKEN;
    if (!token) {
      console.error(
        'Missing SHOPIFY_ADMIN_TOKEN.\n' +
          'Create one in Shopify admin → Settings → Apps and sales channels →\n' +
          'Develop apps → your app → Admin API access token (scope: read_products).'
      );
      process.exit(1);
    }
    edges = await fetchAll(domain, token);
  }

  const products = edges.map((e) => normaliseProduct(e.node));
  const syncedAt = new Date().toISOString().slice(0, 10);
  await writeFile(OUT, renderCatalogFile(products, { domain, currency, syncedAt }), 'utf8');

  const variantCount = products.reduce((n, p) => n + p.variants.length, 0);
  console.log(`Wrote ${products.length} products (${variantCount} variants) to js/products-data.js`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

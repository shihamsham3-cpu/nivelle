/* ==========================================================================
   Nivelle — shop page
   Builds the filter controls and the grid from the synced Shopify catalog.
   ========================================================================== */
(function () {
  'use strict';

  var C = window.NivelleCatalog;
  var grid = document.querySelector('[data-product-grid]');
  if (!C || !grid) return;

  var products = C.products;
  var resultCount = document.querySelector('[data-result-count]');
  var emptyState = document.querySelector('[data-empty-state]');
  var sortSelect = document.querySelector('[data-sort-select]');
  var stockToggle = document.querySelector('[data-filter-stock]');
  var colorWrap = document.querySelector('[data-color-filters]');
  var priceWrap = document.querySelector('[data-price-filters]');

  /* ---- Build the filters from what the store actually sells ---------- */
  var allColors = [];
  products.forEach(function (p) {
    C.colorValues(p).forEach(function (c) {
      if (allColors.indexOf(c) === -1) allColors.push(c);
    });
  });

  if (colorWrap) {
    colorWrap.innerHTML = allColors
      .map(function (c) {
        return (
          '<button type="button" class="filter-swatch" data-filter-color="' +
          C.escapeHtml(c) +
          '" data-active="false" aria-pressed="false" style="background:' +
          C.colorHex(c) +
          '" aria-label="Filter by ' +
          C.escapeHtml(c) +
          '" title="' +
          C.escapeHtml(c) +
          '"></button>'
        );
      })
      .join('');
  }

  var prices = products.map(function (p) {
    return p.price;
  });
  var minPrice = Math.floor(Math.min.apply(null, prices));
  var maxPrice = Math.ceil(Math.max.apply(null, prices));
  var midPrice = Math.round((minPrice + maxPrice) / 2);

  if (priceWrap && minPrice !== maxPrice) {
    priceWrap.innerHTML =
      '<label class="filter-option"><input type="radio" name="price" data-filter-price value="all" checked> All prices</label>' +
      '<label class="filter-option"><input type="radio" name="price" data-filter-price value="0-' +
      midPrice +
      '"> Under $' +
      midPrice +
      '</label>' +
      '<label class="filter-option"><input type="radio" name="price" data-filter-price value="' +
      midPrice +
      '-99999"> $' +
      midPrice +
      ' and up</label>';
  } else if (priceWrap) {
    priceWrap.closest('.filter-group').hidden = true;
  }

  /* ---- Filter state --------------------------------------------------- */
  function activeColors() {
    return Array.prototype.slice
      .call(document.querySelectorAll('[data-filter-color][data-active="true"]'))
      .map(function (b) {
        return b.getAttribute('data-filter-color');
      });
  }

  function activePriceRange() {
    var checked = document.querySelector('[data-filter-price]:checked');
    if (!checked || checked.value === 'all') return null;
    var parts = checked.value.split('-');
    return [Number(parts[0]), Number(parts[1])];
  }

  function matches(product) {
    var colors = activeColors();
    if (colors.length) {
      var productColors = C.colorValues(product);
      var hit = colors.some(function (c) {
        return productColors.indexOf(c) > -1;
      });
      if (!hit) return false;
    }

    var range = activePriceRange();
    if (range && (product.price < range[0] || product.price > range[1])) return false;

    if (stockToggle && stockToggle.checked && !product.available) return false;

    return true;
  }

  function sorted(list) {
    var key = sortSelect ? sortSelect.value : 'featured';
    var out = list.slice();
    if (key === 'price-asc') {
      out.sort(function (a, b) {
        return a.price - b.price;
      });
    } else if (key === 'price-desc') {
      out.sort(function (a, b) {
        return b.price - a.price;
      });
    } else if (key === 'name') {
      out.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
    }
    return out;
  }

  function apply() {
    var visible = sorted(products.filter(matches));
    C.renderGrid(grid, visible);
    if (resultCount) resultCount.textContent = String(visible.length);
    if (emptyState) emptyState.hidden = visible.length > 0;
  }

  /* ---- Wiring ---------------------------------------------------------- */
  document.querySelectorAll('[data-filter-color]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var active = btn.getAttribute('data-active') === 'true';
      btn.setAttribute('data-active', String(!active));
      btn.setAttribute('aria-pressed', String(!active));
      apply();
    });
  });

  document.querySelectorAll('[data-filter-price]').forEach(function (input) {
    input.addEventListener('change', apply);
  });

  stockToggle && stockToggle.addEventListener('change', apply);
  sortSelect && sortSelect.addEventListener('change', apply);

  document.querySelectorAll('[data-filter-clear]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('[data-filter-color]').forEach(function (b) {
        b.setAttribute('data-active', 'false');
        b.setAttribute('aria-pressed', 'false');
      });
      var allPrices = document.querySelector('[data-filter-price][value="all"]');
      if (allPrices) allPrices.checked = true;
      if (stockToggle) stockToggle.checked = false;
      apply();
    });
  });

  apply();
})();

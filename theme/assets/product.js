/* ==========================================================================
   Nivelle — product page
   Option buttons pick a variant; price, availability, the hidden variant id
   and the 3D viewer all follow. No page reload, no guessing: the variant list
   comes from Liquid.
   ========================================================================== */
(function () {
  'use strict';

  var form = document.querySelector('[data-product-form]');
  var json = document.querySelector('[data-product-json]');
  if (!form || !json) return;

  var variants;
  try {
    variants = JSON.parse(json.textContent);
  } catch (err) {
    return;
  }
  if (!variants || !variants.length) return;

  var idField = form.querySelector('[data-variant-id]');
  var priceEl = form.closest('.pd-info').querySelector('[data-price]');
  var compareEl = form.closest('.pd-info').querySelector('[data-compare]');
  var stockEl = form.closest('.pd-info').querySelector('[data-stock]');
  var addButton = form.querySelector('[data-add-button]');
  var addLabel = form.querySelector('[data-add-label]');
  var money = (window.NivelleTheme && window.NivelleTheme.moneyFormat) || '${{amount}}';

  function formatMoney(cents) {
    var amount = (cents / 100).toFixed(2);
    var withCommas = amount.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    /* Handle the money formats Shopify actually emits; fall back to a plain
       currency-prefixed amount rather than rendering a broken template. */
    if (money.indexOf('amount_no_decimals') > -1) {
      return money.replace(/\{\{\s*amount_no_decimals\s*\}\}/, Math.round(cents / 100).toLocaleString('en-US'));
    }
    if (money.indexOf('{{') > -1) {
      return money.replace(/\{\{\s*amount\s*\}\}/, withCommas);
    }
    return '$' + withCommas;
  }

  /* Which option value is selected in each position */
  function selection() {
    var chosen = [];
    form.querySelectorAll('.color-options').forEach(function (group, i) {
      var active = group.querySelector('[data-active="true"]');
      chosen[i] = active ? active.getAttribute('data-option-value') : null;
    });
    return chosen;
  }

  function findVariant(chosen) {
    for (var i = 0; i < variants.length; i++) {
      var v = variants[i];
      var match = true;
      for (var j = 0; j < chosen.length; j++) {
        if (chosen[j] != null && v.options[j] !== chosen[j]) {
          match = false;
          break;
        }
      }
      if (match) return v;
    }
    return null;
  }

  function apply(variant) {
    if (!variant) return;

    if (idField) idField.value = variant.id;
    if (priceEl) priceEl.textContent = formatMoney(variant.price);

    if (compareEl) {
      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        compareEl.textContent = formatMoney(variant.compare_at_price);
        compareEl.hidden = false;
      } else {
        compareEl.hidden = true;
      }
    }

    if (stockEl) {
      if (!variant.available) {
        stockEl.textContent = variant.title + ' is sold out';
        stockEl.hidden = false;
      } else {
        stockEl.hidden = true;
      }
    }

    if (addButton) addButton.disabled = !variant.available;
    if (addLabel) addLabel.textContent = variant.available ? 'Add to bag' : 'Sold out';

    if (variant.featured_media && window.NivelleViewer) {
      window.NivelleViewer.showByMediaId(variant.featured_media.id);
    }

    /* Keep the address bar on the selected variant so the URL can be shared. */
    if (window.history && window.history.replaceState) {
      var url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url);
    }
  }

  form.querySelectorAll('.color-option').forEach(function (button) {
    button.addEventListener('click', function () {
      var index = button.getAttribute('data-option-index');
      var group = button.closest('.color-options');
      group.querySelectorAll('.color-option').forEach(function (other) {
        other.setAttribute('data-active', 'false');
        other.setAttribute('aria-checked', 'false');
      });
      button.setAttribute('data-active', 'true');
      button.setAttribute('aria-checked', 'true');

      var label = form.querySelector('[data-option-label="' + index + '"]');
      if (label) label.textContent = button.getAttribute('data-option-value');

      apply(findVariant(selection()));
    });
  });
})();

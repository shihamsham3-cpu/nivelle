/* ==========================================================================
   Nivelle — product detail page
   Renders from the synced Shopify catalog. The buy button is a Shopify cart
   permalink for the selected variant and quantity, so checkout happens on
   the store.
   ========================================================================== */
(function () {
  'use strict';

  var C = window.NivelleCatalog;
  if (!C || !C.products.length) return;

  var params = new URLSearchParams(window.location.search);
  var slug = params.get('slug');
  var product =
    C.products.filter(function (p) {
      return p.slug === slug;
    })[0] || C.products[0];

  var variants = product.variants;
  var current = C.firstAvailableVariant(product);

  function $(sel) {
    return document.querySelector(sel);
  }
  function setText(sel, text) {
    document.querySelectorAll(sel).forEach(function (el) {
      el.textContent = text;
    });
  }

  /* ---- Head ---------------------------------------------------------- */
  document.title = product.name + ' — Nivelle';
  var metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute(
      'content',
      product.desc ||
        product.name + ' — available in ' + C.colorValues(product).join(', ') + '. ' + C.money(product.price) + ' at Nivelle.'
    );
  }

  var colourways = C.colorValues(product);
  setText('[data-pd-category]', colourways.length + ' colourways');
  setText('[data-pd-breadcrumb-name]', product.name);
  setText('[data-pd-name]', product.name);

  var descEl = $('[data-pd-desc]');
  if (descEl) {
    if (product.descHtml) {
      descEl.innerHTML = product.descHtml;
    } else {
      descEl.textContent =
        product.name + ' in ' + colourways.join(', ') + '. Ships from stock with 30-day returns.';
    }
  }

  var storeLink = $('[data-pd-store-link]');
  if (storeLink && product.storeUrl) storeLink.setAttribute('href', product.storeUrl);

  /* ---- Gallery -------------------------------------------------------- */
  var mainEl = $('[data-pd-main]');
  var thumbsEl = $('[data-pd-thumbs]');

  function imageTag(image, width, eager) {
    return (
      '<img src="' +
      C.imageUrl(image.url, width) +
      '" alt="' +
      C.escapeHtml(image.alt || product.name) +
      '" width="' +
      image.width +
      '" height="' +
      image.height +
      '"' +
      (eager ? '' : ' loading="lazy"') +
      ' decoding="async">'
    );
  }

  function showImage(url) {
    if (!mainEl) return;
    var image =
      product.images.filter(function (i) {
        return i.url === url;
      })[0] || product.images[0];
    if (!image) return;
    mainEl.innerHTML = imageTag(image, 1200, true);
    if (thumbsEl) {
      thumbsEl.querySelectorAll('.pd-thumb').forEach(function (t) {
        t.setAttribute('data-active', String(t.getAttribute('data-image') === image.url));
      });
    }
  }

  if (thumbsEl) {
    thumbsEl.innerHTML = product.images
      .map(function (image, i) {
        return (
          '<button type="button" class="pd-thumb" data-image="' +
          C.escapeHtml(image.url) +
          '" data-active="' +
          (i === 0) +
          '" aria-label="Show image ' +
          (i + 1) +
          ' of ' +
          product.images.length +
          '">' +
          imageTag(image, 200) +
          '</button>'
        );
      })
      .join('');
    thumbsEl.querySelectorAll('.pd-thumb').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showImage(btn.getAttribute('data-image'));
      });
    });
  }

  /* ---- Price, stock, buy link ------------------------------------------ */
  var priceEl = $('[data-pd-price]');
  var stockEl = $('[data-pd-stock]');
  var buyEl = $('[data-pd-add-btn]');
  var qtyInput = $('[data-qty-input]');

  function qty() {
    var n = qtyInput ? parseInt(qtyInput.value, 10) : 1;
    return n > 0 ? n : 1;
  }

  function render() {
    if (priceEl) {
      priceEl.innerHTML =
        '<span>' +
        C.money(current.price) +
        '</span>' +
        (current.was && current.was > current.price
          ? '<span class="was">' + C.money(current.was) + '</span>'
          : '');
    }

    if (stockEl) {
      if (!current.available) {
        stockEl.textContent = current.title + ' is sold out';
        stockEl.hidden = false;
      } else if (current.inventory > 0 && current.inventory <= 25) {
        stockEl.textContent = 'Only ' + current.inventory + ' left in ' + current.title;
        stockEl.hidden = false;
      } else {
        stockEl.hidden = true;
      }
    }

    if (buyEl) {
      var inline = buyEl.querySelector('[data-pd-price-inline]');
      if (current.available) {
        buyEl.setAttribute('href', C.cartUrl(current.id, qty()));
        buyEl.removeAttribute('aria-disabled');
        buyEl.classList.remove('is-disabled');
        buyEl.firstChild.textContent = 'Add to bag — ';
        if (inline) inline.textContent = C.money(current.price * qty());
      } else {
        buyEl.setAttribute('href', product.storeUrl || C.store.cartUrl);
        buyEl.setAttribute('aria-disabled', 'true');
        buyEl.classList.add('is-disabled');
        buyEl.firstChild.textContent = 'Sold out — ';
        if (inline) inline.textContent = 'see other colours';
      }
    }
  }

  if (qtyInput) {
    ['change', 'input', 'click'].forEach(function (evt) {
      qtyInput.addEventListener(evt, render);
    });
    var stepper = qtyInput.closest('.qty-stepper');
    if (stepper) {
      stepper.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () {
          window.setTimeout(render, 0);
        });
      });
    }
  }

  /* ---- Colour options --------------------------------------------------- */
  var colorsEl = $('[data-pd-colors]');
  var colorNameEl = $('[data-pd-color-name]');

  function selectVariant(variant) {
    current = variant;
    if (colorNameEl) colorNameEl.textContent = variant.title;
    if (colorsEl) {
      colorsEl.querySelectorAll('.color-option').forEach(function (b) {
        b.setAttribute('data-active', String(b.getAttribute('data-variant') === variant.id));
      });
    }
    if (variant.image) showImage(variant.image);
    render();
  }

  if (colorsEl) {
    colorsEl.innerHTML = variants
      .map(function (v) {
        return (
          '<button type="button" class="color-option" data-variant="' +
          v.id +
          '" data-active="' +
          (v.id === current.id) +
          '" data-sold-out="' +
          !v.available +
          '" style="background:' +
          C.colorHex(v.title) +
          '" aria-label="' +
          C.escapeHtml(v.title) +
          (v.available ? '' : ' (sold out)') +
          '"></button>'
        );
      })
      .join('');
    colorsEl.querySelectorAll('.color-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var variant = variants.filter(function (v) {
          return v.id === btn.getAttribute('data-variant');
        })[0];
        if (variant) selectVariant(variant);
      });
    });
  }

  selectVariant(current);

  /* ---- Related ----------------------------------------------------------- */
  var relatedEl = $('[data-pd-related]');
  if (relatedEl) {
    var others = C.products.filter(function (p) {
      return p.slug !== product.slug;
    });
    C.renderGrid(relatedEl, others);
  }
})();

(function () {
  'use strict';

  var CATALOG = window.PRODUCT_CATALOG || [];
  if (!CATALOG.length) return;

  var PRODUCT_COLORS = {
    Cognac: '#A9764C',
    Noir: '#1c1917',
    Ivory: '#D8CDBB',
    Emerald: '#2F4C3B',
    Burgundy: '#6B2737',
    Sand: '#C7B299',
    Blush: '#C99C93',
    Chestnut: '#6B4226',
  };

  var BG_TINTS = {
    Cognac: '#F1E9DE',
    Noir: '#E9E6E1',
    Ivory: '#F5F1E9',
    Emerald: '#E7ECE7',
    Burgundy: '#F1E6E5',
    Sand: '#F4EEE3',
    Blush: '#F4E9E5',
    Chestnut: '#EFE6DC',
  };

  function money(n) {
    return '$' + Number(n).toLocaleString('en-US');
  }

  function getSlug() {
    var params = new URLSearchParams(window.location.search);
    return params.get('slug');
  }

  var slug = getSlug();
  var product = CATALOG.filter(function (p) {
    return p.slug === slug;
  })[0];
  var usedFallback = false;
  if (!product) {
    product = CATALOG[0];
    usedFallback = true;
  }

  /* ---- Head / breadcrumb ------------------------------------------- */
  document.title = product.name + ' — Atelier Noir';
  var metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', product.desc);

  setText('[data-pd-category]', product.category);
  setText('[data-pd-breadcrumb-category]', product.category);
  setText('[data-pd-breadcrumb-name]', product.name);
  setText('[data-pd-name]', product.name);
  setText('[data-pd-desc]', product.desc);
  setText('[data-pd-materials]', product.materials);
  setText('[data-pd-dimensions]', product.dimensions);

  function setText(selector, text) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.textContent = text;
    });
  }

  /* ---- Price ---------------------------------------------------------- */
  var priceEl = document.querySelector('[data-pd-price]');
  if (priceEl) {
    priceEl.innerHTML = '';
    var main = document.createElement('span');
    main.textContent = money(product.price);
    priceEl.appendChild(main);
    if (product.was) {
      var was = document.createElement('span');
      was.className = 'was';
      was.textContent = money(product.was);
      priceEl.appendChild(was);
    }
  }
  setText('[data-pd-price-inline]', money(product.price));

  /* ---- Rating ----------------------------------------------------------- */
  var ratingEl = document.querySelector('[data-pd-rating]');
  if (ratingEl) {
    var starsHtml = '';
    for (var i = 0; i < 5; i++) {
      var filled = i < Math.round(product.rating);
      starsHtml +=
        '<svg viewBox="0 0 24 24" width="15" height="15" fill="' +
        (filled ? 'currentColor' : 'none') +
        '" stroke="currentColor" stroke-width="1.6"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7L6 21l1.6-7L2.2 9.3l7.1-.7L12 2Z"/></svg>';
    }
    ratingEl.innerHTML =
      '<span class="stars" aria-hidden="true">' +
      starsHtml +
      '</span><span>' +
      product.rating.toFixed(1) +
      ' &middot; ' +
      product.reviews +
      ' reviews</span>';
  }

  /* ---- Badge -------------------------------------------------------------- */
  var badgeEl = document.querySelector('[data-pd-badge]');
  if (badgeEl) {
    if (product.badge) {
      badgeEl.textContent = product.badge;
      badgeEl.hidden = false;
      badgeEl.classList.toggle('gold', product.badge === 'Sale');
    } else {
      badgeEl.hidden = true;
    }
  }

  /* ---- Gallery ------------------------------------------------------------- */
  var mainEl = document.querySelector('[data-pd-main]');
  var thumbsEl = document.querySelector('[data-pd-thumbs]');
  var THUMB_LABELS = ['Front', 'Side', 'Detail', 'Interior', 'Studio'];

  function renderMain(svgMarkup) {
    if (mainEl) mainEl.innerHTML = svgMarkup;
  }

  if (mainEl) renderMain(product.main);

  if (thumbsEl) {
    thumbsEl.innerHTML = '';
    product.thumbs.forEach(function (svgMarkup, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pd-thumb';
      btn.setAttribute('data-active', idx === 0 ? 'true' : 'false');
      btn.setAttribute('aria-label', 'Show ' + THUMB_LABELS[idx] + ' view of ' + product.name);
      btn.innerHTML = svgMarkup;
      btn.addEventListener('click', function () {
        thumbsEl.querySelectorAll('.pd-thumb').forEach(function (t) {
          t.setAttribute('data-active', 'false');
        });
        btn.setAttribute('data-active', 'true');
        renderMain(svgMarkup);
      });
      thumbsEl.appendChild(btn);
    });
  }

  /* ---- Color options -------------------------------------------------------- */
  var colorsEl = document.querySelector('[data-pd-colors]');
  var colorNameEl = document.querySelector('[data-pd-color-name]');
  var defaultColor = product.colors[0];
  var oldAccent = defaultColor.hex;
  var oldBg = BG_TINTS[defaultColor.name];

  if (colorNameEl) colorNameEl.textContent = defaultColor.name;

  if (colorsEl) {
    colorsEl.innerHTML = '';
    product.colors.forEach(function (c, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'color-option';
      btn.style.background = c.hex;
      btn.setAttribute('data-active', idx === 0 ? 'true' : 'false');
      btn.setAttribute('aria-label', c.name);
      btn.addEventListener('click', function () {
        colorsEl.querySelectorAll('.color-option').forEach(function (b) {
          b.setAttribute('data-active', 'false');
        });
        btn.setAttribute('data-active', 'true');
        if (colorNameEl) colorNameEl.textContent = c.name;

        var newBg = BG_TINTS[c.name];
        var newAccent = c.hex;
        var recolor = function (markup) {
          return markup.split(oldBg).join(newBg).split(oldAccent).join(newAccent);
        };

        renderMain(recolor(product.main));
        if (thumbsEl) {
          var thumbButtons = thumbsEl.querySelectorAll('.pd-thumb');
          thumbButtons.forEach(function (t, i) {
            t.innerHTML = recolor(product.thumbs[i]);
          });
          if (thumbButtons[0]) thumbButtons[0].setAttribute('data-active', 'true');
          for (var j = 1; j < thumbButtons.length; j++) {
            thumbButtons[j].setAttribute('data-active', 'false');
          }
        }
      });
      colorsEl.appendChild(btn);
    });
  }

  /* ---- Add to bag button ------------------------------------------------------ */
  var addBtn = document.querySelector('[data-pd-add-btn]');
  if (addBtn) addBtn.setAttribute('data-add-to-bag', product.name);

  /* ---- Wishlist ------------------------------------------------------------ */
  var wishlistBtn = document.querySelector('[data-pd-wishlist]');
  if (wishlistBtn && window.AtelierNoir) {
    window.AtelierNoir.bindWishlistButton(wishlistBtn);
    wishlistBtn.setAttribute('aria-label', 'Add ' + product.name + ' to wishlist');
  }

  /* ---- Related products ------------------------------------------------------ */
  var relatedEl = document.querySelector('[data-pd-related]');
  if (relatedEl) {
    var startIdx = CATALOG.indexOf(product);
    var related = [];
    for (var k = 1; related.length < 4 && k <= CATALOG.length; k++) {
      var candidate = CATALOG[(startIdx + k) % CATALOG.length];
      if (candidate.slug !== product.slug) related.push(candidate);
    }
    relatedEl.innerHTML = related
      .map(function (p) {
        var priceHtml = '<span>' + money(p.price) + '</span>' + (p.was ? '<span class="was">' + money(p.was) + '</span>' : '');
        return (
          '<article class="product-card">' +
          '<div class="product-media">' +
          '<a href="product.html?slug=' +
          p.slug +
          '" class="product-media-link" aria-label="View ' +
          p.name +
          '">' +
          p.main +
          '</a></div>' +
          '<div class="product-info">' +
          '<span class="product-category">' +
          p.category +
          '</span>' +
          '<h3><a href="product.html?slug=' +
          p.slug +
          '">' +
          p.name +
          '</a></h3>' +
          '<div class="product-price">' +
          priceHtml +
          '</div></div></article>'
        );
      })
      .join('');
  }

  if (usedFallback && slug) {
    console.warn('Atelier Noir: no product found for slug "' + slug + '" — showing ' + product.slug + ' instead.');
  }
})();

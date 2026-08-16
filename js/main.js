(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hoverCapable = window.matchMedia('(hover: hover)').matches;

  /* ------------------------------------------------------------------ */
  /* Footer year                                                        */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function money(n) {
    return '$' + Number(n || 0).toLocaleString('en-US');
  }

  /* ------------------------------------------------------------------ */
  /* Sticky header — shadow after scroll                                */
  /* ------------------------------------------------------------------ */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScrollHeader = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScrollHeader();
    window.addEventListener('scroll', onScrollHeader, { passive: true });
  }

  /* ------------------------------------------------------------------ */
  /* Panel management — mobile nav drawer, cart drawer, search overlay   */
  /* only one may be open at a time, each restores focus on close        */
  /* ------------------------------------------------------------------ */
  var drawer = document.querySelector('.mobile-drawer#mobile-drawer');
  var navToggle = document.querySelector('.nav-toggle');
  var drawerClose = document.querySelector('[data-drawer-close]');
  var lastFocused = null;

  function closeAllPanels(except) {
    if (drawer !== except) closeDrawer();
    if (cartDrawerEl !== except) closeCart();
    if (searchOverlayEl !== except) closeSearch();
  }

  function openDrawer() {
    if (!drawer) return;
    closeAllPanels(drawer);
    lastFocused = document.activeElement;
    drawer.setAttribute('data-open', 'true');
    document.body.style.overflow = 'hidden';
    navToggle && navToggle.setAttribute('aria-expanded', 'true');
    var firstLink = drawer.querySelector('a, button');
    firstLink && firstLink.focus();
  }

  function closeDrawer() {
    if (!drawer || drawer.getAttribute('data-open') !== 'true') return;
    drawer.setAttribute('data-open', 'false');
    document.body.style.overflow = '';
    navToggle && navToggle.setAttribute('aria-expanded', 'false');
    lastFocused && lastFocused.focus();
  }

  navToggle && navToggle.addEventListener('click', openDrawer);
  drawerClose && drawerClose.addEventListener('click', closeDrawer);
  drawer &&
    drawer.querySelector('.drawer-backdrop').addEventListener('click', closeDrawer);
  drawer &&
    drawer.querySelectorAll('nav a').forEach(function (a) {
      a.addEventListener('click', closeDrawer);
    });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closeDrawer();
    closeCart();
    closeSearch();
  });

  /* ------------------------------------------------------------------ */
  /* Scroll reveal (IntersectionObserver)                                */
  /* ------------------------------------------------------------------ */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length) {
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      revealEls.forEach(function (el) {
        el.classList.add('in-view');
      });
    } else {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              var delay = entry.target.getAttribute('data-reveal-delay');
              if (delay) {
                entry.target.style.transitionDelay = delay + 'ms';
              }
              entry.target.classList.add('in-view');
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
      );
      revealEls.forEach(function (el) {
        io.observe(el);
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Back to top                                                         */
  /* ------------------------------------------------------------------ */
  var backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    window.addEventListener(
      'scroll',
      function () {
        backToTop.setAttribute('data-visible', window.scrollY > 640 ? 'true' : 'false');
      },
      { passive: true }
    );
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Toast helper                                                        */
  /* ------------------------------------------------------------------ */
  var toast = document.querySelector('.toast');
  var toastTimer = null;
  function showToast(message) {
    if (!toast) return;
    toast.querySelector('[data-toast-message]').textContent = message;
    toast.setAttribute('data-visible', 'true');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.setAttribute('data-visible', 'false');
    }, 2600);
  }

  /* ------------------------------------------------------------------ */
  /* Cart — persisted line items (demo state, this browser only)         */
  /* ------------------------------------------------------------------ */
  var CART_ITEMS_KEY = 'atelier-noir-cart-items';

  function getCartItems() {
    try {
      var parsed = JSON.parse(window.localStorage.getItem(CART_ITEMS_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function cartSubtotal(items) {
    return (items || getCartItems()).reduce(function (sum, i) {
      return sum + i.price * i.qty;
    }, 0);
  }

  function updateCartBadges(items) {
    var count = items.reduce(function (sum, i) {
      return sum + i.qty;
    }, 0);
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = String(count);
      el.style.display = count > 0 ? 'flex' : 'none';
    });
    document.querySelectorAll('[data-cart-drawer-count]').forEach(function (el) {
      el.textContent = '(' + count + ')';
    });
  }

  var MINUS_SVG =
    '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  var PLUS_SVG =
    '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  var REMOVE_SVG =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>';

  function renderCartDrawer() {
    var items = getCartItems();
    var container = document.querySelector('[data-cart-items]');
    var empty = document.querySelector('[data-cart-empty]');
    var summary = document.querySelector('[data-cart-summary]');
    var subtotalEl = document.querySelector('[data-cart-subtotal]');
    if (!container) return;

    if (!items.length) {
      container.innerHTML = '';
      if (empty) empty.hidden = false;
      if (summary) summary.hidden = true;
      return;
    }
    if (empty) empty.hidden = true;
    if (summary) summary.hidden = false;
    if (subtotalEl) subtotalEl.textContent = money(cartSubtotal(items));

    container.innerHTML = items
      .map(function (item) {
        return (
          '<div class="cart-line" data-line-id="' +
          escapeHtml(item.id) +
          '" data-line-color="' +
          escapeHtml(item.color || '') +
          '">' +
          '<div class="cart-line-media">' +
          (item.image || '') +
          '</div>' +
          '<div class="cart-line-info">' +
          '<h4>' +
          escapeHtml(item.name) +
          '</h4>' +
          (item.color ? '<p class="cart-line-color">' + escapeHtml(item.color) + '</p>' : '') +
          '<div class="cart-line-qty">' +
          '<button type="button" data-cart-dec aria-label="Decrease quantity">' +
          MINUS_SVG +
          '</button>' +
          '<span>' +
          item.qty +
          '</span>' +
          '<button type="button" data-cart-inc aria-label="Increase quantity">' +
          PLUS_SVG +
          '</button>' +
          '</div></div>' +
          '<div class="cart-line-price">' +
          '<span>' +
          money(item.price * item.qty) +
          '</span>' +
          '<button type="button" class="cart-line-remove" data-cart-remove aria-label="Remove ' +
          escapeHtml(item.name) +
          ' from bag">' +
          REMOVE_SVG +
          '</button>' +
          '</div></div>'
        );
      })
      .join('');
  }

  function setCartItems(items) {
    window.localStorage.setItem(CART_ITEMS_KEY, JSON.stringify(items));
    updateCartBadges(items);
    renderCartDrawer();
  }

  function pulseCartIcon() {
    document.querySelectorAll('[data-cart-toggle]').forEach(function (el) {
      el.classList.remove('cart-pulse');
      void el.offsetWidth;
      el.classList.add('cart-pulse');
    });
  }

  function addToCart(item) {
    if (!item || !item.price) return;
    var items = getCartItems();
    var existing = items.filter(function (i) {
      return i.id === item.id && (i.color || '') === (item.color || '');
    })[0];
    if (existing) {
      existing.qty += item.qty || 1;
    } else {
      items.push({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty || 1,
        color: item.color || null,
        image: item.image || '',
      });
    }
    setCartItems(items);
    pulseCartIcon();
  }

  function removeFromCart(id, color) {
    var items = getCartItems().filter(function (i) {
      return !(i.id === id && (i.color || '') === (color || ''));
    });
    setCartItems(items);
  }

  function updateCartQty(id, color, qty) {
    var items = getCartItems();
    var line = items.filter(function (i) {
      return i.id === id && (i.color || '') === (color || '');
    })[0];
    if (!line) return;
    if (qty <= 0) {
      items = items.filter(function (i) {
        return i !== line;
      });
    } else {
      line.qty = Math.min(qty, 99);
    }
    setCartItems(items);
  }

  var cartItemsContainer = document.querySelector('[data-cart-items]');
  if (cartItemsContainer) {
    cartItemsContainer.addEventListener('click', function (e) {
      var line = e.target.closest('.cart-line');
      if (!line) return;
      var id = line.getAttribute('data-line-id');
      var color = line.getAttribute('data-line-color') || null;
      var match = getCartItems().filter(function (i) {
        return i.id === id && (i.color || '') === (color || '');
      })[0];
      if (!match) return;
      if (e.target.closest('[data-cart-inc]')) {
        updateCartQty(id, color, match.qty + 1);
      } else if (e.target.closest('[data-cart-dec]')) {
        updateCartQty(id, color, match.qty - 1);
      } else if (e.target.closest('[data-cart-remove]')) {
        removeFromCart(id, color);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Cart drawer open/close                                              */
  /* ------------------------------------------------------------------ */
  var cartDrawerEl = document.querySelector('#cart-drawer');
  var cartToggleBtns = document.querySelectorAll('[data-cart-toggle]');
  var cartCloseBtns = document.querySelectorAll('[data-cart-close]');
  var cartLastFocused = null;

  function openCart() {
    if (!cartDrawerEl) {
      window.location.href = 'shop.html';
      return;
    }
    closeAllPanels(cartDrawerEl);
    cartLastFocused = document.activeElement;
    cartDrawerEl.setAttribute('data-open', 'true');
    document.body.style.overflow = 'hidden';
    cartToggleBtns.forEach(function (b) {
      b.setAttribute('aria-expanded', 'true');
    });
    var focusTarget = cartDrawerEl.querySelector('.drawer-head .icon-btn');
    focusTarget && focusTarget.focus();
  }

  function closeCart() {
    if (!cartDrawerEl || cartDrawerEl.getAttribute('data-open') !== 'true') return;
    cartDrawerEl.setAttribute('data-open', 'false');
    document.body.style.overflow = '';
    cartToggleBtns.forEach(function (b) {
      b.setAttribute('aria-expanded', 'false');
    });
    cartLastFocused && cartLastFocused.focus();
  }

  cartToggleBtns.forEach(function (b) {
    b.addEventListener('click', openCart);
  });
  cartCloseBtns.forEach(function (b) {
    b.addEventListener('click', closeCart);
  });
  if (cartDrawerEl) {
    var cartBackdrop = cartDrawerEl.querySelector('.drawer-backdrop');
    cartBackdrop && cartBackdrop.addEventListener('click', closeCart);
  }

  renderCartDrawer();
  updateCartBadges(getCartItems());

  /* ------------------------------------------------------------------ */
  /* Search overlay                                                       */
  /* ------------------------------------------------------------------ */
  var searchOverlayEl = document.querySelector('#search-overlay');
  var searchToggleBtns = document.querySelectorAll('[data-search-toggle]');
  var searchCloseBtns = document.querySelectorAll('[data-search-close]');
  var searchInput = document.querySelector('[data-search-input]');
  var searchResultsEl = document.querySelector('[data-search-results]');
  var searchHintEl = document.querySelector('[data-search-hint]');
  var SEARCH_INDEX = window.PRODUCT_SEARCH_INDEX || [];
  var searchLastFocused = null;

  function openSearch() {
    if (!searchOverlayEl) return;
    closeAllPanels(searchOverlayEl);
    searchLastFocused = document.activeElement;
    searchOverlayEl.setAttribute('data-open', 'true');
    document.body.style.overflow = 'hidden';
    searchInput && searchInput.focus();
  }

  function closeSearch() {
    if (!searchOverlayEl || searchOverlayEl.getAttribute('data-open') !== 'true') return;
    searchOverlayEl.setAttribute('data-open', 'false');
    document.body.style.overflow = '';
    if (searchInput) searchInput.value = '';
    if (searchResultsEl) searchResultsEl.innerHTML = '';
    if (searchHintEl) searchHintEl.hidden = false;
    searchLastFocused && searchLastFocused.focus();
  }

  searchToggleBtns.forEach(function (b) {
    b.addEventListener('click', openSearch);
  });
  searchCloseBtns.forEach(function (b) {
    b.addEventListener('click', closeSearch);
  });
  if (searchOverlayEl) {
    var searchBackdrop = searchOverlayEl.querySelector('.drawer-backdrop');
    searchBackdrop && searchBackdrop.addEventListener('click', closeSearch);
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      var q = searchInput.value.trim().toLowerCase();
      if (searchHintEl) searchHintEl.hidden = q.length > 0;
      if (!searchResultsEl) return;
      if (!q) {
        searchResultsEl.innerHTML = '';
        return;
      }
      var matches = SEARCH_INDEX.filter(function (p) {
        return p.name.toLowerCase().indexOf(q) !== -1 || p.category.toLowerCase().indexOf(q) !== -1;
      }).slice(0, 6);
      if (!matches.length) {
        searchResultsEl.innerHTML =
          '<p class="search-empty">No handbags found for &ldquo;' + escapeHtml(searchInput.value) + '&rdquo;.</p>';
        return;
      }
      searchResultsEl.innerHTML = matches
        .map(function (p) {
          var priceHtml = money(p.price) + (p.was ? ' <span class="was">' + money(p.was) + '</span>' : '');
          return (
            '<a class="search-result" href="product.html?slug=' +
            encodeURIComponent(p.slug) +
            '">' +
            '<span class="search-result-name">' +
            escapeHtml(p.name) +
            (p.badge ? '<span class="search-result-badge">' + escapeHtml(p.badge) + '</span>' : '') +
            '</span>' +
            '<span class="search-result-meta">' +
            escapeHtml(p.category) +
            ' &middot; ' +
            priceHtml +
            '</span></a>'
          );
        })
        .join('');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Add to bag buttons (product cards + PDP)                            */
  /* ------------------------------------------------------------------ */
  function collectItemFromButton(btn) {
    var name = btn.getAttribute('data-add-to-bag') || 'Item';

    if (btn.hasAttribute('data-pd-add-btn')) {
      var price = parseFloat(btn.getAttribute('data-price')) || 0;
      var slug = btn.getAttribute('data-slug') || name;
      var colorEl = document.querySelector('[data-pd-color-name]');
      var color = colorEl ? colorEl.textContent.trim() : null;
      var mainSvg = document.querySelector('[data-pd-main] svg');
      var image = mainSvg ? mainSvg.outerHTML : '';
      var qtyField = document.querySelector('[data-qty-input]');
      var qty = qtyField ? parseInt(qtyField.value, 10) || 1 : 1;
      return { id: slug, name: name, price: price, color: color, image: image, qty: qty };
    }

    var card = btn.closest('.product-card');
    var cardPrice = card ? parseFloat(card.getAttribute('data-price')) : 0;
    var cardColor = card ? card.getAttribute('data-color') : null;
    var link = card ? card.querySelector('.product-media-link') : null;
    var cardSlug = name;
    if (link) {
      var href = link.getAttribute('href') || '';
      var m = href.match(/slug=([^&]*)/);
      if (m) cardSlug = decodeURIComponent(m[1]);
    }
    var cardSvg = card ? card.querySelector('.product-media-link svg') : null;
    var cardImage = cardSvg ? cardSvg.outerHTML : '';
    return { id: cardSlug, name: name, price: cardPrice, color: cardColor, image: cardImage, qty: 1 };
  }

  document.querySelectorAll('[data-add-to-bag]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = collectItemFromButton(btn);
      if (!item.price) return;
      addToCart(item);
      showToast(item.name + ' added to your bag');
      openCart();
    });
  });

  /* ------------------------------------------------------------------ */
  /* Wishlist toggle                                                     */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll('.product-wishlist').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var pressed = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!pressed));
    });
  });

  /* ------------------------------------------------------------------ */
  /* Quantity stepper                                                     */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll('.qty-stepper').forEach(function (stepper) {
    var input = stepper.querySelector('[data-qty-input]');
    var dec = stepper.querySelector('[data-qty-dec]');
    var inc = stepper.querySelector('[data-qty-inc]');
    if (!input) return;
    function clamp(val) {
      var min = parseInt(input.min, 10) || 1;
      var max = parseInt(input.max, 10) || 10;
      return Math.min(max, Math.max(min, val));
    }
    dec &&
      dec.addEventListener('click', function () {
        input.value = clamp((parseInt(input.value, 10) || 1) - 1);
      });
    inc &&
      inc.addEventListener('click', function () {
        input.value = clamp((parseInt(input.value, 10) || 1) + 1);
      });
    input.addEventListener('change', function () {
      input.value = clamp(parseInt(input.value, 10) || 1);
    });
  });

  /* ------------------------------------------------------------------ */
  /* Color / swatch option selection                                     */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll('.color-options, .filter-swatches').forEach(function (group) {
    var options = group.querySelectorAll('[data-active]');
    options.forEach(function (opt) {
      opt.addEventListener('click', function () {
        options.forEach(function (o) {
          o.setAttribute('data-active', 'false');
        });
        opt.setAttribute('data-active', 'true');
      });
    });
  });

  /* ------------------------------------------------------------------ */
  /* PDP thumbnail gallery                                               */
  /* ------------------------------------------------------------------ */
  var pdMain = document.querySelector('[data-pd-main]');
  document.querySelectorAll('.pd-thumb').forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      document.querySelectorAll('.pd-thumb').forEach(function (t) {
        t.setAttribute('data-active', 'false');
      });
      thumb.setAttribute('data-active', 'true');
      if (pdMain) {
        var svgMarkup = thumb.querySelector('svg');
        if (svgMarkup) {
          pdMain.innerHTML = svgMarkup.outerHTML;
        }
      }
    });
  });

  /* ------------------------------------------------------------------ */
  /* Accordion (product detail: shipping / materials / care)             */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll('.accordion-item').forEach(function (item) {
    var trigger = item.querySelector('.accordion-trigger');
    trigger &&
      trigger.addEventListener('click', function () {
        var isOpen = item.getAttribute('data-open') === 'true';
        item.parentElement.querySelectorAll('.accordion-item').forEach(function (i) {
          i.setAttribute('data-open', 'false');
          var t = i.querySelector('.accordion-trigger');
          t && t.setAttribute('aria-expanded', 'false');
        });
        item.setAttribute('data-open', String(!isOpen));
        trigger.setAttribute('aria-expanded', String(!isOpen));
      });
  });

  /* ------------------------------------------------------------------ */
  /* Newsletter form                                                      */
  /* ------------------------------------------------------------------ */
  var newsletterForm = document.querySelector('[data-newsletter-form]');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = newsletterForm.querySelector('input[type="email"]');
      if (!input || !input.checkValidity()) {
        input && input.reportValidity();
        return;
      }
      var success = newsletterForm.parentElement.querySelector('.form-success');
      newsletterForm.querySelector('.field-group').style.display = 'none';
      newsletterForm.querySelector('button[type="submit"]').style.display = 'none';
      success && success.setAttribute('data-visible', 'true');
      input.value = '';
    });
  }

  /* ------------------------------------------------------------------ */
  /* Contact form validation                                             */
  /* ------------------------------------------------------------------ */
  var contactForm = document.querySelector('[data-contact-form]');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;
      contactForm.querySelectorAll('[required]').forEach(function (field) {
        var wrapper = field.closest('.form-field');
        if (!field.checkValidity()) {
          valid = false;
          wrapper && wrapper.classList.add('has-error');
        } else {
          wrapper && wrapper.classList.remove('has-error');
        }
      });
      if (!valid) {
        var firstError = contactForm.querySelector('.has-error input, .has-error textarea, .has-error select');
        firstError && firstError.focus();
        return;
      }
      var successPanel = document.querySelector('[data-contact-success]');
      contactForm.hidden = true;
      if (successPanel) {
        successPanel.hidden = false;
        successPanel.focus();
      }
    });

    contactForm.querySelectorAll('input, textarea, select').forEach(function (field) {
      field.addEventListener('input', function () {
        var wrapper = field.closest('.form-field');
        if (field.checkValidity()) {
          wrapper && wrapper.classList.remove('has-error');
        }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Filter panel toggle (mobile shop page)                              */
  /* ------------------------------------------------------------------ */
  var filterToggle = document.querySelector('[data-filter-toggle]');
  var filterPanel = document.querySelector('[data-filter-panel]');
  if (filterToggle && filterPanel) {
    filterToggle.addEventListener('click', function () {
      var isOpen = filterPanel.getAttribute('data-open') === 'true';
      filterPanel.setAttribute('data-open', String(!isOpen));
      filterToggle.setAttribute('aria-expanded', String(!isOpen));
    });
  }

  /* ------------------------------------------------------------------ */
  /* Magnetic buttons — subtle cursor-follow on primary CTAs             */
  /* ------------------------------------------------------------------ */
  if (!prefersReducedMotion && hoverCapable) {
    document.querySelectorAll('[data-magnetic]').forEach(function (btn) {
      var strength = 14;
      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = 'translate(' + (x / rect.width) * strength + 'px, ' + (y / rect.height) * strength + 'px)';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.transform = '';
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Hero parallax — cursor-driven drift on the hero illustration        */
  /* ------------------------------------------------------------------ */
  var heroSection = document.querySelector('.hero');
  var heroGlow = document.querySelector('.hero-glow');
  var heroSilhouette = document.querySelector('.hero-silhouette');
  if (heroSection && !prefersReducedMotion && hoverCapable) {
    heroSection.addEventListener('mousemove', function (e) {
      var rect = heroSection.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      if (heroSilhouette) heroSilhouette.style.transform = 'translate(' + x * -16 + 'px, ' + y * -12 + 'px)';
      if (heroGlow) heroGlow.style.transform = 'translate(' + x * 24 + 'px, ' + y * 18 + 'px)';
    });
    heroSection.addEventListener('mouseleave', function () {
      if (heroSilhouette) heroSilhouette.style.transform = '';
      if (heroGlow) heroGlow.style.transform = '';
    });
  }

  /* ------------------------------------------------------------------ */
  /* Shared helpers exposed for shop.js / pdp.js / checkout.js           */
  /* ------------------------------------------------------------------ */
  window.AtelierNoir = {
    showToast: showToast,
    getCartItems: getCartItems,
    setCartItems: setCartItems,
    cartSubtotal: cartSubtotal,
    updateCartQty: updateCartQty,
    removeFromCart: removeFromCart,
    money: money,
    escapeHtml: escapeHtml,
    bindWishlistButton: function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var pressed = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', String(!pressed));
      });
    },
  };
})();

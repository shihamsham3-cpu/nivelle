/* ==========================================================================
   Nivelle — cart
   Adds to the real Shopify cart without a page load and re-renders the drawer
   server-side through the Section Rendering API, so every price stays
   Liquid-formatted rather than being re-formatted in JavaScript.
   ========================================================================== */
(function () {
  'use strict';

  var T = window.NivelleTheme || {};
  var DRAWER_SECTION = 'cart-drawer';

  function drawer() {
    return document.querySelector('[data-cart-drawer]');
  }

  function openDrawer() {
    var el = drawer();
    if (!el) return;
    el.setAttribute('data-open', 'true');
    document.body.style.overflow = 'hidden';
    var close = el.querySelector('[data-cart-close]');
    close && close.focus();
  }

  function closeDrawer() {
    var el = drawer();
    if (!el) return;
    el.setAttribute('data-open', 'false');
    document.body.style.overflow = '';
  }

  function swapDrawer(html) {
    var el = drawer();
    if (!el || !html) return;
    var parsed = new DOMParser().parseFromString(html, 'text/html');
    var fresh = parsed.querySelector('[data-cart-drawer]');
    if (!fresh) return;
    var wasOpen = el.getAttribute('data-open') === 'true';
    el.innerHTML = fresh.innerHTML;
    el.setAttribute('data-open', wasOpen ? 'true' : 'false');
    bindDrawer();
    syncCount(parsed);
  }

  function syncCount(doc) {
    var source = (doc || document).querySelector('[data-cart-count]');
    var count = source ? source.textContent.trim() : null;
    if (count === null) return;
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = count;
      el.hidden = count === '0';
    });
  }

  function post(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.description || data.message || 'Cart error');
        return data;
      });
    });
  }

  /* ---- Add to cart ---------------------------------------------------- */
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-add-to-cart-form]');
    if (!form) return;
    e.preventDefault();

    var button = form.querySelector('[type="submit"]');
    var error = form.querySelector('[data-cart-error]');
    var data = new FormData(form);
    if (button) {
      button.setAttribute('data-loading', 'true');
      button.disabled = true;
    }
    if (error) error.hidden = true;

    post(T.cartAddUrl || '/cart/add.js', {
      items: [{ id: Number(data.get('id')), quantity: Number(data.get('quantity') || 1) }],
      sections: [DRAWER_SECTION],
    })
      .then(function (result) {
        if (result.sections && result.sections[DRAWER_SECTION]) {
          swapDrawer(result.sections[DRAWER_SECTION]);
        }
        openDrawer();
      })
      .catch(function (err) {
        if (error) {
          error.textContent = err.message;
          error.hidden = false;
        }
      })
      .finally(function () {
        if (button) {
          button.removeAttribute('data-loading');
          button.disabled = false;
        }
      });
  });

  /* ---- Drawer controls ------------------------------------------------ */
  function bindDrawer() {
    var el = drawer();
    if (!el) return;

    el.querySelectorAll('[data-cart-close], [data-cart-backdrop]').forEach(function (node) {
      node.addEventListener('click', closeDrawer);
    });

    el.querySelectorAll('[data-cart-change]').forEach(function (node) {
      node.addEventListener('click', function () {
        var line = node.getAttribute('data-line');
        var quantity = Number(node.getAttribute('data-cart-change'));
        post(T.cartChangeUrl || '/cart/change.js', {
          line: Number(line),
          quantity: quantity,
          sections: [DRAWER_SECTION],
        }).then(function (result) {
          if (result.sections && result.sections[DRAWER_SECTION]) {
            swapDrawer(result.sections[DRAWER_SECTION]);
          }
        });
      });
    });
  }

  document.addEventListener('keydown', function (e) {
    var el = drawer();
    if (e.key === 'Escape' && el && el.getAttribute('data-open') === 'true') closeDrawer();
  });

  /* The bag icon opens the drawer rather than navigating to /cart. */
  document.querySelectorAll('[data-cart-toggle]').forEach(function (node) {
    node.addEventListener('click', function (e) {
      if (!drawer()) return;
      e.preventDefault();
      openDrawer();
    });
  });

  bindDrawer();
  window.NivelleCart = { open: openDrawer, close: closeDrawer };
})();

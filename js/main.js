(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ */
  /* Footer year                                                        */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

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
  /* Mobile navigation drawer                                           */
  /* ------------------------------------------------------------------ */
  var drawer = document.querySelector('.mobile-drawer');
  var navToggle = document.querySelector('.nav-toggle');
  var drawerClose = document.querySelector('[data-drawer-close]');
  var lastFocused = null;

  function openDrawer() {
    if (!drawer) return;
    lastFocused = document.activeElement;
    drawer.setAttribute('data-open', 'true');
    document.body.style.overflow = 'hidden';
    navToggle && navToggle.setAttribute('aria-expanded', 'true');
    var firstLink = drawer.querySelector('a, button');
    firstLink && firstLink.focus();
  }

  function closeDrawer() {
    if (!drawer) return;
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
    if (e.key === 'Escape' && drawer && drawer.getAttribute('data-open') === 'true') {
      closeDrawer();
    }
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
  /* Cart count (demo state, persisted for this browser only)            */
  /* ------------------------------------------------------------------ */
  var CART_KEY = 'atelier-noir-cart-count';
  function getCartCount() {
    return parseInt(window.localStorage.getItem(CART_KEY) || '0', 10);
  }
  function setCartCount(n) {
    window.localStorage.setItem(CART_KEY, String(n));
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = String(n);
      el.style.display = n > 0 ? 'flex' : 'none';
    });
  }
  setCartCount(getCartCount());

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
  /* Add to bag buttons (product cards + PDP)                            */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll('[data-add-to-bag]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var name = btn.getAttribute('data-add-to-bag') || 'Item';
      var qtyField = document.querySelector('[data-qty-input]');
      var qty = qtyField ? parseInt(qtyField.value, 10) || 1 : 1;
      setCartCount(getCartCount() + qty);
      showToast(name + ' added to your bag');
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
  /* Shared helpers exposed for shop.js / pdp.js                         */
  /* ------------------------------------------------------------------ */
  window.AtelierNoir = {
    showToast: showToast,
    getCartCount: getCartCount,
    setCartCount: setCartCount,
    bindWishlistButton: function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var pressed = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', String(!pressed));
      });
    },
  };
})();

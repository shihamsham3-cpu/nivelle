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
  /* Exposed so client-rendered grids can register their new cards.      */
  /* ------------------------------------------------------------------ */
  var revealObserver = null;
  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var delay = entry.target.getAttribute('data-reveal-delay');
          if (delay) {
            entry.target.style.transitionDelay = delay + 'ms';
          }
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
  }

  function observeReveals(root) {
    var scope = root || document;
    var els = scope.querySelectorAll('[data-reveal]');
    if (!revealObserver) {
      els.forEach(function (el) {
        el.classList.add('in-view');
      });
      return;
    }
    els.forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  observeReveals();

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
      /* No server behind this static site: compose the message in the
         visitor's own mail client rather than pretending to send it. */
      var getField = function (name) {
        var el = contactForm.querySelector('[name="' + name + '"]');
        return el ? el.value.trim() : '';
      };
      var subjectSelect = contactForm.querySelector('[name="subject"]');
      var subjectLabel = subjectSelect
        ? subjectSelect.options[subjectSelect.selectedIndex].text
        : 'Enquiry';
      var order = getField('order');
      var body =
        getField('message') +
        '\n\n---\n' +
        'From: ' + getField('name') + ' <' + getField('email') + '>' +
        (order ? '\nOrder: ' + order : '');

      window.location.href =
        'mailto:shihamsham3@gmail.com' +
        '?subject=' + encodeURIComponent('Nivelle — ' + subjectLabel) +
        '&body=' + encodeURIComponent(body);

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
  /* Shared helpers exposed for catalog.js / shop.js / pdp.js            */
  /* ------------------------------------------------------------------ */
  window.Nivelle = {
    observeReveals: observeReveals,
    prefersReducedMotion: prefersReducedMotion,
  };
})();

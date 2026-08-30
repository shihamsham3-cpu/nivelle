/* ==========================================================================
   Atelier Noir — motion layer
   Scroll choreography, animated bag illustrations, and the small pieces of
   state behind the conversion components (counters, edition meter, sticky
   bar, announcement ticker).

   Loads after main.js, which owns the base [data-reveal] observer. Every
   effect here degrades to a static, fully readable page without JS and is
   disabled or flattened under prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var supportsIO = 'IntersectionObserver' in window;

  function onceInView(el, callback, threshold) {
    if (!el) return;
    if (!supportsIO) {
      callback(el);
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          callback(entry.target);
        });
      },
      { threshold: threshold || 0.25, rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);
  }

  /* ------------------------------------------------------------------ */
  /* Hero — stage the headline, CTAs and proof in sequence              */
  /* ------------------------------------------------------------------ */
  var hero = document.querySelector('.hero');
  if (hero) {
    requestAnimationFrame(function () {
      hero.classList.add('is-ready');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Auto-stagger — grids reveal item by item instead of as one block   */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll('[data-stagger]').forEach(function (group) {
    var step = parseInt(group.getAttribute('data-stagger'), 10) || 80;
    var items = group.querySelectorAll(':scope > [data-reveal]');
    items.forEach(function (item, i) {
      if (!item.hasAttribute('data-reveal-delay')) {
        item.setAttribute('data-reveal-delay', String(Math.min(i * step, 600)));
      }
    });
  });

  /* ------------------------------------------------------------------ */
  /* Bag illustrations — draw the leather line by line, then fade fills */
  /* ------------------------------------------------------------------ */
  var DRAW_TARGETS = '.hero-silhouette, .product-media svg, .spotlight-media svg, .gallery-item svg, .pd-gallery-main svg';

  function prepareDrawing(svg) {
    var strokes = [];
    svg.querySelectorAll('path, line, circle, polyline, polygon').forEach(function (el) {
      if (el.getAttribute('stroke') === 'none') return;
      if (el.getAttribute('stroke-dasharray')) {
        /* Decorative dashed stitching — fade it in rather than redrawing it. */
        el.style.opacity = '0';
        el.style.transition = 'opacity 600ms var(--ease-out) 520ms';
        strokes.push({ el: el, dashed: true });
        return;
      }
      var length;
      try {
        length = el.getTotalLength();
      } catch (err) {
        return;
      }
      if (!length || length > 8000) return;
      el.style.strokeDasharray = length + ' ' + length;
      el.style.strokeDashoffset = String(length);
      strokes.push({ el: el, dashed: false, length: length });
    });
    return strokes;
  }

  function initBagDrawing() {
    if (reduceMotion) return;
    document.querySelectorAll(DRAW_TARGETS).forEach(function (svg) {
      if (svg.classList.contains('bag-draw')) return;
      svg.classList.add('bag-draw');
      var strokes = prepareDrawing(svg);
      if (!strokes.length) {
        svg.classList.add('is-drawn');
        return;
      }
      onceInView(
        svg,
        function () {
          svg.classList.add('is-drawn');
          strokes.forEach(function (stroke, i) {
            var delay = Math.min(i * 90, 500);
            stroke.el.style.transitionDelay = delay + 'ms';
            if (stroke.dashed) {
              stroke.el.style.opacity = '1';
            } else {
              stroke.el.style.strokeDashoffset = '0';
            }
          });
        },
        0.2
      );
    });
  }

  initBagDrawing();
  /* Catch illustrations rendered by a later script (the product detail page
     builds its gallery from the catalog after this file runs). */
  window.addEventListener('load', initBagDrawing);

  /* ------------------------------------------------------------------ */
  /* Stat counters — numbers climb once the strip is on screen          */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll('[data-count-to]').forEach(function (el) {
    var target = parseFloat(el.getAttribute('data-count-to'));
    if (isNaN(target)) return;
    var decimals = parseInt(el.getAttribute('data-count-decimals'), 10) || 0;
    var suffix = el.getAttribute('data-count-suffix') || '';
    var finalText = target.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix;

    if (reduceMotion) {
      el.textContent = finalText;
      return;
    }

    el.textContent = (0).toFixed(decimals) + suffix;
    onceInView(
      el,
      function () {
        var duration = 1500;
        var start = null;
        function tick(now) {
          if (start === null) start = now;
          var progress = Math.min((now - start) / duration, 1);
          /* ease-out cubic: fast start, settled landing */
          var eased = 1 - Math.pow(1 - progress, 3);
          var value = target * eased;
          el.textContent =
            value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix;
          if (progress < 1) {
            requestAnimationFrame(tick);
          } else {
            el.textContent = finalText;
          }
        }
        requestAnimationFrame(tick);
      },
      0.4
    );
  });

  /* ------------------------------------------------------------------ */
  /* Limited-edition meter                                              */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll('[data-meter]').forEach(function (meter) {
    var fill = meter.querySelector('.fill');
    var pct = Math.max(0, Math.min(100, parseFloat(meter.getAttribute('data-meter')) || 0));
    if (!fill) return;
    if (reduceMotion) {
      fill.style.width = pct + '%';
      return;
    }
    onceInView(
      meter,
      function () {
        fill.style.width = pct + '%';
      },
      0.5
    );
  });

  /* ------------------------------------------------------------------ */
  /* Announcement ticker                                                */
  /* ------------------------------------------------------------------ */
  var rotator = document.querySelector('[data-rotator]');
  if (rotator) {
    var messages = rotator.querySelectorAll('li');
    if (messages.length > 1) {
      var current = 0;
      var interval = reduceMotion ? 7000 : 4200;
      setInterval(function () {
        if (document.hidden) return;
        messages[current].setAttribute('data-active', 'false');
        current = (current + 1) % messages.length;
        messages[current].setAttribute('data-active', 'true');
      }, interval);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Pointer tilt on product imagery (fine pointers only)               */
  /* ------------------------------------------------------------------ */
  if (canHover && !reduceMotion) {
    document.querySelectorAll('.product-media').forEach(function (media) {
      var art = media.querySelector('svg');
      if (!art) return;
      media.addEventListener('pointermove', function (e) {
        var rect = media.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width - 0.5;
        var y = (e.clientY - rect.top) / rect.height - 0.5;
        art.style.transform =
          'scale(1.06) translate(' + (-x * 14).toFixed(2) + 'px, ' + (-y * 12 - 6).toFixed(2) + 'px)';
      });
      media.addEventListener('pointerleave', function () {
        art.style.transform = '';
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Scroll-driven layer: progress rail, parallax, sticky CTA           */
  /* ------------------------------------------------------------------ */
  var progressFill = document.querySelector('[data-scroll-progress] span');
  var parallaxLayers = reduceMotion ? [] : Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var stickyCta = document.querySelector('[data-sticky-cta]');
  var stickyStop = document.querySelector('.newsletter');
  var stickyDismissed = false;

  try {
    stickyDismissed = window.sessionStorage.getItem('atelier-noir-cta-dismissed') === '1';
  } catch (err) {
    stickyDismissed = false;
  }

  var dismissBtn = stickyCta && stickyCta.querySelector('[data-sticky-dismiss]');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', function () {
      stickyDismissed = true;
      stickyCta.setAttribute('data-visible', 'false');
      document.body.classList.remove('has-sticky-cta');
      try {
        window.sessionStorage.setItem('atelier-noir-cta-dismissed', '1');
      } catch (err) {
        /* storage unavailable — the bar simply returns next session */
      }
    });
  }

  var ticking = false;

  function updateOnScroll() {
    ticking = false;
    var scrollY = window.pageYOffset;
    var viewport = window.innerHeight;

    if (progressFill) {
      var scrollable = document.documentElement.scrollHeight - viewport;
      var ratio = scrollable > 0 ? Math.min(scrollY / scrollable, 1) : 0;
      progressFill.style.transform = 'scaleX(' + ratio.toFixed(4) + ')';
    }

    parallaxLayers.forEach(function (layer) {
      var factor = parseFloat(layer.getAttribute('data-parallax')) || 0.1;
      var rect = layer.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > viewport + 200) return;
      var offset = (rect.top + rect.height / 2 - viewport / 2) * -factor;
      layer.style.transform = 'translate3d(0, ' + offset.toFixed(1) + 'px, 0)';
    });

    if (stickyCta && !stickyDismissed) {
      var pastHero = scrollY > (hero ? hero.offsetHeight * 0.85 : 600);
      var beforeStop = stickyStop ? scrollY + viewport < stickyStop.offsetTop + 160 : true;
      var show = pastHero && beforeStop;
      stickyCta.setAttribute('data-visible', show ? 'true' : 'false');
      document.body.classList.toggle('has-sticky-cta', show);
    }
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateOnScroll);
  }

  if (progressFill || parallaxLayers.length || stickyCta) {
    updateOnScroll();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
  }
})();

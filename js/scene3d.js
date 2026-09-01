/* ==========================================================================
   Nivelle — 3D interaction layer

   The store has no 3D models (every media item in Shopify is a flat photo),
   so depth here is real CSS 3D applied to real product photography: layered
   Z planes, perspective, pointer-driven rotation and a drag-to-inspect
   viewer. Everything degrades to a static, readable page without JS and is
   switched off under prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var C = window.NivelleCatalog;

  /* Frame-synced value that eases towards a target, so pointer motion feels
     weighted instead of snapping. */
  function Smoothed(value, ease) {
    this.current = value;
    this.target = value;
    this.ease = ease || 0.08;
  }
  Smoothed.prototype.step = function () {
    this.current += (this.target - this.current) * this.ease;
    return this.current;
  };

  var raf = window.requestAnimationFrame.bind(window);

  /* ------------------------------------------------------------------ */
  /* Hero — product photos on separate Z planes                         */
  /* ------------------------------------------------------------------ */
  function initHeroStage() {
    var mount = document.querySelector('[data-hero-stage]');
    if (!mount || !C || !C.products.length) return;

    /* One card per product, ordered so the most colourful sits in front. */
    var picks = C.products
      .map(function (product) {
        var variant = C.firstAvailableVariant(product);
        return {
          product: product,
          image: (variant && variant.image) || (product.images[0] && product.images[0].url),
        };
      })
      .filter(function (p) {
        return p.image;
      })
      .slice(0, 3);

    if (!picks.length) return;

    /* depth: back → front. Each plane gets its own drift multiplier so the
       parallax reads as separation rather than one sliding sheet. */
    var PLANES = [
      { z: -240, x: -46, y: -16, rot: 17, scale: 0.78, drift: 0.32 },
      { z: -120, x: 46, y: 14, rot: -15, scale: 0.84, drift: 0.6 },
      { z: 60, x: 0, y: 0, rot: 3, scale: 1, drift: 1 },
    ];

    mount.innerHTML = picks
      .map(function (pick, i) {
        var plane = PLANES[PLANES.length - picks.length + i] || PLANES[PLANES.length - 1];
        return (
          '<figure class="stage-card" data-drift="' +
          plane.drift +
          '" style="--z:' +
          plane.z +
          'px; --x:' +
          plane.x +
          '%; --y:' +
          plane.y +
          '%; --rot:' +
          plane.rot +
          'deg; --scale:' +
          plane.scale +
          '">' +
          '<img src="' +
          C.imageUrl(pick.image, 640) +
          '" alt="" loading="eager" decoding="async">' +
          '<figcaption>' +
          C.escapeHtml(pick.product.name) +
          '</figcaption>' +
          '</figure>'
        );
      })
      .join('');

    mount.setAttribute('data-ready', 'true');
    if (reduceMotion) return;

    var cards = Array.prototype.slice.call(mount.querySelectorAll('.stage-card'));
    var px = new Smoothed(0, 0.06);
    var py = new Smoothed(0, 0.06);
    var scrollY = new Smoothed(0, 0.1);
    var idle = 0;
    var pointerActive = false;

    window.addEventListener(
      'pointermove',
      function (e) {
        if (!finePointer) return;
        pointerActive = true;
        px.target = (e.clientX / window.innerWidth - 0.5) * 2;
        py.target = (e.clientY / window.innerHeight - 0.5) * 2;
      },
      { passive: true }
    );

    window.addEventListener(
      'scroll',
      function () {
        scrollY.target = Math.min(window.pageYOffset / (window.innerHeight || 1), 1.2);
      },
      { passive: true }
    );

    function frame() {
      idle += 0.006;
      var x = px.step();
      var y = py.step();
      var s = scrollY.step();

      /* With no pointer (touch, or before first move) the stage breathes on
         its own so it never sits dead still. */
      var ax = pointerActive ? x : Math.sin(idle) * 0.35;
      var ay = pointerActive ? y : Math.cos(idle * 0.8) * 0.25;

      cards.forEach(function (card) {
        var drift = parseFloat(card.getAttribute('data-drift')) || 1;
        var rotY = ax * 13 * drift;
        var rotX = -ay * 9 * drift;
        var shiftX = ax * 26 * drift;
        var shiftY = ay * 18 * drift + s * 90 * drift;
        card.style.transform =
          'translate3d(calc(var(--x) + ' +
          shiftX.toFixed(2) +
          'px), calc(var(--y) + ' +
          shiftY.toFixed(2) +
          'px), var(--z)) rotateY(calc(var(--rot) + ' +
          rotY.toFixed(2) +
          'deg)) rotateX(' +
          rotX.toFixed(2) +
          'deg) scale(var(--scale))';
      });
      raf(frame);
    }
    raf(frame);
  }

  /* ------------------------------------------------------------------ */
  /* Product cards — perspective tilt with a travelling highlight        */
  /* ------------------------------------------------------------------ */
  function initTilt(root) {
    if (reduceMotion || !finePointer) return;
    var scope = root || document;
    scope.querySelectorAll('.product-media').forEach(function (media) {
      if (media.getAttribute('data-tilt') === 'on') return;
      media.setAttribute('data-tilt', 'on');

      var glare = document.createElement('span');
      glare.className = 'tilt-glare';
      glare.setAttribute('aria-hidden', 'true');
      media.appendChild(glare);

      var frameQueued = false;
      var nx = 0;
      var ny = 0;

      function apply() {
        frameQueued = false;
        media.style.transform =
          'perspective(900px) rotateY(' +
          (nx * 9).toFixed(2) +
          'deg) rotateX(' +
          (-ny * 9).toFixed(2) +
          'deg) translateZ(12px)';
        glare.style.transform =
          'translate3d(' + (nx * 55).toFixed(1) + '%, ' + (ny * 55).toFixed(1) + '%, 0)';
        glare.style.opacity = '1';
      }

      media.addEventListener(
        'pointermove',
        function (e) {
          var rect = media.getBoundingClientRect();
          nx = (e.clientX - rect.left) / rect.width - 0.5;
          ny = (e.clientY - rect.top) / rect.height - 0.5;
          if (!frameQueued) {
            frameQueued = true;
            raf(apply);
          }
        },
        { passive: true }
      );

      media.addEventListener('pointerleave', function () {
        media.style.transform = '';
        glare.style.opacity = '';
        glare.style.transform = '';
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Product page — drag to inspect                                      */
  /* Photos are mapped to drag distance, with the frame rotating in 3D   */
  /* as you pull. Not a 360 spin: it steps through the real photographs. */
  /* ------------------------------------------------------------------ */
  function initViewer() {
    var viewer = document.querySelector('[data-viewer]');
    if (!viewer) return;

    var frames = [];
    var index = 0;
    var dragging = false;
    var startX = 0;
    var startIndex = 0;
    var tilt = new Smoothed(0, 0.14);
    var tiltTarget = 0;
    var running = false;

    function render() {
      frames.forEach(function (frame, i) {
        frame.setAttribute('data-active', String(i === index));
      });
      var live = viewer.querySelector('[data-viewer-status]');
      if (live) live.textContent = 'View ' + (index + 1) + ' of ' + frames.length;
      if (typeof window.NivelleViewer.onChange === 'function') {
        window.NivelleViewer.onChange(index);
      }
    }

    function spin() {
      var value = tilt.step();
      viewer.style.setProperty('--tilt', value.toFixed(2) + 'deg');
      if (Math.abs(value - tiltTarget) > 0.05 || dragging) {
        raf(spin);
      } else {
        running = false;
      }
    }

    function nudge(target) {
      tiltTarget = target;
      tilt.target = target;
      if (!running && !reduceMotion) {
        running = true;
        raf(spin);
      }
    }

    function step(delta) {
      if (!frames.length) return;
      index = (index + delta + frames.length) % frames.length;
      render();
    }

    window.NivelleViewer = {
      /* pdp.js hands the viewer its images whenever the product or the
         selected colourway changes. */
      load: function (images, alt) {
        frames = [];
        index = 0;
        viewer.innerHTML =
          '<div class="viewer-stage" data-viewer-stage>' +
          images
            .map(function (image, i) {
              return (
                '<img class="viewer-frame" data-active="' +
                (i === 0) +
                '" src="' +
                C.imageUrl(image.url, 1200) +
                '" alt="' +
                (i === 0 ? C.escapeHtml(alt) : '') +
                '" draggable="false" ' +
                (i === 0 ? '' : 'loading="lazy" ') +
                'decoding="async">'
              );
            })
            .join('') +
          '</div>' +
          (images.length > 1
            ? '<div class="viewer-controls">' +
              '<button type="button" class="viewer-arrow" data-viewer-prev aria-label="Previous view">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>' +
              '</button>' +
              '<button type="button" class="viewer-arrow" data-viewer-next aria-label="Next view">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>' +
              '</button>' +
              '</div>' +
              '<p class="viewer-hint" aria-hidden="true">Drag to inspect</p>'
            : '') +
          '<p class="visually-hidden" role="status" data-viewer-status></p>';

        frames = Array.prototype.slice.call(viewer.querySelectorAll('.viewer-frame'));

        var prev = viewer.querySelector('[data-viewer-prev]');
        var next = viewer.querySelector('[data-viewer-next]');
        prev && prev.addEventListener('click', function () { step(-1); });
        next && next.addEventListener('click', function () { step(1); });
        render();
      },
      show: function (i) {
        if (!frames.length) return;
        index = Math.max(0, Math.min(frames.length - 1, i));
        render();
      },
      onChange: null,
    };

    /* Drag / swipe ------------------------------------------------------ */
    viewer.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      dragging = true;
      startX = e.clientX;
      startIndex = index;
      viewer.setPointerCapture(e.pointerId);
      viewer.setAttribute('data-dragging', 'true');
    });

    viewer.addEventListener('pointermove', function (e) {
      if (!dragging || !frames.length) return;
      var dx = e.clientX - startX;
      var span = viewer.clientWidth / Math.max(frames.length, 2);
      var moved = Math.round(-dx / span);
      var next = (startIndex + moved) % frames.length;
      if (next < 0) next += frames.length;
      if (next !== index) {
        index = next;
        render();
      }
      nudge(Math.max(-10, Math.min(10, (dx / viewer.clientWidth) * 26)));
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      viewer.removeAttribute('data-dragging');
      if (e && e.pointerId != null && viewer.hasPointerCapture(e.pointerId)) {
        viewer.releasePointerCapture(e.pointerId);
      }
      nudge(0);
    }
    viewer.addEventListener('pointerup', endDrag);
    viewer.addEventListener('pointercancel', endDrag);

    /* Keyboard ---------------------------------------------------------- */
    viewer.setAttribute('tabindex', '0');
    viewer.setAttribute('role', 'group');
    viewer.setAttribute('aria-label', 'Product views — use arrow keys to change view');
    viewer.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') {
        step(-1);
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        step(1);
        e.preventDefault();
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */
  initHeroStage();
  initViewer();
  initTilt();
  /* Grids render after this file runs on some pages. */
  window.addEventListener('load', function () {
    initTilt();
  });

  window.NivelleScene = { initTilt: initTilt };
})();

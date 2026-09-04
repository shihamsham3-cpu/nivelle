/* ==========================================================================
   Nivelle — 3D interaction layer (Shopify theme)

   The store has no 3D models, so depth is real CSS 3D applied to real product
   photography. Liquid renders the markup; this file only moves it.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var themeMotion = !window.NivelleTheme || window.NivelleTheme.motion !== false;
  var motionOn = themeMotion && !reduceMotion;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var raf = window.requestAnimationFrame.bind(window);

  function Smoothed(value, ease) {
    this.current = value;
    this.target = value;
    this.ease = ease || 0.08;
  }
  Smoothed.prototype.step = function () {
    this.current += (this.target - this.current) * this.ease;
    return this.current;
  };

  /* ------------------------------------------------------------------ */
  /* Hero — photo planes at separate depths                             */
  /* ------------------------------------------------------------------ */
  function initHeroStage() {
    var mount = document.querySelector('[data-hero-stage]');
    if (!mount) return;
    var cards = Array.prototype.slice.call(mount.querySelectorAll('.stage-card'));
    if (!cards.length) return;

    mount.setAttribute('data-ready', 'true');
    if (!motionOn) return;

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
      var ax = pointerActive ? x : Math.sin(idle) * 0.35;
      var ay = pointerActive ? y : Math.cos(idle * 0.8) * 0.25;

      cards.forEach(function (card) {
        var drift = parseFloat(card.getAttribute('data-drift')) || 1;
        card.style.transform =
          'translate3d(calc(var(--x) + ' +
          (ax * 26 * drift).toFixed(2) +
          'px), calc(var(--y) + ' +
          (ay * 18 * drift + s * 90 * drift).toFixed(2) +
          'px), var(--z)) rotateY(calc(var(--rot) + ' +
          (ax * 13 * drift).toFixed(2) +
          'deg)) rotateX(' +
          (-ay * 9 * drift).toFixed(2) +
          'deg) scale(var(--scale))';
      });
      raf(frame);
    }
    raf(frame);
  }

  /* ------------------------------------------------------------------ */
  /* Card tilt with a highlight that tracks the pointer                  */
  /* ------------------------------------------------------------------ */
  function initTilt(root) {
    if (!motionOn || !finePointer) return;
    (root || document).querySelectorAll('.product-media').forEach(function (media) {
      if (media.getAttribute('data-tilt') === 'on') return;
      media.setAttribute('data-tilt', 'on');

      var glare = document.createElement('span');
      glare.className = 'tilt-glare';
      glare.setAttribute('aria-hidden', 'true');
      media.appendChild(glare);

      var queued = false;
      var nx = 0;
      var ny = 0;

      function apply() {
        queued = false;
        media.style.transform =
          'perspective(900px) rotateY(' + (nx * 9).toFixed(2) + 'deg) rotateX(' + (-ny * 9).toFixed(2) + 'deg) translateZ(12px)';
        glare.style.transform = 'translate3d(' + (nx * 55).toFixed(1) + '%, ' + (ny * 55).toFixed(1) + '%, 0)';
        glare.style.opacity = '1';
      }

      media.addEventListener(
        'pointermove',
        function (e) {
          var rect = media.getBoundingClientRect();
          nx = (e.clientX - rect.left) / rect.width - 0.5;
          ny = (e.clientY - rect.top) / rect.height - 0.5;
          if (!queued) {
            queued = true;
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
  /* Product viewer — drag through the photographs Liquid rendered       */
  /* ------------------------------------------------------------------ */
  function initViewer() {
    var viewer = document.querySelector('[data-viewer]');
    if (!viewer) return;

    var frames = Array.prototype.slice.call(viewer.querySelectorAll('.viewer-frame'));
    if (!frames.length) return;

    var index = frames.findIndex(function (f) {
      return f.getAttribute('data-active') === 'true';
    });
    if (index < 0) index = 0;

    var dragging = false;
    var startX = 0;
    var startIndex = 0;
    var tilt = new Smoothed(0, 0.14);
    var tiltTarget = 0;
    var running = false;
    var status = viewer.querySelector('[data-viewer-status]');

    function render() {
      frames.forEach(function (frame, i) {
        frame.setAttribute('data-active', String(i === index));
      });
      if (status) status.textContent = 'View ' + (index + 1) + ' of ' + frames.length;
      if (typeof api.onChange === 'function') api.onChange(index);
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
      if (!running && motionOn) {
        running = true;
        raf(spin);
      }
    }

    function step(delta) {
      index = (index + delta + frames.length) % frames.length;
      render();
    }

    var api = {
      show: function (i) {
        index = Math.max(0, Math.min(frames.length - 1, i));
        render();
      },
      showByMediaId: function (id) {
        for (var i = 0; i < frames.length; i++) {
          if (frames[i].getAttribute('data-media-id') === String(id)) {
            api.show(i);
            return true;
          }
        }
        return false;
      },
      onChange: null,
    };
    window.NivelleViewer = api;

    viewer.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      dragging = true;
      startX = e.clientX;
      startIndex = index;
      viewer.setPointerCapture(e.pointerId);
      viewer.setAttribute('data-dragging', 'true');
    });

    viewer.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var span = viewer.clientWidth / Math.max(frames.length, 2);
      var next = (startIndex + Math.round(-dx / span)) % frames.length;
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

    var prev = viewer.querySelector('[data-viewer-prev]');
    var next = viewer.querySelector('[data-viewer-next]');
    prev && prev.addEventListener('click', function () { step(-1); });
    next && next.addEventListener('click', function () { step(1); });

    viewer.setAttribute('tabindex', '0');
    viewer.setAttribute('role', 'group');
    viewer.setAttribute('aria-label', 'Product views — use arrow keys to change view');
    viewer.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
    });

    /* Thumbnails rendered alongside the viewer */
    document.querySelectorAll('.pd-thumb').forEach(function (thumb, i) {
      thumb.addEventListener('click', function () { api.show(i); });
    });
    api.onChange = function (i) {
      document.querySelectorAll('.pd-thumb').forEach(function (t, ti) {
        t.setAttribute('data-active', String(ti === i));
      });
    };

    render();
  }

  initHeroStage();
  initViewer();
  initTilt();
  window.addEventListener('load', function () { initTilt(); });
  document.addEventListener('nivelle:section-rendered', function () { initTilt(); });

  window.NivelleScene = { initTilt: initTilt };
})();

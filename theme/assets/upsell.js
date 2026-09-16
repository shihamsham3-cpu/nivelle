/* ==========================================================================
   Nivelle — Complete the look
   Colour selection for the accessory cards under a product. The card is a
   real add-to-cart form, so this only moves the selection around; the POST
   and the drawer refresh belong to cart.js.

   Listeners are delegated from the document so cards rendered or replaced
   after load stay live without rebinding.
   ========================================================================== */
(function () {
  'use strict';

  function select(card, swatch) {
    var variantId = swatch.getAttribute('data-variant');
    var mediaId = swatch.getAttribute('data-media');
    var price = swatch.getAttribute('data-price');
    var label = swatch.getAttribute('data-label');
    var available = swatch.getAttribute('data-available') !== 'false';

    var input = card.querySelector('[data-variant-id]');
    if (input && variantId) input.value = variantId;

    var priceEl = card.querySelector('[data-ctl-price]');
    if (priceEl && price) priceEl.textContent = price;

    card.querySelectorAll('[data-ctl-swatch]').forEach(function (node) {
      var on = node === swatch;
      node.setAttribute('data-active', on ? 'true' : 'false');
      node.setAttribute('aria-checked', on ? 'true' : 'false');
    });

    /* Variants without their own image keep whichever frame is showing. */
    if (mediaId) {
      card.querySelectorAll('.ctl-frame').forEach(function (img) {
        var on = img.getAttribute('data-media-id') === mediaId;
        img.setAttribute('data-active', on ? 'true' : 'false');
      });
    }

    var button = card.querySelector('[data-ctl-add]');
    var buttonText = card.querySelector('[data-ctl-add-text]');
    var labelEl = card.querySelector('[data-ctl-label]');
    if (button) button.disabled = !available;
    if (buttonText) buttonText.textContent = available ? 'Add' : 'Sold out';
    if (labelEl) labelEl.textContent = available && label ? label : '';
  }

  document.addEventListener('click', function (e) {
    var swatch = e.target.closest('[data-ctl-swatch]');
    if (!swatch) return;
    var card = swatch.closest('[data-ctl-card]');
    if (card) select(card, swatch);
  });

  /* Arrow keys move through a radiogroup; buttons already handle Enter and Space. */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var swatch = e.target.closest('[data-ctl-swatch]');
    if (!swatch) return;
    var card = swatch.closest('[data-ctl-card]');
    if (!card) return;

    var all = Array.prototype.slice.call(card.querySelectorAll('[data-ctl-swatch]'));
    var index = all.indexOf(swatch);
    if (index === -1) return;
    var step = e.key === 'ArrowRight' ? 1 : -1;
    var next = all[(index + step + all.length) % all.length];
    e.preventDefault();
    next.focus();
    select(card, next);
  });
})();

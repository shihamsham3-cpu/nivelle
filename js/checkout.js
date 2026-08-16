(function () {
  'use strict';

  var AN = window.AtelierNoir;
  if (!AN) return;

  var items = AN.getCartItems();
  var hasItemsSection = document.querySelector('[data-checkout-has-items]');
  var emptySection = document.querySelector('[data-checkout-empty]');
  var successSection = document.querySelector('[data-checkout-success]');

  if (!items.length) {
    if (hasItemsSection) hasItemsSection.hidden = true;
    if (emptySection) emptySection.hidden = false;
    return;
  }

  var SHIPPING_THRESHOLD = 500;
  var FLAT_SHIPPING = 25;
  var TAX_RATE = 0.08;
  var appliedDiscountRate = 0;

  function setText(selector, text) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.textContent = text;
    });
  }

  function renderItems() {
    var container = document.querySelector('[data-checkout-items]');
    if (!container) return;
    container.innerHTML = items
      .map(function (item) {
        return (
          '<div class="checkout-line">' +
          '<div class="checkout-line-media">' +
          (item.image || '') +
          '<span class="checkout-line-qty-badge">' +
          item.qty +
          '</span></div>' +
          '<div class="checkout-line-info">' +
          '<h4>' +
          AN.escapeHtml(item.name) +
          '</h4>' +
          (item.color ? '<p>' + AN.escapeHtml(item.color) + '</p>' : '') +
          '</div>' +
          '<div class="checkout-line-price">' +
          AN.money(item.price * item.qty) +
          '</div></div>'
        );
      })
      .join('');
  }

  function updateTotals() {
    var subtotal = AN.cartSubtotal(items);
    var discount = subtotal * appliedDiscountRate;
    var discountedSubtotal = subtotal - discount;
    var shipping = discountedSubtotal >= SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
    var tax = discountedSubtotal * TAX_RATE;
    var total = discountedSubtotal + shipping + tax;

    setText('[data-checkout-subtotal]', AN.money(subtotal));
    setText('[data-checkout-discount]', '−' + AN.money(discount));
    setText('[data-checkout-shipping]', shipping === 0 ? 'Free' : AN.money(shipping));
    setText('[data-checkout-tax]', AN.money(tax));
    setText('[data-checkout-total]', AN.money(total));
    setText('[data-checkout-submit-total]', AN.money(total));

    var promoRow = document.querySelector('[data-promo-row]');
    if (promoRow) promoRow.hidden = appliedDiscountRate === 0;
  }

  renderItems();
  updateTotals();

  /* ---- Promo code (demo) ------------------------------------------------- */
  var promoForm = document.querySelector('[data-promo-form]');
  var promoMsg = document.querySelector('[data-promo-msg]');
  if (promoForm) {
    promoForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = promoForm.querySelector('[data-promo-input]');
      var code = (input.value || '').trim().toUpperCase();
      if (code === 'WELCOME10') {
        appliedDiscountRate = 0.1;
        if (promoMsg) {
          promoMsg.textContent = '“WELCOME10” applied — 10% off your order.';
          promoMsg.hidden = false;
          promoMsg.classList.remove('is-error');
        }
      } else {
        appliedDiscountRate = 0;
        if (promoMsg) {
          promoMsg.textContent = code ? 'That code is not valid.' : 'Enter a discount code first.';
          promoMsg.hidden = false;
          promoMsg.classList.add('is-error');
        }
      }
      updateTotals();
    });
  }

  /* ---- Card field formatting ---------------------------------------------- */
  var cardNumberInput = document.querySelector('[data-card-number]');
  if (cardNumberInput) {
    cardNumberInput.addEventListener('input', function () {
      var digits = cardNumberInput.value.replace(/\D/g, '').slice(0, 16);
      cardNumberInput.value = digits.replace(/(.{4})/g, '$1 ').trim();
    });
  }
  var cardExpiryInput = document.querySelector('[data-card-expiry]');
  if (cardExpiryInput) {
    cardExpiryInput.addEventListener('input', function () {
      var digits = cardExpiryInput.value.replace(/\D/g, '').slice(0, 4);
      if (digits.length > 2) digits = digits.slice(0, 2) + ' / ' + digits.slice(2);
      cardExpiryInput.value = digits;
    });
  }

  /* ---- Submit / place order (demo) ----------------------------------------- */
  var form = document.querySelector('[data-checkout-form]');
  var submitBtn = document.querySelector('[data-checkout-submit]');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;
      form.querySelectorAll('[required]').forEach(function (field) {
        var wrapper = field.closest('.form-field');
        if (!field.checkValidity()) {
          valid = false;
          wrapper && wrapper.classList.add('has-error');
        } else {
          wrapper && wrapper.classList.remove('has-error');
        }
      });
      if (!valid) {
        var firstError = form.querySelector('.has-error input, .has-error select');
        firstError && firstError.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        var label = submitBtn.querySelector('[data-checkout-submit-label]');
        if (label) label.textContent = 'Processing…';
      }

      window.setTimeout(function () {
        var email = document.getElementById('co-email').value;
        var firstName = document.getElementById('co-first').value;
        var orderNumber = 'AN-' + Math.floor(100000 + Math.random() * 900000);

        setText('[data-checkout-success-name]', firstName || 'Friend');
        setText('[data-checkout-success-email]', email);
        setText('[data-checkout-order-number]', orderNumber);

        AN.setCartItems([]);

        if (hasItemsSection) hasItemsSection.hidden = true;
        if (successSection) {
          successSection.hidden = false;
          successSection.focus();
        }
      }, 900);
    });

    form.querySelectorAll('input, select').forEach(function (field) {
      field.addEventListener('input', function () {
        var wrapper = field.closest('.form-field');
        if (field.checkValidity()) wrapper && wrapper.classList.remove('has-error');
      });
    });
  }
})();

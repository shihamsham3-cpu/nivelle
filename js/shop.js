(function () {
  'use strict';

  var grid = document.querySelector('[data-product-grid]');
  if (!grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.product-card'));
  var originalOrder = cards.slice();
  var resultCount = document.querySelector('[data-result-count]');
  var emptyState = document.querySelector('[data-empty-state]');
  var categoryInputs = document.querySelectorAll('[data-filter-category]');
  var colorSwatches = document.querySelectorAll('[data-filter-color]');
  var priceInputs = document.querySelectorAll('[data-filter-price]');
  var sortSelect = document.querySelector('[data-sort-select]');
  var clearButtons = document.querySelectorAll('[data-filter-clear]');

  function activeCategories() {
    return Array.prototype.filter
      .call(categoryInputs, function (i) {
        return i.checked;
      })
      .map(function (i) {
        return i.value;
      });
  }

  function activeColors() {
    return Array.prototype.filter
      .call(colorSwatches, function (b) {
        return b.getAttribute('data-active') === 'true';
      })
      .map(function (b) {
        return b.getAttribute('data-filter-color');
      });
  }

  function activePriceRange() {
    var checked = Array.prototype.filter.call(priceInputs, function (i) {
      return i.checked;
    })[0];
    if (!checked) return null;
    var parts = checked.value.split('-').map(Number);
    return { min: parts[0], max: parts[1] };
  }

  function applyFilters() {
    var cats = activeCategories();
    var colors = activeColors();
    var price = activePriceRange();
    var visible = 0;

    cards.forEach(function (card) {
      var matchCat = cats.length === 0 || cats.indexOf(card.getAttribute('data-category')) !== -1;
      var matchColor = colors.length === 0 || colors.indexOf(card.getAttribute('data-color')) !== -1;
      var cardPrice = parseFloat(card.getAttribute('data-price'));
      var matchPrice = !price || (cardPrice >= price.min && cardPrice <= price.max);
      var show = matchCat && matchColor && matchPrice;
      card.style.display = show ? '' : 'none';
      if (show) visible += 1;
    });

    if (resultCount) resultCount.textContent = String(visible);
    if (emptyState) emptyState.hidden = visible !== 0;
  }

  categoryInputs.forEach(function (input) {
    input.addEventListener('change', applyFilters);
  });

  colorSwatches.forEach(function (swatch) {
    swatch.addEventListener('click', function () {
      var isActive = swatch.getAttribute('data-active') === 'true';
      swatch.setAttribute('data-active', String(!isActive));
      swatch.setAttribute('aria-pressed', String(!isActive));
      applyFilters();
    });
  });

  priceInputs.forEach(function (input) {
    input.addEventListener('change', applyFilters);
  });

  clearButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      categoryInputs.forEach(function (i) {
        i.checked = false;
      });
      colorSwatches.forEach(function (s) {
        s.setAttribute('data-active', 'false');
        s.setAttribute('aria-pressed', 'false');
      });
      priceInputs.forEach(function (i) {
        i.checked = false;
      });
      applyFilters();
    });
  });

  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      var value = sortSelect.value;
      var sorted = cards.slice();
      if (value === 'price-asc') {
        sorted.sort(function (a, b) {
          return parseFloat(a.getAttribute('data-price')) - parseFloat(b.getAttribute('data-price'));
        });
      } else if (value === 'price-desc') {
        sorted.sort(function (a, b) {
          return parseFloat(b.getAttribute('data-price')) - parseFloat(a.getAttribute('data-price'));
        });
      } else if (value === 'name-asc') {
        sorted.sort(function (a, b) {
          var nameA = a.querySelector('h3').textContent.trim();
          var nameB = b.querySelector('h3').textContent.trim();
          return nameA.localeCompare(nameB);
        });
      } else {
        sorted = originalOrder.slice();
      }
      sorted.forEach(function (card) {
        grid.appendChild(card);
      });
    });
  }
})();

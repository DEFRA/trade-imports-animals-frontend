import accessibleAutocomplete from 'accessible-autocomplete'

document.addEventListener('DOMContentLoaded', () => {
  document
    .querySelectorAll('select[data-select-autocomplete]')
    .forEach((selectElement) => {
      accessibleAutocomplete.enhanceSelectElement({
        selectElement,
        showAllValues: true
      })
    })
})

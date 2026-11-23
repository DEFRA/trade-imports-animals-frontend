const RADIO_SELECTOR = 'input[type="radio"]'
const PAGING_LINK_SELECTOR = '.govuk-pagination a[href]'

const hrefCarrying = (href, selectedId, baseUrl) => {
  const target = new URL(href, baseUrl)
  target.searchParams.set('selected', selectedId)
  return `${target.pathname}${target.search}${target.hash}`
}

/** Rewrites the picker's paging links to carry the address just ticked. */
class PickerPagingSelection {
  static moduleName = 'app-picker-paging-selection'

  constructor($module) {
    if (!$module) {
      return
    }

    $module.addEventListener('change', ({ target }) => {
      if (!target?.matches?.(RADIO_SELECTOR)) {
        return
      }

      for (const link of $module.querySelectorAll(PAGING_LINK_SELECTOR)) {
        link.setAttribute(
          'href',
          hrefCarrying(
            link.getAttribute('href'),
            target.value,
            $module.ownerDocument.baseURI
          )
        )
      }
    })
  }
}

export default PickerPagingSelection

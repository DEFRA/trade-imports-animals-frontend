import { containsTerm } from '../../common/helpers/search-fold.js'
import { escapeAndBoldMatches } from '../../common/helpers/bold-matches.js'

const rowOf = (searchTextCell) => searchTextCell.closest('tr')

const wordsTargetOf = (cell) => cell.querySelector('.govuk-tag') ?? cell

const wordCellsOf = (row) => [...row.cells].slice(1)

const readRows = ($module) =>
  [...$module.querySelectorAll('[data-search-text]')].map((searchTextCell) => {
    const row = rowOf(searchTextCell)
    return {
      row,
      searchText: searchTextCell.dataset.searchText,
      words: wordCellsOf(row).map((cell) => {
        const target = wordsTargetOf(cell)
        return { target, text: target.textContent }
      })
    }
  })

const boldMatchesInEachCell = ({ words }, term) => {
  for (const { target, text } of words) {
    target.innerHTML = escapeAndBoldMatches(text, term)
  }
}

const showOnlyRowsHolding = (rows, term) => {
  const shown = rows.filter(({ searchText }) => containsTerm(searchText, term))
  for (const entry of rows) {
    entry.row.hidden = !shown.includes(entry)
  }
  return shown
}

class TransporterFilter {
  static moduleName = 'app-transporter-filter'

  constructor($module) {
    const searchBox = $module.querySelector('input[name="search"]')
    const searchButton = $module.querySelector(
      'button[name="action"][value="search"]'
    )
    const table = $module.querySelector('[data-transporter-table]')
    const noMatches = $module.querySelector('[data-transporter-no-matches]')
    const liveRegion = $module.querySelector('[data-transporter-shown]')
    if (!searchBox || !searchButton || !table || !noMatches || !liveRegion) {
      return
    }
    const { shownMessages, noMatches: noMatchesMessage } = $module.dataset
    const messages = JSON.parse(shownMessages)
    const rows = readRows($module)

    const filter = () => {
      const shown = showOnlyRowsHolding(rows, searchBox.value)
      for (const entry of shown) {
        boldMatchesInEachCell(entry, searchBox.value)
      }
      table.hidden = shown.length === 0
      noMatches.hidden = shown.length > 0
      return shown.length
    }
    const filterAndAnnounce = () => {
      const shownCount = filter()
      liveRegion.textContent = shownCount
        ? messages[shownCount - 1]
        : noMatchesMessage
    }

    if (searchBox.value) {
      filter()
    }
    searchBox.addEventListener('input', filterAndAnnounce)
    searchButton.addEventListener('click', (event) => {
      event.preventDefault()
      filterAndAnnounce()
    })
  }
}

export default TransporterFilter

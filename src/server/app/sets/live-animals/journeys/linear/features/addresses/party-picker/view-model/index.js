import { insViewAddressUrl } from '../../../../../../../../../common/helpers/ins-address-book-urls.js'
import { pickerAddressLines } from './address-lines.js'
import { pagination } from './pagination/index.js'
import { resultsHref } from './results-href.js'
import { pickerTableRows } from './table-rows.js'

const resultRows = (found, selectedId, returnPath) => {
  const from = (found.page - 1) * found.pageSize
  return found.results.map((record, index) => ({
    id: record.id,
    idPrefix: index === 0 ? 'party' : `party-${from + index + 1}`,
    name: record.name,
    addressLines: pickerAddressLines(record.address),
    country: record.address.country,
    viewHref: insViewAddressUrl(record.id, returnPath),
    checked: record.id === selectedId
  }))
}

export const pickerViewModel = (
  journey,
  party,
  { query, selectedId, error, found, selected, changing },
  copy
) => {
  const returnPath = resultsHref(journey.journeyId, party, {
    query,
    page: found.page,
    selectedId,
    changing
  })
  const rows = resultRows(found, selectedId, returnPath)

  return {
    query,
    page: found.page,
    error,
    selected,
    resultsCount: copy.resultsCount(found.results.length, found.total),
    rows,
    tableRows: pickerTableRows(rows, copy),
    pagination: pagination(journey.journeyId, party, {
      query,
      page: found.page,
      totalPages: found.totalPages,
      selectedId,
      changing
    })
  }
}

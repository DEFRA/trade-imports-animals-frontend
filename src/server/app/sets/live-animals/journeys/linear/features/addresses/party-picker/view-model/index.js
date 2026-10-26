import { addressText, detailLines } from './address-lines.js'
import { pagination } from './pagination/index.js'
import { pickerTableRows } from './table-rows.js'

const resultRows = (found, selectedId) => {
  const from = (found.page - 1) * found.pageSize
  return found.results.map((record, index) => ({
    id: record.id,
    idPrefix: index === 0 ? 'party' : `party-${from + index + 1}`,
    name: record.name,
    addressText: addressText(record.address),
    country: record.address.country,
    detailLines: detailLines(record),
    checked: record.id === selectedId
  }))
}

export const pickerViewModel = (
  journey,
  party,
  { query, selectedId, error, found, selected, changing },
  copy
) => {
  const rows = resultRows(found, selectedId)

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

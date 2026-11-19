import { insViewAddressUrl } from '../../../../../../../../../common/helpers/ins-address-book-urls.js'
import { pickerAddressLines } from './address-lines.js'
import { resultsHref } from './results-href.js'
import { pickerTableRows } from './table-rows.js'

const resultRows = (found, selectedId, viewReturnPath) =>
  found.map((record, index) => ({
    id: record.id,
    idPrefix: index === 0 ? 'party' : `party-${index + 1}`,
    name: record.name,
    addressLines: pickerAddressLines(record.address),
    country: record.address.country,
    ...(viewReturnPath && {
      viewHref: insViewAddressUrl(record.id, viewReturnPath)
    }),
    checked: record.id === selectedId
  }))

export const pickerViewModel = (
  journey,
  party,
  { query, selectedId, error, found, selected, trail, withViewLinks },
  copy
) => {
  const viewReturnPath =
    withViewLinks &&
    resultsHref(journey.journeyId, party, { query, selectedId, trail })
  const rows = resultRows(found, selectedId, viewReturnPath)

  return {
    query,
    error,
    selected,
    resultsCount: copy.resultsCount(rows.length, rows.length),
    rows,
    withViewLinks,
    tableRows: pickerTableRows(rows, copy, { withViewLinks })
  }
}

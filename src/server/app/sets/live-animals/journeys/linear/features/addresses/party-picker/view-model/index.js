import { insViewAddressUrl } from '../../../../../../../../../common/helpers/ins-address-book-urls.js'
import { pickerAddressLines } from './address-lines.js'
import {
  addressesBeforePage,
  addressesOnPage,
  pageCountOf,
  paginationLinks
} from './pagination/index.js'
import { resultsHref } from './results-href.js'
import { pickerTableRows } from './table-rows.js'

const resultRows = (addresses, from, selectedId, viewReturnPath) =>
  addresses.map((record, index) => ({
    id: record.id,
    idPrefix: index === 0 ? 'party' : `party-${from + index + 1}`,
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
  { query, page, selectedId, error, found, selected, trail, withViewLinks },
  copy
) => {
  const viewReturnPath =
    withViewLinks &&
    resultsHref(journey.journeyId, party, { query, page, selectedId, trail })
  const rows = resultRows(
    addressesOnPage(found, page),
    addressesBeforePage(page),
    selectedId,
    viewReturnPath
  )

  return {
    query,
    page,
    error,
    selected,
    resultsCount: copy.resultsCount(rows.length, found.length),
    rows,
    withViewLinks,
    tableRows: pickerTableRows(rows, copy, { withViewLinks }),
    pagination: paginationLinks(journey.journeyId, party, {
      query,
      page,
      totalPages: pageCountOf(found.length),
      selectedId,
      trail,
      labels: copy.pagination
    })
  }
}

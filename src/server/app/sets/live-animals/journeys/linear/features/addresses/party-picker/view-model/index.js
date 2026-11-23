import { insViewAddressUrl } from '../../../../../../../../../common/helpers/ins-address-book-urls.js'
import { pickerAddressLines } from './address-lines.js'
import { addressesOnPage, pageCountOf, paginationLinks } from './pagination.js'
import { resultsHref } from './results-href.js'
import { pickerTableRows } from './table-rows.js'

const resultRows = (addresses, selectedId, viewReturnPath) =>
  addresses.map((record, index) => ({
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
  { query, page, selectedId, error, found, selected, trail, withViewLinks },
  copy
) => {
  const hrefForPage = (number) =>
    resultsHref(journey.journeyId, party, {
      query,
      page: number,
      selectedId,
      trail
    })
  const viewReturnPath = withViewLinks && hrefForPage(page)
  const rows = resultRows(
    addressesOnPage(found, page),
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
    pagination: paginationLinks(
      {
        page,
        totalPages: pageCountOf(found.length),
        labels: copy.pagination
      },
      hrefForPage
    )
  }
}

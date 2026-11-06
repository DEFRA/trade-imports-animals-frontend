import { buildAnimalsFrontendUrl } from '../../../../../../../../../common/helpers/animals-frontend-url.js'
import { buildInsFrontendUrl } from '../../../../../../../../../common/helpers/ins-frontend-url.js'
import { pickerAddressLines } from './address-lines.js'
import { pagination } from './pagination/index.js'
import { resultsHref } from './pagination/results-href.js'
import { pickerTableRows } from './table-rows.js'

const insAddressHref = (addressId, returnUrl) =>
  buildInsFrontendUrl(
    `/address-book/${encodeURIComponent(addressId)}?${new URLSearchParams({ return: returnUrl })}`
  )

const resultRows = (found, selectedId, returnUrl) => {
  const from = (found.page - 1) * found.pageSize
  return found.results.map((record, index) => ({
    id: record.id,
    idPrefix: index === 0 ? 'party' : `party-${from + index + 1}`,
    name: record.name,
    addressLines: pickerAddressLines(record.address),
    country: record.address.country,
    viewHref: insAddressHref(record.id, returnUrl),
    checked: record.id === selectedId
  }))
}

export const pickerViewModel = (
  journey,
  party,
  { query, selectedId, error, found, selected, changing },
  copy
) => {
  const returnUrl = buildAnimalsFrontendUrl(
    resultsHref(journey.journeyId, party, {
      query,
      page: found.page,
      selectedId,
      changing
    })
  )
  const rows = resultRows(found, selectedId, returnUrl)

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

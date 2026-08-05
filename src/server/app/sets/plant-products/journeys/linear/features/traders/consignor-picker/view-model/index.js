import { pagePath } from '../../../../../../../../shared/paths.js'
import { consignorCreatePage } from '../../page.js'
import { addressText, countryText, detailLines } from './address-lines.js'
import { pagination } from './pagination/index.js'

// The first row of every page keeps the bare 'party' id prefix so the error
// summary's '#party' anchor resolves wherever the user is; later rows carry
// their position in the whole result set.
const idPrefixFor = (from, index) =>
  index === 0 ? 'party' : `party-${from + index + 1}`

export const pickerViewModel = (
  journey,
  { found, query, selectedId, selected, error },
  copy
) => {
  const from = (found.page - 1) * found.pageSize

  return {
    query,
    page: found.page,
    error,
    selected,
    createConsignorHref: pagePath(journey.journeyId, consignorCreatePage.slug),
    resultsCaption: copy.resultsCaption(found.results.length, found.total),
    rows: found.results.map((record, index) => ({
      id: record.id,
      idPrefix: idPrefixFor(from, index),
      name: record.name,
      addressText: addressText(record.address),
      country: countryText(record.address?.country),
      detailLines: detailLines(record),
      checked: record.id === selectedId
    })),
    pagination: pagination(journey.journeyId, {
      query,
      page: found.page,
      totalPages: found.totalPages,
      selectedId
    })
  }
}

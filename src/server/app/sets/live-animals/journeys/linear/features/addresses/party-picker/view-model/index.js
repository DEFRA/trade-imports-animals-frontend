import { pagePath } from '../../../../../../../../shared/paths.js'
import { CREATE_ADDRESS_SLUG } from '../../create-address/create-address.controller.js'
import { addressText, detailLines } from './address-lines.js'
import { pagination } from './pagination/index.js'

export const pickerViewModel = (
  journey,
  party,
  { query, selectedId, error, found, selected },
  copy
) => {
  const from = (found.page - 1) * found.pageSize

  return {
    query,
    page: found.page,
    error,
    selected,
    createAddressHref: pagePath(
      journey.journeyId,
      `${CREATE_ADDRESS_SLUG}?for=${party.id}`
    ),
    resultsCaption: copy.resultsCaption(found.results.length, found.total),
    rows: found.results.map((record, index) => ({
      id: record.id,
      idPrefix: index === 0 ? 'party' : `party-${from + index + 1}`,
      name: record.name,
      addressText: addressText(record.address),
      country: record.address.country,
      detailLines: detailLines(record),
      checked: record.id === selectedId
    })),
    pagination: pagination(journey.journeyId, party, {
      query,
      page: found.page,
      totalPages: found.totalPages,
      selectedId
    })
  }
}

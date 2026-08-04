import { pagePath } from '../../../../../../../../shared/paths.js'
import { consignorCreatePage } from '../../page.js'
import { addressText, countryText, detailLines } from './address-lines.js'

export const pickerViewModel = (
  journey,
  { records, selectedId, error },
  copy
) => ({
  error,
  selected: records.find((record) => record.id === selectedId),
  createConsignorHref: pagePath(journey.journeyId, consignorCreatePage.slug),
  resultsCaption: copy.resultsCaption(records.length, records.length),
  rows: records.map((record, index) => ({
    id: record.id,
    idPrefix: index === 0 ? 'party' : `party-${index + 1}`,
    name: record.name,
    addressText: addressText(record.address),
    country: countryText(record.address?.country),
    detailLines: detailLines(record),
    checked: record.id === selectedId
  }))
})

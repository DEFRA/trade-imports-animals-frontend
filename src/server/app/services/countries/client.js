import {
  referenceDataUrl,
  requestReferenceData
} from '../reference-data/request.js'

export const fetchCountries = (blocks) => {
  const url = referenceDataUrl('/countries')
  for (const block of blocks ?? []) {
    url.searchParams.append('blocks', block)
  }
  return requestReferenceData('get-countries', url, { method: 'GET' })
}

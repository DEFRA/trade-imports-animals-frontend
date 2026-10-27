import {
  referenceDataUrl,
  requestReferenceData
} from '../reference-data/request.js'

export const fetchCountries = (blocks) => {
  const url = referenceDataUrl('/countries')
  for (const block of blocks ?? []) {
    url.searchParams.append('blocks', block)
  }
  return requestReferenceData(url, { method: 'GET' }, 'Failed to get countries')
}

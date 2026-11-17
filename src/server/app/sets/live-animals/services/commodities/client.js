import {
  referenceDataUrl,
  requestReferenceData
} from '../../../../services/reference-data/request.js'

export const fetchCommodities = (term, { page, size }) => {
  const url = referenceDataUrl('/commodities')
  url.searchParams.set('q', term)
  url.searchParams.set('page', String(page))
  url.searchParams.set('size', String(size))
  return requestReferenceData(
    'search-commodities',
    url,
    { method: 'GET' },
    'Failed to search commodities'
  )
}

export const checkSpecies = (lines) =>
  requestReferenceData(
    'check-species',
    referenceDataUrl('/commodities/species-check'),
    { method: 'POST', body: JSON.stringify({ lines }) },
    'Failed to check species'
  )

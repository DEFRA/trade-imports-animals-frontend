import {
  referenceDataUrl,
  requestReferenceData
} from '../reference-data/request.js'

export const fetchPortsOfEntry = () =>
  requestReferenceData(
    referenceDataUrl('/ports-of-entry'),
    { method: 'GET' },
    'Failed to get ports of entry'
  )

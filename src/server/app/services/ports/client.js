import {
  referenceDataUrl,
  requestReferenceData
} from '../reference-data/request.js'

export const fetchPortsOfEntry = () =>
  requestReferenceData(
    'get-ports-of-entry',
    referenceDataUrl('/ports-of-entry'),
    { method: 'GET' }
  )

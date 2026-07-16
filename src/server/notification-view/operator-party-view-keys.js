/**
 * Maps every backend operator party key (the NotificationBase field names plus
 * 'transporter', which lives at transport.transporter) to the review page's
 * view-model anchor, the summary card it renders in and its display label. The
 * backend's `destination` key is renamed to `placeOfDestination` by the view
 * helper, so an error summary anchored on the raw backend key would otherwise
 * link to nothing (design.md §4.4).
 */
export const OPERATOR_PARTY_VIEW_KEYS = {
  placeOfOrigin: {
    anchor: 'party-placeOfOrigin',
    card: 'addresses',
    label: 'Place of origin'
  },
  consignor: {
    anchor: 'party-consignor',
    card: 'addresses',
    label: 'Consignor'
  },
  consignee: {
    anchor: 'party-consignee',
    card: 'addresses',
    label: 'Consignee'
  },
  importer: {
    anchor: 'party-importer',
    card: 'addresses',
    label: 'Importer'
  },
  destination: {
    anchor: 'party-placeOfDestination',
    card: 'addresses',
    label: 'Place of destination'
  },
  consignment: {
    anchor: 'party-consignment',
    card: 'addresses',
    label: 'Contact details for consignment'
  },
  transporter: {
    anchor: 'party-transporter',
    card: 'transport',
    label: 'Transporter'
  }
}

const DELETED_MESSAGE = 'this operator has been deleted, select a replacement'
const UNRESOLVED_MESSAGE =
  'this operator could not be verified, select it again'

function collect(keys, message, kind) {
  if (!Array.isArray(keys)) {
    return []
  }
  const errors = []
  for (const key of keys) {
    const meta = OPERATOR_PARTY_VIEW_KEYS[key]
    if (meta) {
      errors.push({
        anchor: meta.anchor,
        card: meta.card,
        kind,
        message: `${meta.label}: ${message}`
      })
    }
  }
  return errors
}

/**
 * Builds the per-party review-page error list from the backend's
 * deleted/unresolved detection arrays. The two arrays get distinct copy and are
 * never merged: a 404 (unresolved) is not a deletion (design.md §4.3). Returns
 * an empty list when both arrays are absent or empty (no claim).
 * @param {{ deletedOperatorFields?: string[], unresolvedOperatorFields?: string[] }} notification
 * @returns {Array<{ anchor: string, card: string, kind: string, message: string }>}
 */
export function buildOperatorErrors(notification = {}) {
  return [
    ...collect(notification.deletedOperatorFields, DELETED_MESSAGE, 'deleted'),
    ...collect(
      notification.unresolvedOperatorFields,
      UNRESOLVED_MESSAGE,
      'unresolved'
    )
  ]
}

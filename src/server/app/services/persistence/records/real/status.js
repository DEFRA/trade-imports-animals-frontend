import {
  AMEND,
  DELETED,
  DRAFT,
  SUBMITTED,
  SUBMITTED_ACTION_REQUIRED
} from '../../../../engine/persistence/records.js'

const STATUS_BY_BACKEND_STATUS = Object.freeze({
  DRAFT,
  SUBMITTED,
  AMEND,
  DELETED,
  SUBMITTED_ACTION_REQUIRED
})

export const mapStatus = (backendStatus) => {
  const status = STATUS_BY_BACKEND_STATUS[backendStatus]
  if (status === undefined) {
    throw new Error(`Unknown backend fulfilment status "${backendStatus}"`)
  }
  return status
}

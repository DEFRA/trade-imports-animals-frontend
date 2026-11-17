import {
  AMEND,
  DELETED,
  DRAFT,
  SUBMITTED
} from '../../../../engine/persistence/records.js'

const STATUS_BY_BACKEND_STATUS = Object.freeze({
  DRAFT,
  SUBMITTED,
  AMEND,
  DELETED
})

export const mapStatus = (backendStatus) => {
  const status = STATUS_BY_BACKEND_STATUS[backendStatus]
  if (status === undefined) {
    throw new Error(`Unknown backend fulfilment status "${backendStatus}"`)
  }
  return status
}

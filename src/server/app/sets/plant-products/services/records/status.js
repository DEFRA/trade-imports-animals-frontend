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

export const BACKEND_STATUS = Object.freeze({
  SUBMITTED: 'SUBMITTED',
  AMEND: 'AMEND',
  DELETED: 'DELETED'
})

export const mapStatus = (backendStatus) => {
  const status = STATUS_BY_BACKEND_STATUS[backendStatus]
  if (status === undefined) {
    throw new Error(
      `Unknown backend plant-products notification status "${backendStatus}"`
    )
  }
  return status
}

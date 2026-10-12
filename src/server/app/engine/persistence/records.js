import { currentSetId, setKeyed } from '../../shared/set-context.js'

export const DRAFT = 'draft'
export const SUBMITTED = 'submitted'
export const AMEND = 'amend'
export const DELETED = 'deleted'
export const SUBMITTED_ACTION_REQUIRED = 'submitted-action-required'
export const OUTSTANDING_HEALTH_CERTIFICATE = 'HEALTH_CERTIFICATE'

/** True for a lodged, read-only notification, with or without action required. */
export const isSubmittedStatus = (status) =>
  status === SUBMITTED || status === SUBMITTED_ACTION_REQUIRED

/** The submitted status a submission lands in, given what it still owes. */
export const submittedStatusFor = (outstandingItems = []) =>
  outstandingItems.length > 0 ? SUBMITTED_ACTION_REQUIRED : SUBMITTED

const unconfigured = () => {
  throw new Error('records not configured — call configureRecords() at boot')
}

const UNCONFIGURED = Object.freeze({
  create: unconfigured,
  load: unconfigured,
  list: unconfigured,
  has: unconfigured,
  replaceFulfilment: unconfigured,
  finalise: unconfigured,
  amend: unconfigured,
  cancelAmend: unconfigured,
  copy: unconfigured,
  softDelete: unconfigured,
  clear: unconfigured
})

const store = setKeyed('records', { configuredBy: 'configureRecords' })

// Reading before configuration is the un-booted case, which must report itself
// through `unconfigured` rather than through setKeyed's "no such set" error.
const impl = () => (store.has(currentSetId()) ? store.current() : UNCONFIGURED)

export const configureRecords = (setId, newImpl) => {
  store.configure(setId, newImpl)
}

export const records = {
  create: async (...args) => impl().create(...args),
  load: async (...args) => impl().load(...args),
  list: async (...args) => impl().list(...args),
  has: async (...args) => impl().has(...args),
  replaceFulfilment: async (...args) => impl().replaceFulfilment(...args),
  finalise: async (...args) => impl().finalise(...args),
  amend: async (...args) => impl().amend(...args),
  cancelAmend: async (...args) => impl().cancelAmend(...args),
  copy: async (...args) => impl().copy(...args),
  softDelete: async (...args) => impl().softDelete(...args),
  clear: async (...args) => impl().clear(...args)
}

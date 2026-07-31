export const DRAFT = 'draft'
export const SUBMITTED = 'submitted'
export const AMEND = 'amend'
export const DELETED = 'deleted'

const unconfigured = () => {
  throw new Error('records not configured — call configureRecords() at boot')
}

let impl = {
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
}

export const configureRecords = (newImpl) => {
  impl = newImpl
}

export const records = {
  create: (...args) => impl.create(...args),
  load: (...args) => impl.load(...args),
  list: (...args) => impl.list(...args),
  has: (...args) => impl.has(...args),
  replaceFulfilment: (...args) => impl.replaceFulfilment(...args),
  finalise: (...args) => impl.finalise(...args),
  amend: (...args) => impl.amend(...args),
  cancelAmend: (...args) => impl.cancelAmend(...args),
  copy: (...args) => impl.copy(...args),
  softDelete: (...args) => impl.softDelete(...args),
  clear: (...args) => impl.clear(...args)
}

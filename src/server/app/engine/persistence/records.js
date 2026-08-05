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
  create: async (...args) => impl.create(...args),
  load: async (...args) => impl.load(...args),
  list: async (...args) => impl.list(...args),
  has: async (...args) => impl.has(...args),
  replaceFulfilment: async (...args) => impl.replaceFulfilment(...args),
  finalise: async (...args) => impl.finalise(...args),
  amend: async (...args) => impl.amend(...args),
  cancelAmend: async (...args) => impl.cancelAmend(...args),
  copy: async (...args) => impl.copy(...args),
  softDelete: async (...args) => impl.softDelete(...args),
  clear: async (...args) => impl.clear(...args)
}

import { setKeyed } from '../../shared/set-context.js'

export const DRAFT = 'draft'
export const SUBMITTED = 'submitted'
export const AMEND = 'amend'
export const DELETED = 'deleted'

const store = setKeyed('records')

export const configureRecords = (setId, impl) => {
  store.configure(setId, impl)
}

export const records = {
  create: (...args) => store.current().create(...args),
  load: (...args) => store.current().load(...args),
  list: (...args) => store.current().list(...args),
  has: (...args) => store.current().has(...args),
  replaceFulfilment: (...args) => store.current().replaceFulfilment(...args),
  finalise: (...args) => store.current().finalise(...args),
  amend: (...args) => store.current().amend(...args),
  cancelAmend: (...args) => store.current().cancelAmend(...args),
  copy: (...args) => store.current().copy(...args),
  softDelete: (...args) => store.current().softDelete(...args),
  clear: (...args) => store.current().clear(...args)
}

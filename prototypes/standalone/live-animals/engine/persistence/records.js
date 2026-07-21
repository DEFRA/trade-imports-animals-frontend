export const IN_PROGRESS = 'in-progress'
export const SUBMITTED = 'submitted'

const unconfigured = () => {
  throw new Error('records not configured — call configureRecords() at boot')
}

let impl = {
  create: unconfigured,
  load: unconfigured,
  list: unconfigured,
  has: unconfigured,
  saveAnswers: unconfigured,
  finalise: unconfigured,
  amend: unconfigured,
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
  saveAnswers: (...args) => impl.saveAnswers(...args),
  finalise: (...args) => impl.finalise(...args),
  amend: (...args) => impl.amend(...args),
  clear: (...args) => impl.clear(...args)
}

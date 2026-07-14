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
  create(...args) {
    return impl.create(...args)
  },
  load(...args) {
    return impl.load(...args)
  },
  list(...args) {
    return impl.list(...args)
  },
  has(...args) {
    return impl.has(...args)
  },
  saveAnswers(...args) {
    return impl.saveAnswers(...args)
  },
  finalise(...args) {
    return impl.finalise(...args)
  },
  amend(...args) {
    return impl.amend(...args)
  },
  clear(...args) {
    return impl.clear(...args)
  }
}

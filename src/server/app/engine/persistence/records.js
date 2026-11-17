import { currentSetId, setKeyed } from '../../shared/set-context.js'
import { countEvent } from '../../../common/helpers/metrics/publish-metrics.js'

export const DRAFT = 'draft'
export const SUBMITTED = 'submitted'
export const AMEND = 'amend'
export const DELETED = 'deleted'

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

const impl = () => (store.has(currentSetId()) ? store.current() : UNCONFIGURED)

export const configureRecords = (setId, newImpl) => {
  store.configure(setId, newImpl)
}

const writeCountingConflicts = async (write) => {
  try {
    return await write()
  } catch (error) {
    if (error?.code === 'STALE_CONCURRENCY_TOKEN') {
      countEvent('journey.concurrency.conflict')
    }
    throw error
  }
}

const writeCounting = async (metric, write) => {
  const written = await writeCountingConflicts(write)
  countEvent(metric)
  return written
}

export const records = {
  create: async (...args) =>
    writeCounting('journey.started', () => impl().create(...args)),
  load: async (...args) => impl().load(...args),
  list: async (...args) => impl().list(...args),
  has: async (...args) => impl().has(...args),
  replaceFulfilment: async (...args) =>
    writeCountingConflicts(() => impl().replaceFulfilment(...args)),
  finalise: async (...args) =>
    writeCounting('journey.submitted', () => impl().finalise(...args)),
  amend: async (...args) =>
    writeCounting('journey.amended', () => impl().amend(...args)),
  cancelAmend: async (...args) => impl().cancelAmend(...args),
  copy: async (...args) =>
    writeCounting('journey.copied', () => impl().copy(...args)),
  softDelete: async (...args) =>
    writeCounting('journey.deleted', () => impl().softDelete(...args)),
  clear: async (...args) => impl().clear(...args)
}

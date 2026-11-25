import { currentSetId, setKeyed } from '../../shared/set-context.js'
import { countEventInBackground } from '../../../common/helpers/metrics/publish-metrics.js'

export const DRAFT = 'draft'
export const SUBMITTED = 'submitted'
export const AMEND = 'amend'
export const DELETED = 'deleted'

export const STALE_CONCURRENCY_TOKEN = 'STALE_CONCURRENCY_TOKEN'

export const isStaleConcurrencyRefusal = (error) =>
  error?.code === STALE_CONCURRENCY_TOKEN

const unconfigured = () => {
  throw new Error('records not configured — call configureRecords() at boot')
}

const UNCONFIGURED = Object.freeze({
  create: unconfigured,
  load: unconfigured,
  list: unconfigured,
  has: unconfigured,
  replaceFulfilment: unconfigured,
  submit: unconfigured,
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
    if (isStaleConcurrencyRefusal(error)) {
      countEventInBackground('journey.concurrency.conflict')
    }
    throw error
  }
}

const writeCountingSuccessAndConflicts = async (metric, write) => {
  const written = await writeCountingConflicts(write)
  if (written) {
    countEventInBackground(metric)
  }
  return written
}

export const records = {
  create: async (...args) =>
    writeCountingSuccessAndConflicts('journey.started', () =>
      impl().create(...args)
    ),
  load: async (...args) => impl().load(...args),
  list: async (...args) => impl().list(...args),
  has: async (...args) => impl().has(...args),
  replaceFulfilment: async (...args) =>
    writeCountingConflicts(() => impl().replaceFulfilment(...args)),
  submit: async (...args) =>
    writeCountingSuccessAndConflicts('journey.submitted', () =>
      impl().submit(...args)
    ),
  amend: async (...args) =>
    writeCountingSuccessAndConflicts('journey.amended', () =>
      impl().amend(...args)
    ),
  cancelAmend: async (...args) => impl().cancelAmend(...args),
  copy: async (...args) =>
    writeCountingSuccessAndConflicts('journey.copied', () =>
      impl().copy(...args)
    ),
  softDelete: async (...args) =>
    writeCountingSuccessAndConflicts('journey.deleted', () =>
      impl().softDelete(...args)
    ),
  clear: async (...args) => impl().clear(...args)
}

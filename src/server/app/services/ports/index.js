import Boom from '@hapi/boom'
import { PORTS } from './stub.js'
import { fetchPortsOfEntry } from './client.js'
import { isStubMode } from '../../../common/services/mode.js'

let ports = [...PORTS]
let loaded = false

/** Load real reference data. Called once at startup (non-fatal — the plugin's
 * register catches to keep the service coming up when MDM is unavailable).
 * Stub mode is a no-op — the module-scope list is seeded from the stub so
 * the readers can serve without any load. */
export const prime = async () => {
  if (isStubMode()) {
    return
  }
  try {
    ports = await fetchPortsOfEntry()
    loaded = true
  } catch (err) {
    throw Boom.serverUnavailable('Reference data unavailable', {
      dataset: 'ports',
      cause: err
    })
  }
}

/** In real mode a reader called before prime() succeeded has nothing real to
 * serve — falling back silently to the seeded stub would let a page render
 * with the wrong ports. Throw instead, so catchAll renders the error page
 * (see server/common/helpers/errors.js). Stub mode always succeeds. */
const assertLoaded = () => {
  if (!isStubMode() && !loaded) {
    throw Boom.serverUnavailable('Reference data unavailable', {
      dataset: 'ports'
    })
  }
}

export const list = () => {
  assertLoaded()
  return ports
}

export const label = (code) => {
  assertLoaded()
  const port = ports.find((entry) => entry.code === code)
  return port ? `${port.name} (${port.code})` : undefined
}

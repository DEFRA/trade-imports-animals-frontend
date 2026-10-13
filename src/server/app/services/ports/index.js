import Boom from '@hapi/boom'
import { PORTS } from './stub.js'
import { fetchPortsOfEntry } from './client.js'
import { isStubMode } from '../../../common/services/mode.js'

let ports = [...PORTS]
let loaded = false

/** Load the port-of-entry list from the reference-data service, once. Called
 * implicitly by every reader — the readers self-load on first use rather than
 * relying on a startup priming step, so an MDM outage at boot no longer stops
 * the pod from serving. In stub mode the seeded PORTS list plays the role of
 * a loaded cache and this is a no-op. A prior failed load leaves `loaded`
 * false so the next reader retries; a success flips the flag and subsequent
 * calls short-circuit. */
export const ensureLoaded = async () => {
  if (isStubMode() || loaded) {
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

export const list = async () => {
  await ensureLoaded()
  return ports
}

const displayName = (port) => `${port.name} (${port.code})`

export const label = async (code) => {
  await ensureLoaded()
  const port = ports.find((entry) => entry.code === code)
  return port ? displayName(port) : undefined
}

export const portOptions = async () => {
  await ensureLoaded()
  return ports.map((port) => ({ value: port.code, text: displayName(port) }))
}

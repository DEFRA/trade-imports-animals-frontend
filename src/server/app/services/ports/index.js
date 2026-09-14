import Boom from '@hapi/boom'
import { PORTS } from './stub.js'
import { fetchPortsOfEntry } from './client.js'
import { isStubMode } from '../../../common/services/mode.js'

let ports = [...PORTS]
let loaded = false

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

export const label = async (code) => {
  await ensureLoaded()
  const port = ports.find((entry) => entry.code === code)
  return port ? `${port.name} (${port.code})` : undefined
}

import { PORTS } from './stub.js'
import { fetchPortsOfEntry } from './client.js'
import { isStubMode } from '../../../common/services/mode.js'

let ports = [...PORTS]

export const prime = async () => {
  if (isStubMode()) {
    return
  }
  ports = await fetchPortsOfEntry()
}

// Readers are async even though the body is synchronous today — the signature
// is what callers depend on. Behaviour is unchanged in this commit; a
// follow-up wires each reader to await ensureLoaded so the load can be lazy
// and driven by the point of read.
export const list = async () => ports

export const label = async (code) => {
  const port = ports.find((entry) => entry.code === code)
  return port ? `${port.name} (${port.code})` : undefined
}

import { PORTS } from './stub.js'
import { fetchPortsOfEntry } from './client.js'
import { isRealMode } from '../mode.js'

let ports = [...PORTS]

export const prime = async () => {
  if (!isRealMode()) return
  ports = await fetchPortsOfEntry()
}

export const list = () => ports

export const label = (code) => {
  const port = ports.find((p) => p.code === code)
  return port ? `${port.name} (${port.code})` : undefined
}

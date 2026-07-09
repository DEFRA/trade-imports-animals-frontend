import { PORTS } from './stub.js'
import { fetchPortsOfEntry } from './client.js'
import { isRealMode } from '../mode.js'

let ports = [...PORTS]

export const prime = async () => {
  if (!isRealMode()) return
  ports = await fetchPortsOfEntry()
}

export const list = () => ports.map((port) => port.name)

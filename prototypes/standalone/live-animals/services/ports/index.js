import { PORTS } from './stub.js'

export const list = () => PORTS.map((port) => port.name)

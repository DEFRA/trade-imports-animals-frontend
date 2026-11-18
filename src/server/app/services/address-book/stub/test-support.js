import { holdsRole } from '../index.js'
import { STUB_BOOK } from './index.js'

export const recordsHoldingRole = (role) =>
  STUB_BOOK.filter((record) => holdsRole(record, role))

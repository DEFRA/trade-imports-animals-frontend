// Set-owned records selection from docs/add-a-set.md step 8.
import { mode } from '../mode.js'
import { records as stubRecords } from './stub.js'

const OPERATIONS = [
  'create',
  'load',
  'list',
  'has',
  'replaceFulfilment',
  'finalise',
  'amend',
  'cancelAmend',
  'copy',
  'softDelete',
  'clear'
]

const realNotImplemented = async () => {
  throw new Error(
    'plant-products real records adapter not implemented — pp-008'
  )
}

const realRecords = Object.fromEntries(
  OPERATIONS.map((operation) => [operation, realNotImplemented])
)

export const records = Object.fromEntries(
  OPERATIONS.map((operation) => [
    operation,
    (...args) =>
      (mode() === 'stub' ? stubRecords : realRecords)[operation](...args)
  ])
)

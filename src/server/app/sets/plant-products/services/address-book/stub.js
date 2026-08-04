import { CANNED_CONSIGNORS } from './canned-consignors.js'
import { readCreated, writeCreated } from './session-store.js'

// Canned because the data is canned, not because the module is mode-gated:
// there is no real plant address book to switch to, so this implementation
// serves the same catalogue whatever PLANT_PRODUCTS_MODE says.
const storedRecord = ({ id, name, telephone, email, address }) => ({
  id,
  name,
  telephone: telephone ?? '',
  email: email ?? '',
  address: { ...address }
})

export const list = async (request) => [
  ...CANNED_CONSIGNORS,
  ...readCreated(request)
]

export const find = async (request, id) =>
  (await list(request)).find((record) => record.id === id)

export const add = async (request, record) => {
  const created = readCreated(request)
  const stored = storedRecord({
    ...record,
    id: `created-consignor-${created.length + 1}`
  })
  writeCreated(request, [...created, stored])
  return stored
}

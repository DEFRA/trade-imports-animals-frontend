import {
  APPROVED,
  COMMERCIAL,
  NEW,
  PRIVATE,
  TRANSPORTER_OPTIONS
} from './records.js'
import { addedParties, nameKey } from './register.js'

export { APPROVED, COMMERCIAL, NEW, PRIVATE }
export {
  forgetAddedTransporters,
  nameKey,
  rememberTransporter
} from './register.js'

/** Every transporter the service ships, commercial and private together.
 *
 * Deliberately synchronous: the commercial register builds its `oneOf`
 * validation from these ids at module load, so this must resolve without
 * awaiting. The address book became async when it moved onto the API
 * (EUDPA-294) — keeping transporters here is what lets that happen without
 * breaking these pages. */
export const parties = () => TRANSPORTER_OPTIONS

export const party = (id) => parties().find((record) => record.id === id)

/** Every transporter this organisation can pick: the ones it has added for
 * itself, then the ones the service ships.
 *
 * The transporter list asks for this rather than `parties`, so a transporter a
 * trader added on an earlier notification is there to be picked on the next
 * one. It is per-organisation and so per-request, which is why the list
 * validates the ids it is rendering rather than a set fixed at module load.
 *
 * An added record replaces a shipped one of the same name rather than sitting
 * beside it: the register's "one name means one row" holds across the join too,
 * so a trader who adds a transporter the service already ships sees the one row
 * they added, not two rows a pick cannot tell apart. */
export const partiesFor = (orgId) => {
  const added = addedParties(orgId)
  const addedNames = new Set(added.map((record) => nameKey(record.name)))
  return [
    ...added,
    ...parties().filter((record) => !addedNames.has(nameKey(record.name)))
  ]
}

/** The approved commercial register alone — the one list a trader adding a
 * commercial transporter can choose from today. */
export const commercialParties = () =>
  parties().filter((record) => record.type === COMMERCIAL)

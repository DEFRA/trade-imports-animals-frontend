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

/** Every transporter the service ships, commercial and private together. */
export const parties = () => TRANSPORTER_OPTIONS

export const party = (id) => parties().find((record) => record.id === id)

/** Every transporter this organisation can pick: the ones it has added for
 * itself, then the ones the service ships.
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

export const commercialParties = () =>
  parties().filter((record) => record.type === COMMERCIAL)

import { isStubMode } from '../../../common/services/mode.js'
import {
  APPROVED,
  COMMERCIAL,
  NEW,
  PRIVATE,
  TRANSPORTER_OPTIONS
} from './records.js'
import * as client from './client.js'
import * as stub from './stub/index.js'
import { transporterRowOf, wireTransporterOf } from './to-wire-transporter.js'

export { APPROVED, COMMERCIAL, NEW, PRIVATE }
export {
  COMMERCIAL_TRANSPORTER_COUNTRY_CODE,
  COMMERCIAL_TRANSPORTER_COUNTRY_NAME
} from './commercial-country.js'

const transporterStore = () => (isStubMode() ? stub : client)

/** Two records are the same transporter when they carry the same name,
 * however it happens to be typed. The list matches a stored answer to a row
 * by this key, and a transporter the organisation adds under a name the
 * service already ships replaces that row rather than sitting beside it. */
export const nameKey = (name) => name.trim().replace(/\s+/gu, ' ').toLowerCase()

/** Every transporter the service ships, commercial and private together. */
export const parties = () => TRANSPORTER_OPTIONS

const firstOfEachName = (records) => {
  const seenNames = new Set()
  return records.filter((record) => {
    const key = nameKey(record.name)
    if (seenNames.has(key)) {
      return false
    }
    seenNames.add(key)
    return true
  })
}

/** Every transporter this organisation can pick: the ones it has added for
 * itself in the address book, then the ones the service ships.
 *
 * An added record replaces a shipped one of the same name rather than sitting
 * beside it: the list's "one name means one row" holds across the join too,
 * so a trader who adds a transporter the service already ships sees the one
 * row they added, not two rows a pick cannot tell apart. The same rule holds
 * between two added records: the newest of the name wins, the address book's
 * own listing order. */
export const partiesFor = async (orgId) => {
  const wireTransporters = await transporterStore().listTransporters(orgId)
  const added = firstOfEachName(
    await Promise.all(wireTransporters.map(transporterRowOf))
  )
  const addedNames = new Set(added.map((record) => nameKey(record.name)))
  return [
    ...added,
    ...parties().filter((record) => !addedNames.has(nameKey(record.name)))
  ]
}

/** Saves a transporter a journey form collected to the organisation's
 * address book, so the next notification can pick it instead of asking for
 * it again.
 *
 * @param {string} orgId the organisation the signed-in user is acting for
 * @param {object} party the transporter, in the journey's own record shape
 * @param {string} wireType which kind of transporter it is: `WIRE_PRIVATE`
 *   or `WIRE_COMMERCIAL` from `./wire-types.js`
 * @returns {Promise<object>} the created transporter, as the address book
 *   returned it
 */
export const saveTransporter = (orgId, party, wireType) =>
  transporterStore().createTransporter(
    orgId,
    wireTransporterOf(party, wireType)
  )

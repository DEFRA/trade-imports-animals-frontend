import { randomUUID } from 'node:crypto'

const addedByOrganisation = new Map()

/** Two records are the same transporter when they carry the same name, however
 * it happens to be typed. Re-entering a transporter corrects the record the
 * organisation already has rather than putting a second row beside it. */
export const nameKey = (name) => name.trim().replace(/\s+/gu, ' ').toLowerCase()

/** Every transporter this organisation has added, newest first — design
 * release 1 shows the record a trader has just added at the top of the list.
 *
 * Deliberately synchronous, like the shipped register beside it: the list page
 * builds a row and a validation option per record while rendering. */
export const addedParties = (orgId) =>
  [...(addedByOrganisation.get(orgId)?.values() ?? [])].reverse()

/** Keep a transporter for the organisation, so the next notification can pick
 * it instead of asking for it again.
 *
 * Ignores a record with no organisation to file it under — `organisationIdOf`
 * resolves to undefined on an unauthenticated request, and a guess would file
 * one organisation's transporter under another's. The notification still holds
 * the answer, so nothing the trader typed is lost.
 *
 * @param {string} orgId - the organisation the signed-in user is acting for
 * @param {object} record - the transporter, as the list renders it
 * @returns {object|undefined} the kept record, with the id the list picks it by
 */
export const rememberTransporter = (orgId, record) => {
  if (!orgId || !record?.name?.trim()) {
    return undefined
  }

  const records = addedByOrganisation.get(orgId) ?? new Map()
  const key = nameKey(record.name)
  const kept = { ...record, id: records.get(key)?.id ?? randomUUID() }
  records.set(key, kept)
  addedByOrganisation.set(orgId, records)
  return kept
}

/** Empty the store. For tests, which share one module instance and would
 * otherwise read each other's transporters. */
export const forgetAddedTransporters = () => addedByOrganisation.clear()

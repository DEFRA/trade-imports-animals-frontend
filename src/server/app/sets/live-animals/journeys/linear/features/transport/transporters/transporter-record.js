import {
  COMMERCIAL,
  PRIVATE
} from '../../../../../../../services/transporters/index.js'

/** Address lines in reading order, whichever of the two shapes a record has:
 * the register's numbered lines, or the private form's town, county and
 * postal code. Blank parts drop out. */
const ADDRESS_ORDER = [
  'addressLine1',
  'addressLine2',
  'addressLine3',
  'townOrCity',
  'county',
  'postalOrZipCode',
  'country'
]

export const addressSummary = (address = {}) =>
  ADDRESS_ORDER.map((part) => address[part])
    .filter(Boolean)
    .join(', ')

/** What picking a transporter commits.
 *
 * The record's own type settles `transporterType`, and the answer it fills is
 * the one that type puts in scope — the other is purged by the obligation
 * model, not by this. */
export const transporterAnswer = (chosen) =>
  chosen.type === PRIVATE
    ? {
        transporterType: PRIVATE,
        privateTransporter: {
          name: chosen.name,
          address: { ...chosen.address }
        }
      }
    : {
        transporterType: COMMERCIAL,
        commercialTransporter: {
          name: chosen.name,
          address: { ...chosen.address },
          approvalNumber: chosen.approvalNumber
        }
      }

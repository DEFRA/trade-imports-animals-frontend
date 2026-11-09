import {
  COMMERCIAL,
  PRIVATE
} from '../../../../../../../services/transporters/index.js'

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

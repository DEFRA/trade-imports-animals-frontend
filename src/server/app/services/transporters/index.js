import {
  APPROVED,
  COMMERCIAL,
  NEW,
  PRIVATE,
  TRANSPORTER_OPTIONS
} from './records.js'

export { APPROVED, COMMERCIAL, NEW, PRIVATE }

/** Every transporter the trader can pick, commercial and private together.
 *
 * Deliberately synchronous: the transporter list and the commercial
 * register both build their `oneOf` validation from these ids at module load,
 * so this must resolve without awaiting. The address book became async when it
 * moved onto the API (EUDPA-294) — keeping transporters here is what lets that
 * happen without breaking these pages. */
export const parties = () => TRANSPORTER_OPTIONS

export const party = (id) => parties().find((record) => record.id === id)

/** The approved commercial register alone — the one list a trader adding a
 * commercial transporter can choose from today. */
export const commercialParties = () =>
  parties().filter((record) => record.type === COMMERCIAL)

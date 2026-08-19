import { COMMERCIAL_TRANSPORTER_OPTIONS } from './records.js'

/** Commercial transporters for the transporter picker.
 *
 * Deliberately **synchronous**: `transporters-select.controller.js` builds its
 * `oneOf` validation from `parties()` at module load, so this must resolve
 * without awaiting. The address book became async when it moved onto the API
 * (EUDPA-294) — keeping transporters here is what lets that happen without
 * breaking this page. */
export const parties = () => COMMERCIAL_TRANSPORTER_OPTIONS

export const party = (id) => parties().find((record) => record.id === id)

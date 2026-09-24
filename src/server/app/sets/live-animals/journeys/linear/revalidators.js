import { validateStoredAnswers as portOfEntryValidateStored } from './features/transport/port-of-entry/validate-stored.js'
import { validateStoredAnswers as originValidateStored } from './features/origin/validate-stored.js'
import { validateStoredAnswers as importReasonValidateStored } from './features/import-reason/validate-stored.js'
import { validateStoredAnswers as contactValidateStored } from './features/contact/validate-stored.js'
import { validateStoredAnswers as transitCountriesValidateStored } from './features/transport/transit-countries/validate-stored.js'
import { validateStoredAnswers as addressesValidateStored } from './features/addresses/validate-stored.js'

/** Lives in a peer file rather than features/index.js so the aggregator can
 * import it without pulling in every page controller — the check-answers
 * controller imports the aggregator, so a features/index.js chain would
 * close a cycle. Each entry's `id` must match its controller's meta.id and
 * every entry declares how its errors surface on the review page:
 *   - { kind: 'card', cardId } — roll up per-page errors to one card message
 *     (invalid-section wording, indistinct per field).
 *   - { kind: 'party' } — per-role errors surface as individual summary
 *     links (matches the per-role granularity the address-book roles need).
 * The pinning test in features/index.test.js enforces the parity. */
export const revalidators = [
  {
    id: 'port-of-entry',
    run: portOfEntryValidateStored,
    surface: { kind: 'card', cardId: 'arrivalDetails' }
  },
  {
    id: 'origin',
    run: originValidateStored,
    surface: { kind: 'card', cardId: 'importDetails' }
  },
  {
    id: 'import-reason',
    run: importReasonValidateStored,
    surface: { kind: 'card', cardId: 'reasonForImport' }
  },
  {
    id: 'consignment-contact-select',
    run: contactValidateStored,
    surface: { kind: 'card', cardId: 'contactAddress' }
  },
  {
    id: 'transit-countries',
    run: transitCountriesValidateStored,
    surface: { kind: 'card', cardId: 'transitCountries' }
  },
  {
    id: 'addresses',
    run: addressesValidateStored,
    surface: { kind: 'party' }
  }
]

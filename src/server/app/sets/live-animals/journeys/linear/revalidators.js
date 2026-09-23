import { validateStoredAnswers as portOfEntryValidateStored } from './features/transport/port-of-entry/validate-stored.js'
import { validateStoredAnswers as originValidateStored } from './features/origin/validate-stored.js'
import { validateStoredAnswers as importReasonValidateStored } from './features/import-reason/validate-stored.js'
import { validateStoredAnswers as contactValidateStored } from './features/contact/validate-stored.js'
import { validateStoredAnswers as transitCountriesValidateStored } from './features/transport/transit-countries/validate-stored.js'

/** Lives in a peer file rather than features/index.js so the aggregator can
 * import it without pulling in every page controller — the check-answers
 * controller imports the aggregator, so a features/index.js chain would
 * close a cycle. Each entry's id must match its controller's meta.id; the
 * pinning test in features/index.test.js enforces parity. */
export const revalidators = [
  { id: 'port-of-entry', run: portOfEntryValidateStored },
  { id: 'origin', run: originValidateStored },
  { id: 'import-reason', run: importReasonValidateStored },
  { id: 'consignment-contact-select', run: contactValidateStored },
  { id: 'transit-countries', run: transitCountriesValidateStored }
]

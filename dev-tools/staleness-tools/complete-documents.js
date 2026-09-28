import { assembleFulfilments } from '../../src/server/app/bridge/assemble-fulfilments.js'
import { encodeEvaluatorFulfilments } from '../../src/server/app/services/persistence/records/fulfilment-codec/index.js'

// One document fulfilment with the four mandatory fields — matches the fullSeed
// used in check-answers.test.js. Values are the shape a trader would submit;
// the real upload path attaches a file too, which the seed script skips.
const MIN_DOC = {
  accompanyingDocumentType: 'VETERINARY_HEALTH_CERTIFICATE',
  accompanyingDocumentAttachmentType: 'PDF',
  accompanyingDocumentReference: 'GBHC1234567890',
  accompanyingDocumentDateOfIssue: { day: '12', month: '12', year: '2025' }
}

/** Write a minimum-viable documents fulfilment to a notification the seeder
 * has already produced. Idempotent — a re-run overwrites with the same
 * payload. Skips the real upload flow; the doc has no attached file.
 *
 * Called from the demo wrapper because `SeededJourney` deliberately doesn't
 * seed documents (file uploads aren't scriptable via form POSTs). Direct-
 * Mongo write is fine because the demo tool is already Mongo-direct. */
export const completeDocuments = async (notifications, referenceNumber) => {
  // `documents` is an indexed group — its encoded shape is
  // `{obligationId, records: [{fulfilmentId, values: {…}}]}`, not the plain
  // `{obligationId, value}` a scalar takes. Delegate to
  // `encodeEvaluatorFulfilments` so the persisted form matches the write
  // path the frontend itself takes.
  const contributions = assembleFulfilments({ documents: [MIN_DOC] })
  const entries = encodeEvaluatorFulfilments(contributions)
  const ids = entries.map((e) => e.obligationId)
  await notifications.updateOne(
    { referenceNumber },
    { $pull: { fulfilments: { obligationId: { $in: ids } } } }
  )
  await notifications.updateOne(
    { referenceNumber },
    { $push: { fulfilments: { $each: entries } } }
  )
}

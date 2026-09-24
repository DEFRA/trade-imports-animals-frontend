import {
  compose,
  oneOf,
  pageValidation
} from '../../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as transporters from '../../../../../../../services/transporters/index.js'
import { organisationIdOf } from '../../../../../../../../common/helpers/organisation-id.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy }).transporters

const registerFor = (request) =>
  new Map(
    transporters
      .partiesFor(organisationIdOf(request))
      .map((record) => [transporters.nameKey(record.name), record])
  )

// The picker offers rows the org has right now, so what counts as a valid id
// is per-request. On submit the page passes the rendered records in; the
// stored reading derives the same list from `request`, so both paths measure
// against the same set without the caller having to plumb a `records` context.
const availableIds = (context) =>
  context.records
    ? context.records.map((record) => record.id)
    : [...registerFor(context.request).values()].map((record) => record.id)

const fields = (_values, context = {}) =>
  compose(
    oneOf('transporter', availableIds(context), copy.errors.transporterRequired)
  )

// Stored answers carry the transporter's name, not the id the picker used, so
// the stored check is a nameKey membership against the current register — the
// same fold-and-lookup `selectedIdFor` does at render time.
const checks = (_values, { stored, storedAnswers, request } = {}) => {
  if (!stored || !request) {
    return {}
  }
  const chosenName =
    storedAnswers?.commercialTransporter?.name ??
    storedAnswers?.privateTransporter?.name
  if (!chosenName) {
    return {}
  }
  const chosenKey = transporters.nameKey(chosenName)
  return registerFor(request).has(chosenKey)
    ? {}
    : { transporter: copy.errors.transporterNoLongerAvailable }
}

export const validation = pageValidation({
  fields,
  checks,
  fromPayload: (payload) => ({ transporter: payload.transporter ?? '' }),
  // Stored answers hold the picked transporter's details rather than the id
  // of the row it came from, so `fromAnswers` cannot produce an id without
  // the register in hand. Leaving `transporter` empty on the stored reading
  // is fine — the schema is gated to POST (fields returns oneOf, but only
  // POST would have a non-empty id to check), and stored membership is
  // handled by `checks` above.
  fromAnswers: () => ({ transporter: '' })
})

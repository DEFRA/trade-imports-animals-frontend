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

// Both readings measure against the same list: submit passes `records` in,
// stored derives it from `request`. Per-org, so per-request.
const availableIds = (context) =>
  context.records
    ? context.records.map((record) => record.id)
    : [...registerFor(context.request).values()].map((record) => record.id)

const fields = (_values, context = {}) =>
  compose(
    oneOf('transporter', availableIds(context), copy.errors.transporterRequired)
  )

// Stored answers hold the transporter's name, not the picker's id, so the
// check is a nameKey membership — the same lookup `selectedIdFor` does at
// render.
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
  // Stored answers hold the transporter's name, not an id, so `fromAnswers`
  // leaves `transporter` empty. Stored membership is `checks`'s job.
  fromAnswers: () => ({ transporter: '' })
})

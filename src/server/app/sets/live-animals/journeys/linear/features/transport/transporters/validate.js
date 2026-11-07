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

// Per-org, so per-request. Stored-answers validation runs across every page
// on every submission, so an address-book outage here must not block an
// unrelated page's submission the way it blocks this page's own GET — it
// falls back to the shipped list, the one part of it that never depends on
// the address book.
const availableRecordsFor = async (request, organisationId) => {
  try {
    return await transporters.partiesFor(organisationId)
  } catch (err) {
    request.logger.warn(
      { err, organisationId },
      'Address book unavailable while checking a stored transporter pick is still on the list; falling back to the shipped list'
    )
    return transporters.parties()
  }
}

const registerFor = async (request) => {
  const records = await availableRecordsFor(request, organisationIdOf(request))
  return new Map(
    records.map((record) => [transporters.nameKey(record.name), record])
  )
}

// Both readings measure against the same list: submit passes `records` in,
// stored derives it from `request`.
const availableIds = async (context) =>
  context.records
    ? context.records.map((record) => record.id)
    : [...(await registerFor(context.request)).values()].map(
        (record) => record.id
      )

const fields = async (_values, context = {}) =>
  compose(
    oneOf(
      'transporter',
      await availableIds(context),
      copy.errors.transporterRequired
    )
  )

// Stored answers hold the transporter's name, not the picker's id, so the
// check is a nameKey membership — the same lookup `selectedIdFor` does at
// render.
const checks = async (_values, { stored, storedAnswers, request } = {}) => {
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
  const register = await registerFor(request)
  return register.has(chosenKey)
    ? {}
    : { transporter: copy.errors.transporterNoLongerAvailable }
}

export const validation = pageValidation({
  fields,
  checks,
  fromPayload: (payload) => ({ transporter: payload.transporter ?? '' }),
  fromAnswers: () => ({ transporter: '' })
})

import {
  compose,
  pageValidation,
  requiredOneOf
} from '../../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as transporters from '../../../../../../../services/transporters/index.js'
import { organisationIdOf } from '../../../../../../../../common/helpers/organisation-id.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy }).transporters

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

const transportersByNameKey = async (request) => {
  const records = await availableRecordsFor(request, organisationIdOf(request))
  return new Map(
    records.map((record) => [transporters.nameKey(record.name), record])
  )
}

const fields = (_values, context = {}) =>
  context.stored
    ? compose()
    : compose(
        requiredOneOf(
          'transporter',
          context.records.map((record) => record.id),
          copy.errors.transporterRequired
        )
      )

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
  const byNameKey = await transportersByNameKey(request)
  return byNameKey.has(chosenKey)
    ? {}
    : { transporter: copy.errors.transporterNoLongerAvailable }
}

export const validation = pageValidation({
  fields,
  checks,
  fromPayload: (payload) => ({
    transporter: String(payload.transporter ?? '').trim()
  }),
  fromAnswers: () => ({ transporter: '' })
})

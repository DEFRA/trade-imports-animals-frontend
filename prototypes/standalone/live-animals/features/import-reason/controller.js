import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import * as importReasonPurpose from '../../services/import-reason-purpose/index.js'
import { importReasonPage as page } from './page.js'

export const meta = { ...page, collects: ['reasonForImport'] }
const view = `${TEMPLATES}/features/import-reason/template`

const REASON_HINT = {
  internalMarket:
    'For imports of animals intended for sale or use in Great Britain (England, Scotland or Wales).',
  transhipmentOrOnwardTravel:
    'For animals intended for direct travel to a third country, that will stay only within the same port or airport in Great Britain while moving to another means of transport.',
  transit:
    'For animals moving through Great Britain for direct travel to a third country, that will enter Great Britain at one port or airport and leave from a different one within England, Scotland or Wales.',
  reEntry:
    'For animals authorised for re-entry, or rejected exports re-entering Great Britain.',
  temporaryAdmissionHorses: 'For horses authorised for temporary entry.'
}

const fields = compose(
  oneOf(
    'reasonForImport',
    importReasonPurpose.reasons().map((option) => option.value)
  )
)

const render = (h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Reason for import', { backLink: hubPath(), journey }),
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    reasonOptions: importReasonPurpose.reasons().map((option) => ({
      ...option,
      hint: { text: REASON_HINT[option.value] },
      checked: option.value === values.reasonForImport
    }))
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, { reasonForImport: answers.reasonForImport ?? '' })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = { reasonForImport: payload.reasonForImport ?? '' }
  const { errors } = validate(fields, payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, values, errors)
  }

  const { scope } = await state.commit(request, h, values)
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })

import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, maxText, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import * as transportReference from '../../services/transport-reference/index.js'
import { transportDetailsPage as page } from './page.js'
import {
  meansOfTransport,
  transportDocumentReference,
  transportIdentification
} from './obligations.js'

export const meta = {
  ...page,
  collects: [
    meansOfTransport.id,
    transportIdentification.id,
    transportDocumentReference.id
  ]
}
const view = `${TEMPLATES}/features/transport/transport-details`

const fields = compose(
  oneOf('meansOfTransport', transportReference.meansOfTransport()),
  maxText(
    'transportIdentification',
    58,
    'Transport identification must be 58 characters or less'
  ),
  maxText(
    'transportDocumentReference',
    58,
    'Transport document reference must be 58 characters or less'
  )
)

const render = (h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base('How the animals will travel', {
      backLink: hubPath(),
      journey
    }),
    heading: 'How the animals will travel',
    values,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, {
    meansOfTransport: answers.meansOfTransport ?? '',
    transportIdentification: answers.transportIdentification ?? '',
    transportDocumentReference: answers.transportDocumentReference ?? ''
  })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = {
    meansOfTransport: payload.meansOfTransport ?? '',
    transportIdentification: (payload.transportIdentification ?? '').trim(),
    transportDocumentReference: (
      payload.transportDocumentReference ?? ''
    ).trim()
  }
  const { errors } = validate(fields, payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, values, errors)
  }

  const { scope } = await state.commit(request, h, values)
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })

import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import * as importReasonPurpose from '../../services/import-reason-purpose/index.js'
import { importPurposePage as page } from './page.js'

export const meta = { ...page, collects: ['purposeInInternalMarket'] }
const view = `${TEMPLATES}/features/import-purpose/template`

const PURPOSE_HINT = {
  'transfer-of-ownership-sale-gift':
    "Any movement of an animal that has as it's aim, the sale of or the transfer of ownership of the animal from one person or entity to another. For example, animals that have been sold and are being moved to a new owner or will be sold once in Great Britain, purchases from a breeder/shop overseas and where an animal is being moved to a new owner with no sale involved (e.g. a gift)",
  'transfer-of-ownership-rescue':
    'Ownership of animal/s changes from one person or entity to another through rehoming and is adopted/fostered by new families, with or without an exchange or donation of money.',
  breeding:
    'Animals for reproduction. This includes animals intended to contribute to the genetic pool of a breeding program, improve livestock quality, or produce offspring',
  research: 'Animals for use in scientific or medical research.',
  'racing-competition-show-or-training':
    'Animals to participate in competitive or training events',
  'approved-premises-or-body':
    'Animals for exhibition, zoos, collections, or conservation programmes where a licence or approval is needed.',
  'companion-animal-not-for-resale-or-rehoming':
    "Privately owned animals being imported under the commercial rules as the animal is unable to meet the non-commercial requirements, for example, one or more animals being transported by a commercial transporter without their owner or an authorised person, owner that is not traveling within five days of the animals' movement or a group of five or more animals being accompanied by their owner.",
  production:
    'Animals that are farmed for the production of meat, milk, eggs, wool or any other animal product or by-product',
  slaughter:
    'Animals to be slaughtered and processed for meat production shortly after arrival into Great Britain.',
  fattening: 'Animals to be fattened for meat production.',
  restocking:
    'To replenish or enhance populations of species, for example, restocking of game or fish.'
}

const fields = compose(
  oneOf(
    'purposeInInternalMarket',
    importReasonPurpose.purposes().map((option) => option.value)
  )
)

const render = (h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Purpose in the internal market', {
      backLink: hubPath(),
      journey
    }),
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    purposeOptions: importReasonPurpose.purposes().map((option) => ({
      ...option,
      hint: { text: PURPOSE_HINT[option.value] },
      checked: option.value === values.purposeInInternalMarket
    }))
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, {
    purposeInInternalMarket: answers.purposeInInternalMarket ?? ''
  })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = {
    purposeInInternalMarket: payload.purposeInInternalMarket ?? ''
  }
  const { errors } = validate(fields, payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, values, errors)
  }

  const { scope } = await state.commit(request, h, values)
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })

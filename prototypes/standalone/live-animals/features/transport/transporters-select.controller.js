import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import * as addressBook from '../../services/address-book/index.js'
import { transportersSelectPage as page } from './page.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

export const meta = { ...page, collects: ['commercialTransporter'] }
const view = `${TEMPLATES}/features/transport/transporters-select`

const copy = copyFor({ en, cy }).transportersSelect

const fields = compose(
  oneOf(
    'commercialTransporter',
    addressBook.parties('commercialTransporter').map((option) => option.id),
    copy.errors.transporterRequired
  )
)

const addressSummary = (address) =>
  [
    address.addressLine1,
    address.addressLine2,
    address.addressLine3,
    address.country
  ]
    .filter((part) => part)
    .join(', ')

const render = (h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: pagePath('transporters'),
      journey
    }),
    copy,
    errors,
    errorSummary: kit.errorSummary(errors),
    transporterOptions: addressBook
      .parties('commercialTransporter')
      .map((option) => ({
        value: option.id,
        text: option.name,
        hint: {
          text: copy.optionHint(
            addressSummary(option.address),
            option.approvalNumber
          )
        },
        checked: option.name === values.selectedName
      }))
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, {
    selectedName: answers.commercialTransporter?.name
  })
}

const commercialTransporterRecord = (chosen) => ({
  commercialTransporter: {
    name: chosen.name,
    address: { ...chosen.address },
    approvalNumber: chosen.approvalNumber
  }
})

const commitOrSkip = (request, h, chosen) =>
  chosen
    ? state.commit(request, h, commercialTransporterRecord(chosen))
    : state.get(request, h)

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const { errors } = validate(fields, payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, {}, errors)
  }

  const chosen = addressBook.party(
    'commercialTransporter',
    payload.commercialTransporter
  )
  const { scope } = await commitOrSkip(request, h, chosen)
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })

import { hubPath, pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import * as addressBook from '../../services/address-book/index.js'
import { CREATE_ADDRESS_SLUG } from '../addresses/create-address.controller.js'
import { CONTACT_PARTY } from '../addresses/parties.js'
import { consignmentContactSelectPage as page } from './page.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

export const meta = { ...page, collects: ['contactAddress'] }
const view = `${TEMPLATES}/features/contact/template`

const copy = copyFor({ en, cy })

const HTTP_STATUS_BAD_REQUEST = 400

const fields = () =>
  compose(
    oneOf(
      'contactAddress',
      addressBook.parties('contact').map((option) => option.id),
      copy.errors.contactRequired
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
      backLink: hubPath(journey.journeyId),
      journey
    }),
    copy,
    errors,
    errorSummary: kit.errorSummary(errors),
    createAddressHref: pagePath(
      journey.journeyId,
      `${CREATE_ADDRESS_SLUG}?for=${CONTACT_PARTY.id}`
    ),
    contactOptions: addressBook.parties('contact').map((option) => ({
      value: option.id,
      text: option.name,
      hint: { text: addressSummary(option.address) },
      checked: option.name === values.selectedName
    }))
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, { selectedName: answers.contactAddress?.name })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const { errors } = validate(fields(), payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, {}, errors).code(HTTP_STATUS_BAD_REQUEST)
  }

  const chosen = addressBook.party('contact', payload.contactAddress)
  const { scope } = chosen
    ? await state.commit(request, h, {
        contactAddress: { name: chosen.name, address: { ...chosen.address } }
      })
    : await state.get(request, h)
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })

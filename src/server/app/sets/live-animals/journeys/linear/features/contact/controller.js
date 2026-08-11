import { hubPath, pagePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import {
  compose,
  oneOf,
  validate
} from '../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as addressBook from '../../../../../../services/address-book/index.js'
import { CREATE_ADDRESS_SLUG } from '../addresses/create-address/create-address.controller.js'
import { CONTACT_PARTY } from '../addresses/parties.js'
import { organisationIdOf } from '../addresses/resolve-parties.js'
import { addressText } from '../addresses/party-picker/view-model/address-lines.js'
import { consignmentContactSelectPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

export const meta = { ...page, collects: ['contactAddress'] }
const view = `${TEMPLATES}/features/contact/template`

const copy = copyFor({ en, cy })

const fields = (options) =>
  compose(
    // Contact is mandatory as an obligation, but Save and continue with no
    // selection is allowed — the trader returns to the hub with the task
    // incomplete. Reject only values that are not in the offered list.
    oneOf(
      'contactAddress',
      options.map((option) => option.id),
      copy.errors.contactRequired
    )
  )

const addressSummary = (address) =>
  [addressText(address), address.country].filter(Boolean).join(', ')

const render = (
  h,
  journey,
  values,
  options,
  errors = {},
  recoverableError = false
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(journey.journeyId),
      journey,
      recoverableError
    }),
    copy,
    errors,
    errorSummary: kit.errorSummary(errors),
    createAddressHref: pagePath(
      journey.journeyId,
      `${CREATE_ADDRESS_SLUG}?for=${CONTACT_PARTY.id}`
    ),
    contactOptions: options.map((option) => ({
      value: option.id,
      text: option.name,
      hint: { text: addressSummary(option.address) },
      checked: option.id === values.selectedId
    }))
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  const orgId = organisationIdOf(request)
  return render(h, journey, { selectedId: answers.contactAddress?.addressId }, [
    ...(await addressBook.all(orgId))
  ])
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const orgId = organisationIdOf(request)
  const options = await addressBook.all(orgId)
  const { errors } = validate(fields(options), payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, {}, options, errors).code(HTTP_STATUS_BAD_REQUEST)
  }

  const chosen = payload.contactAddress
    ? await addressBook.party(orgId, payload.contactAddress)
    : undefined
  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      // The reference, not a copy (AC3).
      committed = chosen
        ? await state.commit(request, h, {
            contactAddress: { addressId: chosen.id }
          })
        : await state.get(request, h)
    },
    async () => {
      const { journey } = await state.get(request, h)
      return render(
        h,
        journey,
        { selectedId: chosen?.id },
        options,
        {},
        true
      ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    }
  )
  if (failure) {
    return failure
  }

  const { scope } = committed
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })

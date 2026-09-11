import { hubPath } from '../../../../../../shared/paths.js'
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
import { copy as sharedEn } from '../../../../../../shared/copy.en.js'
import { copy as sharedCy } from '../../../../../../shared/copy.cy.js'
import * as addressBook from '../../../../../../services/address-book/index.js'
import { CONTACT_PARTY } from '../addresses/parties.js'
import { organisationIdOf } from '../addresses/resolve-parties.js'
import { addressText } from '../addresses/party-picker/view-model/address-lines.js'
import { answerFor } from '../addresses/party-picker/selection.js'
import { isStubMode } from '../../../../../../../common/services/mode.js'
import { buildInsAddAddressUrl } from '../addresses/ins-handshake.js'
import { copy as addressesEn } from '../addresses/copy/copy.en.js'
import { copy as addressesCy } from '../addresses/copy/copy.cy.js'
import { consignmentContactSelectPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

export const meta = { ...page, collects: ['contactAddress'] }
const view = `${TEMPLATES}/features/contact/template`

const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })
const addressesCopy = copyFor({ en: addressesEn, cy: addressesCy }).picker

const handshakeErrorMessage = (code) => {
  if (code === 'not-found') {
    return addressesCopy.handshakeErrors.notFound
  }
  if (code === 'unavailable') {
    return addressesCopy.handshakeErrors.unavailable
  }
  return undefined
}

const handshakeErrorSummary = (error) =>
  error
    ? {
        titleText: sharedCopy.errorSummary.title,
        errorList: [{ text: error, href: '#contactAddress' }]
      }
    : null

const resolveErrorSummary = (errors, handshakeError) =>
  kit.errorSummary(errors) ?? handshakeErrorSummary(handshakeError)

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

const addAddressLinkFor = (journey) =>
  !isStubMode() && buildInsAddAddressUrl(journey.journeyId, CONTACT_PARTY)

const render = (
  h,
  journey,
  values,
  options,
  addAddressHref,
  { errors = {}, recoverableError = false, handshakeError } = {}
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(journey.journeyId),
      journey,
      recoverableError
    }),
    copy,
    errors,
    errorSummary: resolveErrorSummary(errors, handshakeError),
    addAddressHref,
    addNewAddressLabel: addressesCopy.addNewAddress,
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
  const handshakeError = handshakeErrorMessage(request.query.handshakeError)
  const recoverableError = request.query.handshakeError === 'unavailable'
  return render(
    h,
    journey,
    { selectedId: answers.contactAddress?.addressId },
    [...(await addressBook.all(orgId))],
    addAddressLinkFor(journey),
    { recoverableError, handshakeError }
  )
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const orgId = organisationIdOf(request)
  const options = await addressBook.all(orgId)
  const { errors } = validate(fields(options), payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, {}, options, addAddressLinkFor(journey), {
      errors
    }).code(HTTP_STATUS_BAD_REQUEST)
  }

  const chosen = payload.contactAddress
    ? await addressBook.party(orgId, payload.contactAddress)
    : undefined
  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = chosen
        ? await state.commit(request, h, {
            contactAddress: answerFor(CONTACT_PARTY, chosen)
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
        addAddressLinkFor(journey),
        {
          recoverableError: true
        }
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

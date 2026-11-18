import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import { hasErrors } from '../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as addressBook from '../../../../../../services/address-book/index.js'
import { CONTACT_PARTY } from '../addresses/parties.js'
import { organisationIdOf } from '../../../../../../../common/helpers/organisation-id.js'
import { addressSummaryEndingAtPostcode } from '../addresses/address-summary.js'
import {
  answerFor,
  chosenPartyFor
} from '../addresses/party-picker/selection.js'
import { isStubMode } from '../../../../../../../common/services/mode.js'
import {
  issueInsAddAddressUrl,
  handshakeErrorMessage,
  takeAddedAddressBanner
} from '../addresses/ins-handshake.js'
import { consignmentContactSelectPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { copy as addressesEn } from '../addresses/copy/copy.en.js'
import { copy as addressesCy } from '../addresses/copy/copy.cy.js'
import { validation } from './validate.js'

export const meta = { ...page, collects: ['contactAddress'], validation }
const view = `${TEMPLATES}/features/contact/template`

const copy = copyFor({ en, cy })
const resultsHeading = copyFor({ en: addressesEn, cy: addressesCy }).picker
  .resultsHeading

const handshakeErrorSummary = (error) =>
  error
    ? {
        titleText: kit.sharedCopy.errorSummary.title,
        errorList: [{ text: error, href: '#contactAddress' }]
      }
    : null

const resolveErrorSummary = (errors, handshakeError) =>
  kit.errorSummary(errors) ?? handshakeErrorSummary(handshakeError)

const issueAddAddressLink = (request, h, journey) =>
  !isStubMode() &&
  issueInsAddAddressUrl(request, h, journey.journeyId, CONTACT_PARTY)

const render = (
  request,
  h,
  current,
  values,
  options,
  addAddressHref,
  {
    errors = {},
    recoverableError = false,
    handshakeError,
    successBanner = null
  } = {}
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: kit.trailBackLink(request),
      journey: current.journey,
      recoverableError,
      successBanner
    }),
    copy,
    resultsHeading,
    errors,
    errorSummary: resolveErrorSummary(errors, handshakeError),
    addAddressHref,
    contactOptions: options.map((option) => ({
      value: option.id,
      text: option.name,
      hint: { text: addressSummaryEndingAtPostcode(option.address) },
      checked: option.id === values.selectedId
    }))
  })

const offeredAddresses = (orgId) =>
  addressBook.addresses(orgId, { role: CONTACT_PARTY.addressBookRole })

const offeredAddress = async (orgId, addressId) => {
  const chosen = await chosenPartyFor(orgId, addressId)
  return chosen && addressBook.holdsRole(chosen, CONTACT_PARTY.addressBookRole)
    ? chosen
    : undefined
}

const get = async (request, h) => {
  const current = await state.get(request, h)
  const { journey, answers } = current
  const orgId = organisationIdOf(request)
  const options = [...(await offeredAddresses(orgId))]
  const { errors } = await validation.onStored(answers, {
    addressOptions: options
  })
  const pickedFromId = answers.contactAddress?.pickedFromId
  const handshakeError = handshakeErrorMessage(
    kit.sharedCopy.addressHandshake.errors,
    request.query.handshakeError
  )
  const recoverableError = request.query.handshakeError === 'unavailable'
  return render(
    request,
    h,
    current,
    {
      selectedId: options.some((option) => option.id === pickedFromId)
        ? pickedFromId
        : ''
    },
    options,
    issueAddAddressLink(request, h, journey),
    {
      errors,
      recoverableError,
      handshakeError,
      successBanner: takeAddedAddressBanner(request, h)
    }
  )
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const orgId = organisationIdOf(request)
  const chosen = payload.contactAddress
    ? await offeredAddress(orgId, payload.contactAddress)
    : undefined
  const { errors } = await validation.onSubmit(payload, {
    addressOptions: chosen ? [chosen] : []
  })
  if (hasErrors(errors)) {
    const current = await state.get(request, h)
    return render(
      request,
      h,
      current,
      {},
      await offeredAddresses(orgId),
      issueAddAddressLink(request, h, current.journey),
      { errors }
    ).code(HTTP_STATUS_BAD_REQUEST)
  }

  const { value: committed, failure } = await kit.recoverableSave(
    request,
    () =>
      chosen
        ? state.commit(request, h, {
            contactAddress: answerFor(CONTACT_PARTY, chosen)
          })
        : state.get(request, h),
    async () => {
      const current = await state.get(request, h)
      return render(
        request,
        h,
        current,
        { selectedId: chosen?.id },
        await offeredAddresses(orgId),
        issueAddAddressLink(request, h, current.journey),
        { recoverableError: true }
      ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    }
  )
  if (failure) {
    return failure
  }

  const { scope } = committed
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })

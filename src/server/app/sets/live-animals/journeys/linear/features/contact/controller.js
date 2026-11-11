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
import { addressSummary } from '../addresses/address-summary.js'
import { answerFor } from '../addresses/party-picker/selection.js'
import { toDisplayParty } from '../addresses/frozen-parties.js'
import { partyEditHref } from '../addresses/party-edit/edit-href.js'
import { isStubMode } from '../../../../../../../common/services/mode.js'
import {
  issueInsAddAddressUrl,
  handshakeErrorMessage,
  takeAddedAddressBanner
} from '../addresses/ins-handshake.js'
import { consignmentContactSelectPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { validation } from './validate.js'

export const meta = { ...page, collects: ['contactAddress'], validation }
const view = `${TEMPLATES}/features/contact/template`

const copy = copyFor({ en, cy })

const handshakeErrorSummary = (error) =>
  error
    ? {
        titleText: kit.sharedCopy.errorSummary.title,
        errorList: [{ text: error, href: '#contactAddress' }]
      }
    : null

const resolveErrorSummary = (errors, handshakeError) =>
  kit.errorSummary(errors) ?? handshakeErrorSummary(handshakeError)

const currentContactOf = async (request, journeyId, answers) => {
  const display = await toDisplayParty(answers.contactAddress)
  return display
    ? {
        name: display.name,
        summary: addressSummary(display.address),
        editHref: partyEditHref(
          journeyId,
          CONTACT_PARTY,
          page.slug,
          kit.requestTrail(request)
        )
      }
    : null
}

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
    currentContact = null,
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
    errors,
    errorSummary: resolveErrorSummary(errors, handshakeError),
    addAddressHref,
    addNewAddressLabel: kit.sharedCopy.addressHandshake.addNewAddress,
    currentContact,
    contactOptions: options.map((option) => ({
      value: option.id,
      text: option.name,
      hint: { text: addressSummary(option.address) },
      checked: option.id === values.selectedId
    }))
  })

const get = async (request, h) => {
  const current = await state.get(request, h)
  const { journey, answers } = current
  const orgId = organisationIdOf(request)
  const options = [...(await addressBook.all(orgId))]
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
      currentContact: await currentContactOf(
        request,
        journey.journeyId,
        answers
      ),
      successBanner: takeAddedAddressBanner(request, h)
    }
  )
}

const loadLiveAddress = async (orgId, addressId) => {
  const record = await addressBook.party(orgId, addressId)
  return record?.deleted ? undefined : record
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const orgId = organisationIdOf(request)
  const chosen = payload.contactAddress
    ? await loadLiveAddress(orgId, payload.contactAddress)
    : undefined
  const { errors } = await validation.onSubmit(payload, {
    addressOptions: chosen ? [chosen] : []
  })
  if (hasErrors(errors)) {
    const current = await state.get(request, h)
    const { journey, answers } = current
    return render(
      request,
      h,
      current,
      {},
      await addressBook.all(orgId),
      issueAddAddressLink(request, h, journey),
      {
        errors,
        currentContact: await currentContactOf(
          request,
          journey.journeyId,
          answers
        )
      }
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
      const { journey, answers } = current
      return render(
        request,
        h,
        current,
        { selectedId: chosen?.id },
        await addressBook.all(orgId),
        issueAddAddressLink(request, h, journey),
        {
          recoverableError: true,
          currentContact: await currentContactOf(
            request,
            journey.journeyId,
            answers
          )
        }
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

import { hubPath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import { hasErrors } from '../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as sharedEn } from '../../../../../../shared/copy.en.js'
import { copy as sharedCy } from '../../../../../../shared/copy.cy.js'
import * as addressBook from '../../../../../../services/address-book/index.js'
import { CONTACT_PARTY } from '../addresses/parties.js'
import { organisationIdOf } from '../../../../../../../common/helpers/organisation-id.js'
import { addressText } from '../addresses/party-picker/view-model/address-lines.js'
import { answerFor } from '../addresses/party-picker/selection.js'
import { toDisplayParty } from '../addresses/frozen-parties.js'
import { partyEditHref } from '../addresses/party-edit/edit-href.js'
import { isStubMode } from '../../../../../../../common/services/mode.js'
import {
  buildInsAddAddressUrl,
  handshakeErrorMessage
} from '../addresses/ins-handshake.js'
import { consignmentContactSelectPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { validation } from './validate.js'

export const meta = { ...page, collects: ['contactAddress'], validation }
const view = `${TEMPLATES}/features/contact/template`

const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const handshakeErrorSummary = (error) =>
  error
    ? {
        titleText: sharedCopy.errorSummary.title,
        errorList: [{ text: error, href: '#contactAddress' }]
      }
    : null

const resolveErrorSummary = (errors, handshakeError) =>
  kit.errorSummary(errors) ?? handshakeErrorSummary(handshakeError)

const addressSummary = (address) =>
  [addressText(address), address.country].filter(Boolean).join(', ')

/** The contact already copied onto this notification, with the link to edit
 * its details here — the picker below only ever replaces it. */
const currentContactOf = async (request, journeyId, answers) => {
  const display = await toDisplayParty(answers.contactAddress)
  return display
    ? {
        name: display.name,
        summary: addressSummary(display.address),
        editHref: partyEditHref(journeyId, CONTACT_PARTY, page.slug, {
          change: kit.changeContext(request)
        })
      }
    : null
}

const addAddressLinkFor = (request, h, journey) =>
  !isStubMode() &&
  buildInsAddAddressUrl(request, h, journey.journeyId, CONTACT_PARTY)

const render = (
  h,
  journey,
  values,
  options,
  addAddressHref,
  {
    errors = {},
    recoverableError = false,
    handshakeError,
    currentContact = null
  } = {}
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
    addNewAddressLabel: sharedCopy.addressHandshake.addNewAddress,
    currentContact,
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
  const options = [...(await addressBook.all(orgId))]
  const { values, errors } = await validation.onStored(answers, {
    addressOptions: options
  })
  const handshakeError = handshakeErrorMessage(
    sharedCopy.addressHandshake.errors,
    request.query.handshakeError
  )
  const recoverableError = request.query.handshakeError === 'unavailable'
  return render(
    h,
    journey,
    { selectedId: values.contactAddress },
    options,
    addAddressLinkFor(request, h, journey),
    {
      errors,
      recoverableError,
      handshakeError,
      currentContact: await currentContactOf(
        request,
        journey.journeyId,
        answers
      )
    }
  )
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const orgId = organisationIdOf(request)
  const options = await addressBook.all(orgId)
  const { errors } = await validation.onSubmit(payload, {
    addressOptions: options
  })
  if (hasErrors(errors)) {
    const { journey, answers } = await state.get(request, h)
    return render(
      h,
      journey,
      {},
      options,
      addAddressLinkFor(request, h, journey),
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
      const { journey, answers } = await state.get(request, h)
      return render(
        h,
        journey,
        { selectedId: chosen?.id },
        options,
        addAddressLinkFor(request, h, journey),
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
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })

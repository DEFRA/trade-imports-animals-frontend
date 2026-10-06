import { pagePath } from '../../../../../../../shared/paths.js'
import { TEMPLATES } from '../../../config.js'
import * as state from '../../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../../lib/http-status.js'
import { validate } from '../../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { addressBookCountries } from '../../../../../../../services/countries/index.js'
import { CONTACT_PARTY, PARTIES } from '../parties.js'
import {
  addressRules,
  FIELDS,
  formValuesOf,
  partyFrom
} from './address-rules.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const view = `${TEMPLATES}/features/addresses/party-edit/party-edit`

const copy = copyFor({ en, cy })

const EDITABLE_PARTIES = [...PARTIES, CONTACT_PARTY]

/** Where the trader came from, so Save, Cancel and Back all go back there. A
 * closed list rather than a free path: the value arrives in the query string. */
const RETURN_SLUGS = ['addresses', kit.CYA_SLUG, CONTACT_PARTY.slug]

const returnHref = (request, party) => {
  const slug = RETURN_SLUGS.includes(request.query.return)
    ? request.query.return
    : party.returnSlug
  return kit.withChangeContext(
    request,
    pagePath(request.params.journeyId, slug)
  )
}

const countryItemsOf = (countries) => [
  { value: '', text: copy.countryPlaceholder },
  ...countries.map(({ code, name }) => ({ value: code, text: name }))
]

const render = async (
  request,
  h,
  journey,
  party,
  { values, errors = {}, recoverableError = false }
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: returnHref(request, party),
      journey,
      recoverableError
    }),
    copy,
    partyTitle: party.title,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryItems: countryItemsOf(await addressBookCountries())
  })

const valuesFrom = (payload = {}) =>
  Object.fromEntries(FIELDS.map((field) => [field, payload[field] ?? '']))

const get = (party) => async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  // Nothing has been copied yet, so there is nothing to edit — pick one first.
  if (!answers[party.id]) {
    return h.redirect(
      kit.withChangeContext(request, pagePath(journey.journeyId, party.slug))
    )
  }
  return render(request, h, journey, party, {
    values: formValuesOf(answers[party.id])
  })
}

const post = (party) => async (request, h) => {
  const payload = request.payload ?? {}
  if (payload.cancel) {
    return h.redirect(returnHref(request, party))
  }

  const { journey, answers } = await state.get(request, h)
  // Same guard as get: an edit can only change a copy the picker made.
  if (!answers[party.id]) {
    return h.redirect(
      kit.withChangeContext(request, pagePath(journey.journeyId, party.slug))
    )
  }

  const values = valuesFrom(payload)
  const countries = await addressBookCountries()
  const { errors, value } = validate(
    addressRules(countries.map(({ code }) => code)),
    values
  )
  if (errors) {
    return (await render(request, h, journey, party, { values, errors })).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  const { failure } = await kit.recoverableSave(
    async () => {
      await state.commit(request, h, { [party.id]: partyFrom(value) })
    },
    async () =>
      (
        await render(request, h, journey, party, {
          values,
          recoverableError: true
        })
      ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) {
    return failure
  }

  return h.redirect(returnHref(request, party))
}

export const routes = EDITABLE_PARTIES.flatMap((party) =>
  kit.pageRoutes(
    { slug: party.editSlug },
    { get: get(party), post: post(party) }
  )
)

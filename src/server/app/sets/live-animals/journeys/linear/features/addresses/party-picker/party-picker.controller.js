import { pagePath, pageRoutePath } from '../../../../../../../shared/paths.js'
import { TEMPLATES } from '../../../config.js'
import * as state from '../../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../../lib/http-status.js'
import * as kit from '../../../../../../../shared/kit.js'
import { routeOptions } from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as sharedEn } from '../../../../../../../shared/copy.en.js'
import { copy as sharedCy } from '../../../../../../../shared/copy.cy.js'
import * as addressBook from '../../../../../../../services/address-book/index.js'
import { PARTIES } from '../parties.js'
import { organisationIdOf } from '../resolve-parties.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { isSearchAction, pageNumber } from './request-params.js'
import { answerFor, chosenPartyFor, committedId } from './selection.js'
import { pickerViewModel } from './view-model/index.js'
import { errorSummary } from './view-model/error-summary.js'

const view = `${TEMPLATES}/features/addresses/party-picker/party-picker`

const copy = copyFor({ en, cy }).picker
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const render = async (
  h,
  orgId,
  journey,
  party,
  { query, page, selectedId, error, recoverableError = false }
) => {
  // One book for every role — addresses have no type (D3).
  const found = await addressBook.search(orgId, { query, page })
  const selected = await chosenPartyFor(orgId, selectedId)
  // A deleted/missing reference must not travel as "Selected: …" or in
  // pagination links — treat it as no selection (same as resolveOne).
  const effectiveSelectedId = selected ? selectedId : ''

  return h.view(view, {
    ...kit.base(party.title, {
      backLink: pagePath(journey.journeyId, 'addresses'),
      journey,
      recoverableError
    }),
    heading: party.title,
    description: party.hint,
    pickerCopy: copy,
    errorSummary: errorSummary(error, found.results.length > 0, sharedCopy),
    picker: pickerViewModel(
      journey,
      party,
      { query, selectedId: effectiveSelectedId, error, found, selected },
      copy
    )
  })
}

const get = (party) => async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, organisationIdOf(request), journey, party, {
    query: request.query.q ?? '',
    page: pageNumber(request.query.page),
    selectedId: request.query.selected ?? committedId(answers, party)
  })
}

const commitSelection = async (request, h, party, chosen, form) => {
  const { failure } = await kit.recoverableSave(
    async () => {
      await state.commit(request, h, {
        [party.id]: answerFor(party, chosen)
      })
    },
    async () => {
      const { journey } = await state.get(request, h)
      return (
        await render(h, organisationIdOf(request), journey, party, {
          ...form,
          selectedId: chosen.id,
          recoverableError: true
        })
      ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    }
  )
  if (failure) {
    return failure
  }

  return h.redirect(pagePath(request.params.journeyId, 'addresses'))
}

const post = (party) => async (request, h) => {
  const payload = request.payload ?? {}
  const query = payload.q ?? ''
  const selectedId = payload.party || payload.selected || ''
  const orgId = organisationIdOf(request)

  if (isSearchAction(payload)) {
    const { journey } = await state.get(request, h)
    return render(h, orgId, journey, party, { query, page: 1, selectedId })
  }

  const chosen = await chosenPartyFor(orgId, selectedId)
  if (!chosen) {
    const { journey } = await state.get(request, h)
    return (
      await render(h, orgId, journey, party, {
        query,
        page: pageNumber(payload.page),
        selectedId: '',
        error: party.error
      })
    ).code(HTTP_STATUS_BAD_REQUEST)
  }

  return commitSelection(request, h, party, chosen, {
    query,
    page: pageNumber(payload.page)
  })
}

export const routes = PARTIES.flatMap((party) => [
  {
    method: 'GET',
    path: pageRoutePath(party.slug),
    options: routeOptions,
    handler: get(party)
  },
  {
    method: 'POST',
    path: pageRoutePath(party.slug),
    options: routeOptions,
    handler: post(party)
  }
])

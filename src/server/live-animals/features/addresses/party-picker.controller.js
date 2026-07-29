import { pagePath, pageRoutePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../lib/http-status.js'
import * as kit from '../../shared/kit.js'
import { routeOptions } from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import { copy as sharedEn } from '../../shared/copy.en.js'
import { copy as sharedCy } from '../../shared/copy.cy.js'
import * as addressBook from '../../services/address-book/index.js'
import { PARTIES } from './parties.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'
import { isSearchAction, pageNumber } from './party-picker/request-params.js'
import { chosenPartyFor, committedId } from './party-picker/selection.js'
import { pickerViewModel } from './party-picker/view-model/index.js'
import { errorSummary } from './party-picker/view-model/error-summary.js'

const view = `${TEMPLATES}/features/addresses/party-picker`

const copy = copyFor({ en, cy }).picker
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const render = (
  h,
  journey,
  party,
  { query, page, selectedId, error, recoverableError = false }
) => {
  const found = addressBook.search(party.role, { query, page })
  const selected = selectedId
    ? addressBook.party(party.role, selectedId)
    : undefined

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
      { query, selectedId, error, found, selected },
      copy
    )
  })
}

const get = (party) => async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, party, {
    query: request.query.q ?? '',
    page: pageNumber(request.query.page),
    selectedId: request.query.selected ?? committedId(answers, party)
  })
}

const commitSelection = async (request, h, party, chosen, form) => {
  const failure = await kit.recoverableSave(
    async () => {
      await state.commit(request, h, {
        [party.id]: { name: chosen.name, address: { ...chosen.address } }
      })
    },
    async () => {
      const { journey } = await state.get(request, h)
      return render(h, journey, party, {
        ...form,
        selectedId: chosen.id,
        recoverableError: true
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    }
  )
  if (failure) return failure

  return h.redirect(pagePath(request.params.journeyId, 'addresses'))
}

const post = (party) => async (request, h) => {
  const payload = request.payload ?? {}
  const query = payload.q ?? ''
  const selectedId = payload.party || payload.selected || ''

  if (isSearchAction(payload)) {
    const { journey } = await state.get(request, h)
    return render(h, journey, party, { query, page: 1, selectedId })
  }

  const chosen = chosenPartyFor(party, selectedId)
  if (!chosen) {
    const { journey } = await state.get(request, h)
    return render(h, journey, party, {
      query,
      page: pageNumber(payload.page),
      selectedId: '',
      error: party.error
    }).code(HTTP_STATUS_BAD_REQUEST)
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

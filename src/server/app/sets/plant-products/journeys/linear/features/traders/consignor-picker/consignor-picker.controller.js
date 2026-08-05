import * as state from '../../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../../lib/http-status.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as sharedCy } from '../../../../../../../shared/copy.cy.js'
import { copy as sharedEn } from '../../../../../../../shared/copy.en.js'
import * as kit from '../../../../../../../shared/kit.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import { writeSelection } from '../../../../../services/address-book/session-store.js'
import { TEMPLATES } from '../../../config.js'
import { copy as cy } from '../copy/copy.cy.js'
import { copy as en } from '../copy/copy.en.js'
import { consignorPickerPage as page, tradersAddressesPage } from '../page.js'
import { candidates, searchCandidates } from './candidates.js'
import { isSearchAction, pageNumber } from './request-params.js'
import { chosenFor, selectedId } from './selection.js'
import { errorSummary } from './view-model/error-summary.js'
import { pickerViewModel } from './view-model/index.js'

// consignor-create owns all nine consignor obligations, so the picker claims
// none of them. It still writes them — the engine validates committed keys
// against recognised obligation names, not against meta.collects — and keeping
// ownership put is what keeps every check-answers Change link on the form.
export const meta = { ...page, collects: [] }

const view = `${TEMPLATES}/features/traders/consignor-picker/consignor-picker`
const copy = copyFor({ en, cy }).consignorPicker
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const optionalValue = (value) => value || undefined

const consignorAnswers = (chosen) => ({
  consignorName: chosen.name,
  consignorAddressLine1: chosen.address.addressLine1,
  consignorAddressLine2: optionalValue(chosen.address.addressLine2),
  consignorAddressLine3: optionalValue(chosen.address.addressLine3),
  consignorCity: chosen.address.city,
  consignorPostcode: optionalValue(chosen.address.postcode),
  consignorTelephone: optionalValue(chosen.telephone),
  consignorCountry: chosen.address.country,
  consignorEmail: optionalValue(chosen.email)
})

const render = async (
  h,
  { request, journey, answers },
  {
    query = '',
    currentPage = 1,
    selectedId: selected,
    error,
    recoverableError = false
  } = {}
) => {
  const found = await searchCandidates(request, answers, {
    query,
    page: currentPage
  })

  return h.view(view, {
    ...kit.base(copy.pageTitle, {
      backLink: pagePath(journey.journeyId, tradersAddressesPage.slug),
      journey,
      recoverableError
    }),
    copy,
    errorSummary: errorSummary(error, found.results.length > 0, sharedCopy),
    picker: pickerViewModel(
      journey,
      {
        found,
        query,
        selectedId: selected,
        // Resolved against the unpaged list so a record picked on another page
        // still names itself and still travels in the hidden field.
        selected: await chosenFor(request, answers, selected),
        error
      },
      copy
    )
  })
}

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  const records = await candidates(request, answers)

  return render(
    h,
    { request, journey, answers },
    {
      query: request.query.q ?? '',
      currentPage: pageNumber(request.query.page),
      selectedId: selectedId(request, journey.journeyId, answers, records)
    }
  )
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const query = payload.q ?? ''
  const postedId = payload.party || payload.selected || ''
  const { journey, answers } = await state.get(request, h)
  const context = { request, journey, answers }

  // Search and Save are the same form; only the button's action tells them
  // apart. A search commits nothing and returns to the first page of results.
  if (isSearchAction(payload)) {
    return render(h, context, { query, currentPage: 1, selectedId: postedId })
  }

  const chosen = await chosenFor(request, answers, postedId)

  if (!chosen) {
    const rendered = await render(h, context, {
      query,
      currentPage: pageNumber(payload.page),
      selectedId: '',
      error: copy.errors.required
    })
    return rendered.code(HTTP_STATUS_BAD_REQUEST)
  }

  const { failure } = await kit.recoverableSave(
    async () => {
      await state.commit(request, h, consignorAnswers(chosen))
    },
    async () => {
      const rendered = await render(h, context, {
        query,
        currentPage: pageNumber(payload.page),
        selectedId: chosen.id,
        recoverableError: true
      })
      return rendered.code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    }
  )
  if (failure) {
    return failure
  }

  writeSelection(request, journey.journeyId, chosen.id)

  // Not kit.nextTarget: the next page in the traders section is the create
  // form, which is exactly where a user who just picked should not land.
  const target =
    kit.hubExitTarget(request) ??
    pagePath(request.params.journeyId, tradersAddressesPage.slug)
  return h.redirect(kit.withChangeContext(request, target))
}

export const routes = kit.pageRoutes(page, { get, post })

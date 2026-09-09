import { hubPath } from '../../../../../../../shared/paths.js'
import { TEMPLATES } from '../../../config.js'
import * as state from '../../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../../lib/http-status.js'
import * as kit from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as countries from '../../../../../../../services/countries/index.js'
import { transitCountriesPage as page } from '../page.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { ADD_ACTION, isRemoveAction, removeCodeOf } from './remove-action.js'
import { countryRows } from './rows.js'

export const meta = { ...page, collects: ['transitedCountries'] }
const view = `${TEMPLATES}/features/transport/transit-countries/transit-countries`

export const MAX_TRANSITED_COUNTRIES = 12

/** The one error key on this page. The trader adds and removes through the
 * search box, so every message this page can show is a message about that
 * control — which is where the error summary has to send them. */
export const COUNTRY_FIELD = 'transitedCountry'

const copy = copyFor({ en, cy }).transitCountries

// The list feeds a type-ahead that enhances this select, so it carries only the
// placeholder and the real countries. Countries already added stay in the list:
// the server refuses a repeat by name, which says more than a country quietly
// missing from the search would.
const countryItems = () => [
  { value: '', text: copy.country.placeholder },
  ...countries.originCountries()
]

const labelOf = (code) => countries.originLabel(code)

// The offered list, not the label lookup: `originLabel` resolves GB to
// "United Kingdom" for address forms, but GB is not a country this page
// offers — the copy above the control says so.
const isOffered = (code) =>
  countries.originCountries().some((country) => country.value === code)

// The saved answer, not the page: these are the guards against a submitted list
// that no rendering of this page could have produced. An EMPTY list is not one
// of them — the question is optional (design release 1), so continuing without
// adding a country saves the empty list and moves on.
const transitedCountriesErrors = (selected) => {
  if (selected.some((code) => !isOffered(code))) {
    return { [COUNTRY_FIELD]: copy.errors.fromList }
  }
  if (selected.length > MAX_TRANSITED_COUNTRIES) {
    return {
      [COUNTRY_FIELD]: copy.errors.maxCountries(MAX_TRANSITED_COUNTRIES)
    }
  }
  return {}
}

const render = (
  h,
  journey,
  selected,
  { errors = {}, status = '', chosen = '', recoverableError = false } = {}
) => {
  // A code the list does not contain could only have arrived by tampering. It
  // is refused by the guards above; it is not rendered back.
  const known = selected.filter(isOffered)
  return h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(journey.journeyId),
      journey,
      page,
      recoverableError
    }),
    copy,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryItems: countryItems(),
    selectedCountries: known,
    countryRows: countryRows(known, labelOf),
    hasCountries: known.length > 0,
    // At the cap the search goes and the limit message takes its place, so a
    // thirteenth country cannot be offered at all. An error state keeps the
    // search on screen whatever the count, or the summary link would point at
    // a control that is not there.
    showCountryField:
      Object.keys(errors).length > 0 || known.length < MAX_TRANSITED_COUNTRIES,
    atLimit: known.length >= MAX_TRANSITED_COUNTRIES,
    limitMessage: copy.limitReached(MAX_TRANSITED_COUNTRIES),
    // A refused country goes back into the search box the trader typed it
    // into: the native select holds the code, the enhanced input the name.
    chosenValue: chosen,
    chosenLabel: labelOf(chosen) ?? '',
    status
  })
}

// The page carries its own working list in hidden inputs: nothing is saved
// until the trader continues, so adding and removing costs no write and a
// trader who leaves without saving leaves the answer as they found it.
const selectedFrom = (payload) => [
  ...new Set(
    [payload.transitedCountries ?? []].flat().filter((code) => code !== '')
  )
]

// Announced as it happens, on top of the row appearing (design release 1).
// Reaching the cap is said in the same breath as the country that reached it.
const statusFor = (message, selected) =>
  selected.length >= MAX_TRANSITED_COUNTRIES
    ? `${message} ${copy.limitReached(MAX_TRANSITED_COUNTRIES)}`
    : message

const addErrors = (chosen, selected) => {
  if (chosen === '') {
    return { [COUNTRY_FIELD]: copy.errors.chooseCountry }
  }
  if (!isOffered(chosen)) {
    return { [COUNTRY_FIELD]: copy.errors.fromList }
  }
  if (selected.includes(chosen)) {
    return { [COUNTRY_FIELD]: copy.errors.alreadyAdded(labelOf(chosen)) }
  }
  if (selected.length >= MAX_TRANSITED_COUNTRIES) {
    return {
      [COUNTRY_FIELD]: copy.errors.maxCountries(MAX_TRANSITED_COUNTRIES)
    }
  }
  return {}
}

const postAdd = async (request, h, selected) => {
  const chosen = String(request.payload?.[COUNTRY_FIELD] ?? '').trim()
  const { journey } = await state.get(request, h)
  const errors = addErrors(chosen, selected)
  if (Object.keys(errors).length > 0) {
    return render(h, journey, selected, { errors, chosen }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }
  const added = [...selected, chosen]
  return render(h, journey, added, {
    status: statusFor(copy.added(labelOf(chosen)), added)
  })
}

const postRemove = async (request, h, selected, code) => {
  const { journey } = await state.get(request, h)
  const remaining = selected.filter((entry) => entry !== code)
  return render(h, journey, remaining, {
    status: copy.removed(labelOf(code) ?? code)
  })
}

const postContinue = async (request, h, selected) => {
  const errors = transitedCountriesErrors(selected)
  if (Object.keys(errors).length > 0) {
    const { journey } = await state.get(request, h)
    return render(h, journey, selected, { errors }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, {
        transitedCountries: selected
      })
    },
    async () => {
      const { journey } = await state.get(request, h)
      return render(h, journey, selected, { recoverableError: true }).code(
        HTTP_STATUS_INTERNAL_SERVER_ERROR
      )
    }
  )
  if (failure) {
    return failure
  }

  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, [answers.transitedCountries ?? []].flat())
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const action = String(payload.action ?? '')
  const selected = selectedFrom(payload)
  if (action === ADD_ACTION) {
    return postAdd(request, h, selected)
  }
  if (isRemoveAction(action)) {
    return postRemove(request, h, selected, removeCodeOf(action))
  }
  return postContinue(request, h, selected)
}

export const routes = kit.pageRoutes(page, { get, post })

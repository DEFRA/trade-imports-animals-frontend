import { hubPath } from '../../../../../../../shared/paths.js'
import { TEMPLATES } from '../../../config.js'
import * as state from '../../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../../lib/http-status.js'
import { hasErrors } from '../../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as countries from '../../../../../../../services/countries/index.js'
import { transitCountriesPage as page } from '../page.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { ADD_ACTION, isRemoveAction, removeCodeOf } from './remove-action.js'
import { countryRows } from './rows.js'
import {
  COUNTRY_FIELD,
  MAX_TRANSITED_COUNTRIES,
  offeredCodes,
  validation
} from './validate.js'

export const meta = {
  ...page,
  collects: ['transitedCountries'],
  validation
}
const view = `${TEMPLATES}/features/transport/transit-countries/transit-countries`

export { COUNTRY_FIELD, MAX_TRANSITED_COUNTRIES }

const copy = copyFor({ en, cy }).transitCountries

// The list feeds a type-ahead that enhances this select, so it carries only the
// placeholder and the real countries. Countries already added stay in the list:
// the server refuses a repeat by name, which says more than a country quietly
// missing from the search would.
const countryItems = async () => [
  { value: '', text: copy.country.placeholder },
  ...(await countries.originCountries())
]

const render = async (
  h,
  journey,
  selected,
  { errors = {}, status = '', chosen = '', recoverableError = false } = {}
) => {
  const offered = await offeredCodes()
  // A code the list does not contain could only have arrived by tampering. It
  // is refused by the guards above; it is not rendered back.
  const known = selected.filter((code) => offered.has(code))
  const knownLabels = await Promise.all(
    known.map(async (code) => (await countries.originLabel(code)) ?? code)
  )
  const chosenLabel = (await countries.originLabel(chosen)) ?? ''
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
    countryItems: await countryItems(),
    selectedCountries: known,
    countryRows: countryRows(known, (code) => {
      const index = known.indexOf(code)
      return knownLabels[index]
    }),
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
    chosenLabel,
    status
  })
}

// Announced as it happens, on top of the row appearing (design release 1).
// Reaching the cap is said in the same breath as the country that reached it.
const statusFor = (message, selected) =>
  selected.length >= MAX_TRANSITED_COUNTRIES
    ? `${message} ${copy.limitReached(MAX_TRANSITED_COUNTRIES)}`
    : message

const addErrors = async (chosen, selected) => {
  const offered = await offeredCodes()
  if (chosen === '') {
    return { [COUNTRY_FIELD]: copy.errors.chooseCountry }
  }
  if (!offered.has(chosen)) {
    return { [COUNTRY_FIELD]: copy.errors.fromList }
  }
  if (selected.includes(chosen)) {
    const chosenLabel = await countries.originLabel(chosen)
    return { [COUNTRY_FIELD]: copy.errors.alreadyAdded(chosenLabel) }
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
  const errors = await addErrors(chosen, selected)
  if (Object.keys(errors).length > 0) {
    return (await render(h, journey, selected, { errors, chosen })).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }
  const added = [...selected, chosen]
  const chosenLabel = await countries.originLabel(chosen)
  return render(h, journey, added, {
    status: statusFor(copy.added(chosenLabel), added)
  })
}

const postRemove = async (request, h, selected, code) => {
  const { journey } = await state.get(request, h)
  const remaining = selected.filter((entry) => entry !== code)
  const codeLabel = (await countries.originLabel(code)) ?? code
  return render(h, journey, remaining, {
    status: copy.removed(codeLabel)
  })
}

const postContinue = async (request, h, payload, selected) => {
  const { answers, errors } = await validation.onSubmit(payload)
  if (hasErrors(errors)) {
    const { journey } = await state.get(request, h)
    return (await render(h, journey, selected, { errors })).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, answers)
    },
    async () => {
      const { journey } = await state.get(request, h)
      return (
        await render(h, journey, selected, { recoverableError: true })
      ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    }
  )
  if (failure) {
    return failure
  }

  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

// The stored list goes back through the page's own rules. The render already
// filters stale codes out of the chip list; the banner tells the trader before
// the next Continue silently commits the filtered list.
const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  const { values, errors } = await validation.onStored(answers)
  return render(h, journey, values.transitedCountries, { errors })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const action = String(payload.action ?? '')
  const { transitedCountries: selected } = validation.fromPayload(payload)
  if (action === ADD_ACTION) {
    return postAdd(request, h, selected)
  }
  if (isRemoveAction(action)) {
    return postRemove(request, h, selected, removeCodeOf(action))
  }
  return postContinue(request, h, payload, selected)
}

export const routes = kit.pageRoutes(page, { get, post })

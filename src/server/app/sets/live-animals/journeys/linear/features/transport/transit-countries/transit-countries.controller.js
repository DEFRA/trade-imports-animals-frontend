import { TEMPLATES } from '../../../config.js'
import * as state from '../../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../../lib/http-status.js'
import { hasErrors } from '../../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../../shared/kit.js'
import { hubPath } from '../../../../../../../shared/paths.js'
import { pageAppliesTo } from '../../../../../../../flow/gates.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as countries from '../../../../../../../services/countries/index.js'
import { transitCountriesPage as page } from '../page.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { ADD_ACTION, isRemoveAction, removeCodeOf } from './remove-action.js'
import { countriesTable, countryRows } from './rows.js'
import {
  COUNTRY_FIELD,
  MAX_TRANSITED_COUNTRIES,
  TRANSIT_REFUSAL,
  isUsersOwnInputRefusal,
  loadOfferedCodes,
  offeredCodesOf,
  partitionByOffered,
  refusalMessage,
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

const render = async (
  request,
  h,
  current,
  selected,
  { errors = {}, status = '', chosen = '', recoverableError = false } = {}
) => {
  const options = await countries.countryAndSubdivisionOptionsNamedWithCountry()
  const offered = offeredCodesOf(options)
  const { offered: offeredSelected } = partitionByOffered(selected, offered)
  const offeredLabelled = await Promise.all(
    offeredSelected.map(async (code) => ({
      code,
      label: await countries.countryDisplayLabel(code)
    }))
  )
  const chosenLabel = offered.has(chosen)
    ? await countries.countryDisplayLabel(chosen)
    : ''
  const rows = countryRows(offeredLabelled)
  return h.view(view, {
    ...kit.base(copy.pageTitle, {
      backLink: await kit.runBackLink(request, page.id, current),
      journey: current.journey,
      page,
      recoverableError
    }),
    copy,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryItems: [{ value: '', text: copy.country.selectText }, ...options],
    selectedCountries: offeredSelected,
    countryRows: rows,
    countriesTable: countriesTable(rows, copy),
    hasCountries: offeredSelected.length > 0,
    showCountryField:
      Object.keys(errors).length > 0 ||
      offeredSelected.length < MAX_TRANSITED_COUNTRIES,
    atLimit: offeredSelected.length >= MAX_TRANSITED_COUNTRIES,
    limitMessage: copy.limitReached(MAX_TRANSITED_COUNTRIES),
    chosenValue: chosen,
    chosenLabel,
    status
  })
}

const withLimitNotice = (message, selected) =>
  selected.length >= MAX_TRANSITED_COUNTRIES
    ? `${message} ${copy.limitReached(MAX_TRANSITED_COUNTRIES)}`
    : message

const addRefusalReason = (chosen, selected, offered) => {
  if (chosen === '') {
    return TRANSIT_REFUSAL.nothingChosen
  }
  if (!offered.has(chosen)) {
    return TRANSIT_REFUSAL.notOnList
  }
  if (selected.includes(chosen)) {
    return TRANSIT_REFUSAL.alreadyAdded
  }
  if (selected.length >= MAX_TRANSITED_COUNTRIES) {
    return TRANSIT_REFUSAL.maxCountries
  }
  return null
}

const addRefusal = async (chosen, selected, offered) => {
  const reason = addRefusalReason(chosen, selected, offered)
  return reason && { reason, message: await refusalMessage(reason, chosen) }
}

const logRefusalUnlessUsersOwnInput = (
  request,
  refusal,
  { errors, chosen }
) => {
  if (!isUsersOwnInputRefusal(refusal.reason)) {
    kit.logRefusal(request, {
      fieldErrors: errors,
      reason: refusal.reason,
      code: chosen
    })
  }
}

const redirectToOverviewUnlessInScope = (request, h, current) => {
  if (pageAppliesTo(page, current.scope)) {
    return null
  }
  const { journeyId } = current.journey
  request.logger.info(
    {
      journeyId,
      reason: 'out-of-scope-for-means-of-transport',
      meansOfTransport: current.answers.meansOfTransport ?? 'none'
    },
    'Redirected to the overview: transit countries is out of scope for the means of transport'
  )
  return h.redirect(hubPath(journeyId))
}

const postAdd = async (request, h, current, selected) => {
  const chosen = String(request.payload?.[COUNTRY_FIELD] ?? '').trim()
  const offered = await loadOfferedCodes()
  const refusal = await addRefusal(chosen, selected, offered)
  if (refusal) {
    const errors = { [COUNTRY_FIELD]: refusal.message }
    logRefusalUnlessUsersOwnInput(request, refusal, { errors, chosen })
    return (
      await render(request, h, current, selected, { errors, chosen })
    ).code(HTTP_STATUS_BAD_REQUEST)
  }
  const added = [...selected, chosen]
  const chosenLabel = await countries.countryDisplayLabel(chosen)
  return render(request, h, current, added, {
    status: withLimitNotice(copy.added(chosenLabel), added)
  })
}

const postRemove = async (request, h, current, selected, code) => {
  const remaining = selected.filter((entry) => entry !== code)
  const codeLabel = await countries.countryDisplayLabel(code)
  return render(request, h, current, remaining, {
    status: copy.removed(codeLabel)
  })
}

const renderSaveUnavailable = async (request, h, current, selected) => {
  return (
    await render(request, h, current, selected, { recoverableError: true })
  ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
}

const postContinue = async (request, h, current, payload, selected) => {
  const { answers, errors, refusal } = await validation.onSubmit(payload)
  if (hasErrors(errors)) {
    kit.logRefusal(request, { fieldErrors: errors, ...refusal })
    return (await render(request, h, current, selected, { errors })).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  let committed
  const { failure } = await kit.recoverableSave(
    request,
    async () => {
      committed = await state.commit(request, h, answers)
    },
    () => renderSaveUnavailable(request, h, current, selected)
  )
  if (failure) {
    return failure
  }

  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

const get = async (request, h) => {
  const current = await state.get(request, h)
  const overviewRedirect = redirectToOverviewUnlessInScope(request, h, current)
  if (overviewRedirect) {
    return overviewRedirect
  }
  const { values, errors, refusal } = await validation.onStored(current.answers)
  if (hasErrors(errors)) {
    request.logger.info(
      { journeyId: current.journey.journeyId, ...refusal },
      'Stored transit countries refused: banner shown'
    )
  }
  return render(request, h, current, values.transitedCountries, { errors })
}

const post = async (request, h) => {
  const current = await state.get(request, h)
  const overviewRedirect = redirectToOverviewUnlessInScope(request, h, current)
  if (overviewRedirect) {
    return overviewRedirect
  }
  const payload = request.payload ?? {}
  const action = String(payload.action ?? '')
  const { transitedCountries: selected } = validation.fromPayload(payload)
  if (action === ADD_ACTION) {
    return postAdd(request, h, current, selected)
  }
  if (isRemoveAction(action)) {
    return postRemove(request, h, current, selected, removeCodeOf(action))
  }
  return postContinue(request, h, current, payload, selected)
}

export const routes = kit.pageRoutes(page, { get, post })

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
import { countriesTable, countryRows } from './rows.js'
import {
  COUNTRY_FIELD,
  MAX_TRANSITED_COUNTRIES,
  TRANSIT_REFUSAL,
  isUsersOwnInputRefusal,
  offeredCodes,
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

const countryItems = async () => [
  { value: '', text: copy.country.selectText },
  ...(await countries.originCountries())
]

const render = async (
  request,
  h,
  current,
  selected,
  { errors = {}, status = '', chosen = '', recoverableError = false } = {}
) => {
  const { offered: offeredSelected } = await partitionByOffered(selected)
  const offeredLabelled = await Promise.all(
    offeredSelected.map(async (code) => ({
      code,
      label: (await countries.originLabel(code)) ?? code
    }))
  )
  const chosenLabel = (await countries.originLabel(chosen)) ?? ''
  const rows = countryRows(offeredLabelled)
  return h.view(view, {
    ...kit.base(copy.title, {
      request,
      backLink: await kit.runBackLink(request, page.id, current),
      journey: current.journey,
      page,
      recoverableError
    }),
    copy,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryItems: await countryItems(),
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

const addRefusal = async (chosen, selected) => {
  const reason = addRefusalReason(chosen, selected, await offeredCodes())
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

const postAdd = async (request, h, selected) => {
  const chosen = String(request.payload?.[COUNTRY_FIELD] ?? '').trim()
  const current = await state.get(request, h)
  const refusal = await addRefusal(chosen, selected)
  if (refusal) {
    const errors = { [COUNTRY_FIELD]: refusal.message }
    logRefusalUnlessUsersOwnInput(request, refusal, { errors, chosen })
    return (
      await render(request, h, current, selected, { errors, chosen })
    ).code(HTTP_STATUS_BAD_REQUEST)
  }
  const added = [...selected, chosen]
  const chosenLabel = await countries.originLabel(chosen)
  return render(request, h, current, added, {
    status: withLimitNotice(copy.added(chosenLabel), added)
  })
}

const postRemove = async (request, h, selected, code) => {
  const current = await state.get(request, h)
  const remaining = selected.filter((entry) => entry !== code)
  const codeLabel = (await countries.originLabel(code)) ?? code
  return render(request, h, current, remaining, {
    status: copy.removed(codeLabel)
  })
}

const renderSaveUnavailable = async (request, h, selected) => {
  const current = await state.get(request, h)
  return (
    await render(request, h, current, selected, { recoverableError: true })
  ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
}

const postContinue = async (request, h, payload, selected) => {
  const { answers, errors, refusal } = await validation.onSubmit(payload)
  if (hasErrors(errors)) {
    const current = await state.get(request, h)
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
    () => renderSaveUnavailable(request, h, selected)
  )
  if (failure) {
    return failure
  }

  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

const get = async (request, h) => {
  const current = await state.get(request, h)
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

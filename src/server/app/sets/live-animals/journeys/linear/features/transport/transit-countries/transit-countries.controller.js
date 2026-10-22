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
  MESSAGES_NEEDING_NO_COUNTRY_LABEL,
  TRANSIT_REFUSAL,
  offeredCodes,
  partitionByOffered,
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
  h,
  journey,
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
  return h.view(view, {
    ...kit.base(copy.title, {
      request: h.request,
      backLink: hubPath(journey.journeyId),
      journey,
      page,
      recoverableError
    }),
    copy,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryItems: await countryItems(),
    selectedCountries: offeredSelected,
    countryRows: countryRows(offeredLabelled),
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

const addRefusalMessage = async (reason, chosen) =>
  reason === TRANSIT_REFUSAL.alreadyAdded
    ? copy.errors.alreadyAdded(await countries.originLabel(chosen))
    : MESSAGES_NEEDING_NO_COUNTRY_LABEL[reason]

const addRefusal = async (chosen, selected) => {
  const reason = addRefusalReason(chosen, selected, await offeredCodes())
  return reason && { reason, message: await addRefusalMessage(reason, chosen) }
}

const postAdd = async (request, h, selected) => {
  const chosen = String(request.payload?.[COUNTRY_FIELD] ?? '').trim()
  const { journey } = await state.get(request, h)
  const refusal = await addRefusal(chosen, selected)
  if (refusal) {
    const errors = { [COUNTRY_FIELD]: refusal.message }
    kit.logRefusal(request, {
      fieldErrors: errors,
      reason: refusal.reason,
      code: chosen
    })
    return (await render(h, journey, selected, { errors, chosen })).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }
  const added = [...selected, chosen]
  const chosenLabel = await countries.originLabel(chosen)
  return render(h, journey, added, {
    status: withLimitNotice(copy.added(chosenLabel), added)
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

const renderSaveUnavailable = async (request, h, selected) => {
  const { journey } = await state.get(request, h)
  return (await render(h, journey, selected, { recoverableError: true })).code(
    HTTP_STATUS_INTERNAL_SERVER_ERROR
  )
}

const postContinue = async (request, h, payload, selected) => {
  const { answers, errors, refusal } = await validation.onSubmit(payload)
  if (hasErrors(errors)) {
    const { journey } = await state.get(request, h)
    kit.logRefusal(request, { fieldErrors: errors, ...refusal })
    return (await render(h, journey, selected, { errors })).code(
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
  const { journey, answers } = await state.get(request, h)
  const { values, errors, refusal } = await validation.onStored(answers)
  if (hasErrors(errors)) {
    request.logger.info(
      { journeyId: journey.journeyId, ...refusal },
      'Stored transit countries refused: banner shown'
    )
  }
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

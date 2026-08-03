import * as state from '../../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../../lib/http-status.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as sharedCy } from '../../../../../../../shared/copy.cy.js'
import { copy as sharedEn } from '../../../../../../../shared/copy.en.js'
import * as kit from '../../../../../../../shared/kit.js'
import { hubPath, pagePath } from '../../../../../../../shared/paths.js'
import { isPlantsForPlanting } from '../../../../../services/commodities/index.js'
import { TEMPLATES } from '../../../config.js'
import { copy as cy } from '../copy/copy.cy.js'
import { copy as en } from '../copy/copy.en.js'
import { commodityBulkDetailsPage as page } from '../page.js'
import {
  BULK_FIELDS,
  LINE_FIELDS,
  bulkField,
  lineField,
  validateBulk,
  validateLines
} from './fields.js'
import {
  EMPTY_BULK_VALUES,
  bulkValues,
  pageModel,
  payloadValues,
  storedValues
} from './view-model.js'

export const meta = { ...page, collects: [] }

const view = `${TEMPLATES}/features/commodities/commodity-bulk-details/commodity-bulk-details`
const copy = copyFor({ en, cy }).commodityBulkDetails
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const linesOf = ({ answers, evaluation }) =>
  state.collectionView(answers, ['commodityLines'], evaluation)

const render = (
  request,
  h,
  pageState,
  values,
  bulk = EMPTY_BULK_VALUES,
  errors = {},
  { recoverableError = false } = {}
) => {
  const model = pageModel(linesOf(pageState), values, bulk, errors, copy)
  const base = kit.base(copy.title, {
    backLink: kit.withChangeContext(
      request,
      hubPath(pageState.journey.journeyId)
    ),
    journey: pageState.journey,
    recoverableError
  })
  return h.view(view, {
    ...base,
    hubHref: kit.withChangeContext(request, base.hubHref),
    copy,
    sharedCopy,
    errors,
    errorSummary: kit.errorSummary(errors),
    saveAction: kit.withChangeContext(
      request,
      pagePath(request.params.journeyId, page.slug)
    ),
    ...model
  })
}

const get = async (request, h) => {
  const pageState = await state.get(request, h)
  const lines = linesOf(pageState)
  return render(request, h, pageState, storedValues(lines))
}

const badRequest = (h) => h.response().code(HTTP_STATUS_BAD_REQUEST)
const validIndex = (lines, index) =>
  Number.isInteger(index) && index >= 0 && index < lines.length

const payloadIndices = (payload) =>
  Object.keys(payload).flatMap((key) => {
    const match = key.match(
      /^(?:numberOfPackages|packageType|quantity|quantityType|netWeight|controlledAtmosphereContainer|finishedOrPropagated|intendedForFinalUsers|testAndTrial)-(.+)$/
    )
    return match ? [Number(match[1])] : []
  })

const hasForgedLineIndex = (payload, lines) =>
  payloadIndices(payload).some((index) => !validIndex(lines, index))

const selectedValues = (payload) => {
  const selected = payload.selectedLines ?? []
  return Array.isArray(selected) ? selected.map(String) : [String(selected)]
}

const selectedIndices = (payload, lines) => {
  const selected = selectedValues(payload)
  if (selected.includes('all')) return lines.map(({ index }) => index)
  return selected.map(Number)
}

const hasForgedSelection = (payload, lines) =>
  selectedValues(payload).some(
    (selected) => selected !== 'all' && !validIndex(lines, Number(selected))
  )

const filledBulkFields = (values) =>
  BULK_FIELDS.filter((name) => values[bulkField(name)] !== '')

const cleanScalar = (name, value) => {
  if (['numberOfPackages', 'quantity', 'netWeight'].includes(name)) {
    return Number(value)
  }
  if (
    ['controlledAtmosphereContainer', 'intendedForFinalUsers'].includes(name)
  ) {
    return value === 'true'
  }
  return value
}

const withBulkValues = (entry, values, filled) => ({
  ...entry,
  ...Object.fromEntries(
    filled.map((name) => [name, cleanScalar(name, values[bulkField(name)])])
  )
})

const postApply = async (request, h, pageState, lines, payload) => {
  const values = storedValues(lines)
  const bulk = bulkValues(payload)
  const selected = selectedIndices(payload, lines)
  const filled = filledBulkFields(bulk)
  const { errors: formatErrors } = validateBulk(payload)
  const errors = { ...(formatErrors ?? {}) }
  if (selected.length === 0) errors.selectedLines = copy.errors.selectLine
  if (filled.length === 0) {
    errors[bulkField('numberOfPackages')] = copy.errors.fillOneField
  }
  if (
    hasForgedSelection(payload, lines) ||
    selected.some((index) => !validIndex(lines, index))
  ) {
    return badRequest(h)
  }
  if (Object.keys(errors).length > 0) {
    return render(request, h, pageState, values, bulk, errors).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  const unique = [...new Set(selected)]
  const { failure } = await kit.recoverableSave(
    async () => {
      for (const index of unique) {
        const line = lines.find((candidate) => candidate.index === index)
        await state.updateEntryAt(
          request,
          h,
          ['commodityLines'],
          index,
          withBulkValues(line.entry, bulk, filled)
        )
      }
    },
    () =>
      render(
        request,
        h,
        pageState,
        values,
        bulk,
        {},
        {
          recoverableError: true
        }
      ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) return failure
  return h.redirect(
    kit.withChangeContext(
      request,
      pagePath(request.params.journeyId, page.slug)
    )
  )
}

const cleanEntry = ({ entry, index }, values) => {
  const withoutMeasures = Object.fromEntries(
    Object.entries(entry).filter(([name]) => !LINE_FIELDS.includes(name))
  )
  const valueFor = (name) => values[lineField(name, index)]
  const cleaned = {
    ...withoutMeasures,
    numberOfPackages: cleanScalar(
      'numberOfPackages',
      valueFor('numberOfPackages')
    ),
    packageType: valueFor('packageType'),
    quantity: cleanScalar('quantity', valueFor('quantity')),
    quantityType: valueFor('quantityType'),
    netWeight: cleanScalar('netWeight', valueFor('netWeight')),
    testAndTrial: valueFor('testAndTrial') === 'true'
  }
  for (const name of [
    'controlledAtmosphereContainer',
    'intendedForFinalUsers'
  ]) {
    if (valueFor(name) !== '') cleaned[name] = cleanScalar(name, valueFor(name))
  }
  if (isPlantsForPlanting(entry.commoditySelection)) {
    cleaned.finishedOrPropagated = valueFor('finishedOrPropagated')
  }
  return cleaned
}

const postContinue = async (request, h, pageState, lines, payload) => {
  if (hasForgedLineIndex(payload, lines)) return badRequest(h)
  const values = payloadValues(payload, lines)
  const { errors } = validateLines(lines, payload)
  if (errors) {
    return render(
      request,
      h,
      pageState,
      values,
      EMPTY_BULK_VALUES,
      errors
    ).code(HTTP_STATUS_BAD_REQUEST)
  }
  if (lines.some(({ index }) => !validIndex(lines, index))) return badRequest(h)

  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      for (const line of lines) {
        await state.updateEntryAt(
          request,
          h,
          ['commodityLines'],
          line.index,
          cleanEntry(line, values)
        )
      }
      committed = await state.get(request, h)
    },
    () =>
      render(
        request,
        h,
        pageState,
        values,
        EMPTY_BULK_VALUES,
        {},
        {
          recoverableError: true
        }
      ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) return failure

  const hubTarget = kit.hubExitTarget(request)
  return h.redirect(
    hubTarget ?? (await kit.nextTarget(request, page, committed.scope))
  )
}

const post = async (request, h) => {
  const pageState = await state.get(request, h)
  const lines = linesOf(pageState)
  const payload = request.payload ?? {}
  if (hasForgedLineIndex(payload, lines)) return badRequest(h)
  if (payload.action === 'apply') {
    return postApply(request, h, pageState, lines, payload)
  }
  if (payload.action === 'clear') {
    return render(request, h, pageState, storedValues(lines))
  }
  return postContinue(request, h, pageState, lines, payload)
}

export const routes = kit.pageRoutes(page, { get, post })

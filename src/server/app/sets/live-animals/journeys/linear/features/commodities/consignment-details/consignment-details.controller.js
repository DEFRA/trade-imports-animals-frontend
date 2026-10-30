import { TEMPLATES } from '../../../config.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../../lib/http-status.js'
import * as state from '../../../../../../../engine/index.js'
import { validate } from '../../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { consignmentDetailsPage as page } from '../page.js'
import {
  commodityQuestionHref,
  commodityQuestionPath
} from '../commodity-question-detour.js'
import { lineKey } from '../search/search.controller.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { copy as sharedEn } from '../../../../../../../shared/copy.en.js'
import { copy as sharedCy } from '../../../../../../../shared/copy.cy.js'
import { packagesApply } from '../../check-answers/view-model/applicability.js'
import { animalsField, fieldsFor, packagesField } from './fields.js'
import { linesOf } from '../lines.js'
import {
  isRemoveAction,
  isRemoveSpeciesAction,
  removeIndexOf,
  removeSpeciesIndexOf
} from './remove/actions.js'
import { postRemove, postRemoveSpecies } from './remove/post-remove.js'
import { countDropIssues } from './validation/count-drop.js'
import { buildGroups } from './view-model/groups.js'
import { buildSelectedRows } from './view-model/selected-rows.js'
import { buildRemovableCommoditiesTable } from '../view-model/selected-commodity-rows.js'
import { payloadValues, storedValues } from './view-model/values.js'

export const meta = { ...page, collects: [] }
const view = `${TEMPLATES}/features/commodities/consignment-details/consignment-details`

const localisedCopy = copyFor({ en, cy })
const copy = localisedCopy.consignmentDetails
const selectedCommoditiesCopy = localisedCopy.selectedCommodities
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const selectedCommoditiesContext = (lines) => {
  const selectedRows = buildSelectedRows(lines)
  return {
    selectedRows,
    selectedTable: buildRemovableCommoditiesTable(
      selectedRows,
      selectedCommoditiesCopy,
      copy.table
    )
  }
}

const render = async ({
  request,
  h,
  current,
  lines,
  values,
  errors = {},
  errorSummary = null
}) =>
  h.view(view, {
    ...kit.base(copy.title, {
      request,
      backLink: await kit.runBackLink(request, page.id, current),
      journey: current.journey,
      page
    }),
    copy,
    selectedCommoditiesCopy,
    addHref: commodityQuestionHref(request, page),
    groups: buildGroups(lines, values, errors),
    ...selectedCommoditiesContext(lines),
    errors,
    errorSummary: errorSummary ?? kit.errorSummary(errors)
  })

const renderRefusal = async (renderOptions) =>
  (await render(renderOptions)).code(HTTP_STATUS_BAD_REQUEST)

const get = async (request, h) => {
  const current = await state.get(request, h)
  const { answers, evaluation } = current
  const lines = linesOf(answers, evaluation)
  if (lines.length === 0) {
    request.logger.info(
      {
        journeyId: request.params.journeyId,
        reason: 'no-commodities-on-load'
      },
      'Redirected to the commodity question'
    )
    return h.redirect(commodityQuestionPath(request))
  }
  return render({
    request,
    h,
    current,
    lines,
    values: storedValues(lines)
  })
}

const post = async (request, h) => {
  const current = await state.get(request, h)
  const { answers, evaluation } = current
  const lines = linesOf(answers, evaluation)
  const payload = request.payload ?? {}
  const action = (payload.action ?? '').toString()
  if (isRemoveSpeciesAction(action)) {
    return postRemoveSpecies(request, h, removeSpeciesIndexOf(action), lineKey)
  }
  if (isRemoveAction(action)) {
    return postRemove(request, h, removeIndexOf(action), lineKey)
  }
  const values = payloadValues(payload, lines)
  const { errors } = validate(fieldsFor(lines), payload)
  if (errors) {
    return renderRefusal({ request, h, current, lines, values, errors })
  }

  const issues = countDropIssues(request, lines, values)
  if (issues.length > 0) {
    const countDropErrors = Object.fromEntries(
      issues.map((issue) => [issue.field, issue.text])
    )
    return renderRefusal({
      request,
      h,
      current,
      lines,
      values,
      errors: countDropErrors,
      errorSummary: {
        titleText: sharedCopy.errorSummary.title,
        errorList: issues.map(({ text, href }) => ({ text, href }))
      }
    })
  }

  for (const { index, entry } of lines) {
    await state.updateEntryAt(request, h, ['commodityLines'], index, {
      ...entry,
      numberOfAnimalsQuantity: values[animalsField(index)],
      ...(packagesApply(entry.commodityCode)
        ? { numberOfPackages: values[packagesField(index)] }
        : {})
    })
  }
  const { scope } = await state.get(request, h)
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })

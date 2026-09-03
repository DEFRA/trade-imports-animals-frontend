import { pagePath } from '../../../../../../../shared/paths.js'
import { TEMPLATES } from '../../../config.js'
import * as state from '../../../../../../../engine/index.js'
import { validate } from '../../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { commoditiesPage, consignmentDetailsPage as page } from '../page.js'
import { lineKey } from '../search/search.controller.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { copy as sharedEn } from '../../../../../../../shared/copy.en.js'
import { copy as sharedCy } from '../../../../../../../shared/copy.cy.js'
import {
  animalsField,
  fieldsFor,
  packagesApply,
  packagesField
} from './fields.js'
import { linesOf } from './lines.js'
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
import { payloadValues, storedValues } from './view-model/values.js'

export const meta = { ...page, collects: [] }
const view = `${TEMPLATES}/features/commodities/consignment-details/consignment-details`

const copy = copyFor({ en, cy }).consignmentDetails
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const render = (
  request,
  h,
  journey,
  lines,
  values,
  errors = {},
  errorSummary = null
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: kit.withChangeContext(
        request,
        pagePath(request.params.journeyId, commoditiesPage.slug)
      ),
      journey,
      page
    }),
    copy,
    addHref: kit.withChangeContext(
      request,
      pagePath(request.params.journeyId, commoditiesPage.slug)
    ),
    groups: buildGroups(lines, values, errors),
    selectedRows: buildSelectedRows(lines),
    errors,
    errorSummary: errorSummary ?? kit.errorSummary(errors)
  })

// While a line is left the page still has quantities to collect. With none
// left it has nothing to ask, so a load sends the user to the commodity
// question — the same rule the removal applies on the way out, applied on
// the way in, so a browser Back, a refresh or a bookmark cannot land on an
// empty details page.
const get = async (request, h) => {
  const { journey, answers, evaluation } = await state.get(request, h)
  const lines = linesOf(answers, evaluation)
  if (lines.length === 0) {
    return h.redirect(
      kit.withChangeContext(
        request,
        pagePath(request.params.journeyId, commoditiesPage.slug)
      )
    )
  }
  return render(request, h, journey, lines, storedValues(lines))
}

const post = async (request, h) => {
  const { journey, answers, evaluation } = await state.get(request, h)
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
    return render(request, h, journey, lines, values, errors)
  }

  const issues = countDropIssues(request, lines, values)
  if (issues.length > 0) {
    return render(
      request,
      h,
      journey,
      lines,
      values,
      Object.fromEntries(issues.map((issue) => [issue.field, issue.text])),
      {
        titleText: sharedCopy.errorSummary.title,
        errorList: issues.map(({ text, href }) => ({ text, href }))
      }
    )
  }

  for (const { index, entry } of lines) {
    await state.updateEntryAt(request, h, ['commodityLines'], index, {
      ...entry,
      numberOfAnimalsQuantity: values[animalsField(index)],
      ...(packagesApply(entry.commoditySelection)
        ? { numberOfPackages: values[packagesField(index)] }
        : {})
    })
  }
  const { scope } = await state.get(request, h)
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })

import * as state from '../../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../../lib/http-status.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as kit from '../../../../../../../shared/kit.js'
import { hubPath, pagePath } from '../../../../../../../shared/paths.js'
import { TEMPLATES } from '../../../config.js'
import { copy as cy } from '../copy/copy.cy.js'
import { copy as en } from '../copy/copy.en.js'
import {
  commodityBasicDescriptionPage,
  commoditySearchPage,
  commoditySummaryPage as page
} from '../page.js'
import {
  indicesOf,
  isRemoveAction,
  postRemove,
  validRemoveTarget
} from './remove/post-remove.js'
import { buildSummaryGroups } from './view-model/summary-groups.js'

export const meta = { ...page, collects: [] }

const view = `${TEMPLATES}/features/commodities/commodity-summary/commodity-summary`
const copy = copyFor({ en, cy }).commoditySummary

const interpolate = (template, values) =>
  Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template
  )

const lineContextHref = (request, journeyId, lineIndex) => {
  const base = kit.withChangeContext(
    request,
    pagePath(journeyId, commodityBasicDescriptionPage.slug)
  )
  const separator = base.includes('?') ? '&' : '?'
  return `${base}${separator}line=${lineIndex}#species-${lineIndex}`
}

const removeAccessibleName = (group, row) =>
  `${copy.remove} ${interpolate(copy.removeContext, {
    genusAndSpecies: row.genusAndSpecies,
    line: group.lineIndex + 1,
    species: row.speciesIndex + 1,
    commodityCode: group.commodityCode
  })}`

const renderGroups = (request, journeyId, answers, evaluation) =>
  buildSummaryGroups(answers, evaluation).map((group) => ({
    ...group,
    addSpeciesHref: lineContextHref(request, journeyId, group.lineIndex),
    rows: group.rows.map((row) => ({
      ...row,
      action: `remove:${group.lineIndex}:${row.speciesIndex}`,
      removeAccessibleName: removeAccessibleName(group, row)
    }))
  }))

const render = (request, h, pageState, { recoverableError = false } = {}) => {
  const journeyId = pageState.journey.journeyId
  return h.view(view, {
    ...kit.base(copy.heading, {
      backLink: kit.withChangeContext(request, hubPath(journeyId)),
      journey: pageState.journey,
      recoverableError
    }),
    copy,
    groups: renderGroups(
      request,
      journeyId,
      pageState.answers,
      pageState.evaluation
    ),
    addCommodityHref: kit.withChangeContext(
      request,
      pagePath(journeyId, commoditySearchPage.slug)
    ),
    saveAction: kit.withChangeContext(request, pagePath(journeyId, page.slug))
  })
}

const get = async (request, h) => {
  const pageState = await state.get(request, h)
  return render(request, h, pageState)
}

const postRemoveAction = async (request, h, pageState, action) => {
  const target = indicesOf(action)
  if (!target || !validRemoveTarget(pageState.answers, target[0], target[1])) {
    return render(request, h, pageState).code(HTTP_STATUS_BAD_REQUEST)
  }

  const { failure, value } = await kit.recoverableSave(
    () => postRemove(request, h, pageState.answers, target),
    () =>
      render(request, h, pageState, { recoverableError: true }).code(
        HTTP_STATUS_INTERNAL_SERVER_ERROR
      )
  )
  if (failure) return failure
  if (value === null) {
    return render(request, h, pageState).code(HTTP_STATUS_BAD_REQUEST)
  }
  return h.redirect(
    kit.withChangeContext(
      request,
      pagePath(pageState.journey.journeyId, page.slug)
    )
  )
}

const post = async (request, h) => {
  const pageState = await state.get(request, h)
  const action = String(request.payload?.action ?? '')
  if (isRemoveAction(action)) {
    return postRemoveAction(request, h, pageState, action)
  }

  const hubTarget = kit.hubExitTarget(request)
  return h.redirect(
    hubTarget ?? (await kit.nextTarget(request, page, pageState.scope))
  )
}

export const routes = kit.pageRoutes(page, { get, post })

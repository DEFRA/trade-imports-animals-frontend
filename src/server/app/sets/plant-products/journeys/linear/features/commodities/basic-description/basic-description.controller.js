import * as state from '../../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../../lib/http-status.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as kit from '../../../../../../../shared/kit.js'
import { hubPath, pagePath } from '../../../../../../../shared/paths.js'
import {
  descriptionFor,
  speciesFor
} from '../../../../../services/commodities/index.js'
import { TEMPLATES } from '../../../config.js'
import { copy as cy } from '../copy/copy.cy.js'
import { copy as en } from '../copy/copy.en.js'
import { commodityBasicDescriptionPage as page } from '../page.js'

export const meta = { ...page, collects: [] }

const view = `${TEMPLATES}/features/commodities/basic-description/basic-description`
const copy = copyFor({ en, cy }).basicDescription

const normaliseFilter = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()

const actionTarget = (action, prefix) => {
  if (!action.startsWith(prefix)) return null
  const parts = action.slice(prefix.length).split(':')
  if (parts.length !== 2 || parts.some((part) => part === '')) return null
  return { index: Number(parts[0]), value: parts[1] }
}

const selectedFilterLine = (query, lines) => {
  const index = Number(query.line)
  return Number.isInteger(index) && index >= 0 && index < lines.length
    ? index
    : null
}

const filtersFor = (query, index, selectedLine) =>
  index === selectedLine
    ? {
        genus: String(query.genus ?? ''),
        eppoCode: String(query.eppoCode ?? '')
      }
    : { genus: '', eppoCode: '' }

const candidateSpecies = (commodityCode, added, filters) => {
  const addedCodes = new Set(added.map(({ entry }) => entry.eppoCode))
  const genus = normaliseFilter(filters.genus)
  const eppoCode = normaliseFilter(filters.eppoCode)
  return speciesFor(commodityCode).filter(
    (candidate) =>
      !addedCodes.has(candidate.eppoCode) &&
      candidate.genusAndSpecies.toLowerCase().includes(genus) &&
      candidate.eppoCode.toLowerCase().includes(eppoCode)
  )
}

const anchored = (href, index) => `${href}#species-${index}`

const buildCard = (request, pageState, line, selectedLine, errors) => {
  const { index, entry } = line
  const filters = filtersFor(request.query, index, selectedLine)
  const added = state.collectionView(
    pageState.answers,
    ['commodityLines', index, 'species'],
    pageState.evaluation
  )
  const baseHref = pagePath(request.params.journeyId, page.slug)
  const pageHref = kit.withChangeContext(request, baseHref)
  return {
    index,
    anchor: `species-${index}`,
    titleId: `commodity-line-${index}`,
    commodity: {
      code: entry.commoditySelection,
      description: descriptionFor(entry.commoditySelection) ?? ''
    },
    added: added.map(({ index: speciesIndex, entry: species }) => ({
      ...species,
      speciesIndex
    })),
    candidates: candidateSpecies(entry.commoditySelection, added, filters),
    filters,
    filterAction: anchored(pageHref, index),
    postAction: anchored(pageHref, index),
    clearHref: anchored(pageHref, index),
    error: errors[`species-${index}`]
  }
}

const render = (
  request,
  h,
  pageState,
  { errors = {}, recoverableError = false } = {}
) => {
  const lines = state.collectionView(
    pageState.answers,
    ['commodityLines'],
    pageState.evaluation
  )
  const selectedLine = selectedFilterLine(request.query, lines)
  const base = kit.base(copy.heading, {
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
    cards: lines.map((line) =>
      buildCard(request, pageState, line, selectedLine, errors)
    ),
    changeContext: kit.changeContext(request),
    errors,
    errorSummary: kit.errorSummary(errors),
    saveAction: kit.withChangeContext(
      request,
      pagePath(request.params.journeyId, page.slug)
    )
  })
}

const get = async (request, h) => {
  const pageState = await state.get(request, h)
  return render(request, h, pageState)
}

const badRequest = (h) => h.response().code(HTTP_STATUS_BAD_REQUEST)

const validLine = (lines, index) =>
  Number.isInteger(index) && index >= 0 && index < lines.length

const recoverableMutation = async (request, h, pageState, mutation) => {
  const { failure, value } = await kit.recoverableSave(mutation, () =>
    render(request, h, pageState, { recoverableError: true }).code(
      HTTP_STATUS_INTERNAL_SERVER_ERROR
    )
  )
  return { failure, value }
}

const redirectToPage = (request, h) =>
  h.redirect(
    kit.withChangeContext(
      request,
      pagePath(request.params.journeyId, page.slug)
    )
  )

const postAdd = async (request, h, pageState, lines, target) => {
  if (!target || !validLine(lines, target.index)) return badRequest(h)
  const line = lines[target.index]
  const candidates = speciesFor(line.entry.commoditySelection)
  const species = candidates.find(({ eppoCode }) => eppoCode === target.value)
  const alreadyAdded = (line.entry.species ?? []).some(
    ({ eppoCode }) => eppoCode === target.value
  )
  if (!species || alreadyAdded) return badRequest(h)

  const { failure, value: appended } = await recoverableMutation(
    request,
    h,
    pageState,
    () =>
      state.appendEntryAt(
        request,
        h,
        ['commodityLines', target.index, 'species'],
        {
          eppoCode: species.eppoCode,
          genusAndSpecies: species.genusAndSpecies,
          speciesId: species.speciesId
        }
      )
  )
  if (failure) return failure
  if (!Number.isInteger(appended)) return badRequest(h)
  return redirectToPage(request, h)
}

const postRemove = async (request, h, pageState, lines, target) => {
  const speciesIndex = Number(target?.value)
  if (
    !target ||
    !validLine(lines, target.index) ||
    !Number.isInteger(speciesIndex)
  ) {
    return badRequest(h)
  }
  const added = state.collectionView(
    pageState.answers,
    ['commodityLines', target.index, 'species'],
    pageState.evaluation
  )
  if (speciesIndex < 0 || speciesIndex >= added.length) return badRequest(h)

  const { failure } = await recoverableMutation(request, h, pageState, () =>
    state.removeEntryAt(
      request,
      h,
      ['commodityLines', target.index, 'species'],
      speciesIndex
    )
  )
  if (failure) return failure
  return redirectToPage(request, h)
}

const postContinue = async (request, h, pageState, lines) => {
  const errors = Object.fromEntries(
    lines
      .filter(({ entry }) => (entry.species ?? []).length === 0)
      .map(({ index }) => [`species-${index}`, copy.errors.selectAtLeastOne])
  )
  if (Object.keys(errors).length > 0) {
    return render(request, h, pageState, { errors }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  const hubTarget = kit.hubExitTarget(request)
  return h.redirect(
    hubTarget ?? (await kit.nextTarget(request, page, pageState.scope))
  )
}

const post = async (request, h) => {
  const pageState = await state.get(request, h)
  const lines = state.collectionView(
    pageState.answers,
    ['commodityLines'],
    pageState.evaluation
  )
  const action = String(request.payload?.action ?? '')
  if (action.startsWith('add:')) {
    return postAdd(request, h, pageState, lines, actionTarget(action, 'add:'))
  }
  if (action.startsWith('remove:')) {
    return postRemove(
      request,
      h,
      pageState,
      lines,
      actionTarget(action, 'remove:')
    )
  }
  return postContinue(request, h, pageState, lines)
}

export const routes = kit.pageRoutes(page, { get, post })

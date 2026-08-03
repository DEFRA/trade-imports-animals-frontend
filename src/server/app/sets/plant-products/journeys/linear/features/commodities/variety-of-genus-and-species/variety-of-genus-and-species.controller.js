import * as state from '../../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../../lib/http-status.js'
import {
  compose,
  maxText,
  requiredOneOf,
  requiredText,
  validate
} from '../../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as kit from '../../../../../../../shared/kit.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import {
  classesFor,
  hasVarieties,
  varietiesFor,
  varietyLabelFor
} from '../../../../../services/commodities/index.js'
import { TEMPLATES } from '../../../config.js'
import { copy as cy } from '../copy/copy.cy.js'
import { copy as en } from '../copy/copy.en.js'
import {
  commodityBasicDescriptionPage,
  varietyOfGenusAndSpeciesPage as page
} from '../page.js'

export const meta = { ...page, collects: [] }

const view = `${TEMPLATES}/features/commodities/variety-of-genus-and-species/variety-of-genus-and-species`
const copy = copyFor({ en, cy }).varietyOfGenusAndSpecies
const OTHER_VARIETY = '__OTHER__'
const OTHER_VARIETY_MAX_LENGTH = 32

const interpolate = (template, values) =>
  Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template
  )

const fieldNames = (lineIndex, speciesIndex) => ({
  variety: `varietySelect-${lineIndex}-${speciesIndex}`,
  otherVariety: `otherVariety-${lineIndex}-${speciesIndex}`,
  varietyClass: `varietyClass-${lineIndex}-${speciesIndex}`
})

const valuesFrom = (source, names) => ({
  variety: String(source?.[names.variety] ?? ''),
  otherVariety: String(source?.[names.otherVariety] ?? ''),
  varietyClass: String(source?.[names.varietyClass] ?? '')
})

const speciesHeading = (entry) =>
  interpolate(copy.speciesHeading, {
    eppoCode: entry.eppoCode,
    genusAndSpecies: entry.genusAndSpecies
  })

const contextFor = (lineIndex, speciesIndex, heading) =>
  interpolate(copy.repeatedControlContext, {
    line: lineIndex + 1,
    species: speciesIndex + 1,
    speciesHeading: heading
  })

const qualifyingSpecies = (pageState) =>
  state
    .collectionView(pageState.answers, ['commodityLines'], pageState.evaluation)
    .flatMap((line) =>
      state
        .collectionView(
          pageState.answers,
          ['commodityLines', line.index, 'species'],
          pageState.evaluation
        )
        .filter(({ entry }) => hasVarieties(entry.eppoCode))
        .map((species) => ({ line, species }))
    )

const selectedItems = (items, selected) =>
  items.map((item) => ({ ...item, selected: item.value === selected }))

const savedRows = (pageState, lineIndex, speciesIndex, entry, context) =>
  state
    .collectionView(
      pageState.answers,
      ['commodityLines', lineIndex, 'species', speciesIndex, 'varieties'],
      pageState.evaluation
    )
    .map(({ index, entry: saved }) => {
      const varietyText =
        varietyLabelFor(entry.eppoCode, saved.variety) ?? saved.variety
      const classText =
        copy.classOptions[saved.varietyClass] ?? saved.varietyClass ?? ''
      return {
        index,
        variety: varietyText,
        class: classText,
        action: `remove:${lineIndex}:${speciesIndex}:${index}`,
        accessibleName: `${copy.remove} ${interpolate(copy.removeContext, {
          variety: varietyText,
          className: classText,
          line: lineIndex + 1,
          species: speciesIndex + 1,
          speciesHeading: speciesHeading(entry)
        })}`,
        context
      }
    })

const buildCard = (pageState, target, forms, errors) => {
  const lineIndex = target.line.index
  const speciesIndex = target.species.index
  const entry = target.species.entry
  const names = fieldNames(lineIndex, speciesIndex)
  const values = forms[`${lineIndex}:${speciesIndex}`] ?? valuesFrom({}, names)
  const heading = speciesHeading(entry)
  const context = contextFor(lineIndex, speciesIndex, heading)
  const classValues = classesFor(entry.eppoCode)
  return {
    lineIndex,
    speciesIndex,
    anchor: `varieties-${lineIndex}-${speciesIndex}`,
    heading,
    names,
    values,
    context,
    varietyAccessibleName: `${copy.varietyLabel} ${context}`,
    otherVarietyAccessibleName: `${copy.otherVarietyLabel} ${context}`,
    classAccessibleName: `${copy.classLabel} ${context}`,
    hasClasses: classValues.length > 0,
    addAccessibleName: `${copy.addAnotherVariety} ${context}`,
    varietyItems: selectedItems(
      [
        { value: '', text: copy.varietyPlaceholder },
        ...varietiesFor(entry.eppoCode).map(({ id, label }) => ({
          value: id,
          text: label
        })),
        { value: OTHER_VARIETY, text: copy.otherOption }
      ],
      values.variety
    ),
    classItems: selectedItems(
      [
        { value: '', text: copy.classPlaceholder },
        ...classValues.map((value) => ({
          value,
          text: copy.classOptions[value]
        }))
      ],
      values.varietyClass
    ),
    varietyError: kit.fieldError(errors, names.variety),
    otherVarietyError: kit.fieldError(errors, names.otherVariety),
    classError: kit.fieldError(errors, names.varietyClass),
    rows: savedRows(pageState, lineIndex, speciesIndex, entry, context)
  }
}

const render = (
  request,
  h,
  pageState,
  { forms = {}, errors = {}, recoverableError = false } = {}
) => {
  const base = kit.base(copy.title, {
    backLink: kit.withChangeContext(
      request,
      pagePath(pageState.journey.journeyId, commodityBasicDescriptionPage.slug)
    ),
    journey: pageState.journey,
    recoverableError
  })
  const basicDescriptionHref = kit.withChangeContext(
    request,
    pagePath(pageState.journey.journeyId, commodityBasicDescriptionPage.slug)
  )
  return h.view(view, {
    ...base,
    hubHref: kit.withChangeContext(request, base.hubHref),
    copy,
    cards: qualifyingSpecies(pageState).map((target) =>
      buildCard(pageState, target, forms, errors)
    ),
    addSpeciesHref: basicDescriptionHref,
    saveAction: kit.withChangeContext(
      request,
      pagePath(request.params.journeyId, page.slug)
    ),
    errors,
    errorSummary: kit.errorSummary(errors)
  })
}

const get = async (request, h) => {
  const pageState = await state.get(request, h)
  if (qualifyingSpecies(pageState).length === 0) {
    return h.redirect(await kit.nextTarget(request, page, pageState.scope))
  }
  return render(request, h, pageState)
}

const parseTarget = (action, prefix, size) => {
  if (!action.startsWith(prefix)) return null
  const parts = action.slice(prefix.length).split(':')
  if (parts.length !== size || parts.some((part) => part === '')) return null
  return parts.map(Number)
}

const validSpeciesTarget = (answers, lineIndex, speciesIndex) => {
  const lines = answers.commodityLines ?? []
  if (
    !Number.isInteger(lineIndex) ||
    lineIndex < 0 ||
    lineIndex >= lines.length
  ) {
    return false
  }
  const species = lines[lineIndex]?.species ?? []
  return (
    Number.isInteger(speciesIndex) &&
    speciesIndex >= 0 &&
    speciesIndex < species.length &&
    hasVarieties(species[speciesIndex].eppoCode)
  )
}

const badRequest = (h) => h.response().code(HTTP_STATUS_BAD_REQUEST)

const schemaFor = (names, entry) => {
  const varietyValues = varietiesFor(entry.eppoCode).map(({ id }) => id)
  const classValues = classesFor(entry.eppoCode)
  const varietyRule = requiredOneOf(
    names.variety,
    [...varietyValues, OTHER_VARIETY],
    copy.errors.varietyRequired
  )
  return classValues.length === 0
    ? varietyRule
    : compose(
        varietyRule,
        requiredOneOf(
          names.varietyClass,
          classValues,
          copy.errors.classRequired
        )
      )
}

const validateActiveRow = (names, entry, raw, payload) => {
  const base = validate(schemaFor(names, entry), payload)
  if (raw.variety.trim() !== OTHER_VARIETY) return base

  const required = validate(
    requiredText(names.otherVariety, copy.errors.otherVarietyRequired),
    payload
  )
  const maximum = validate(
    maxText(
      names.otherVariety,
      OTHER_VARIETY_MAX_LENGTH,
      copy.errors.otherVarietyLength
    ),
    payload
  )
  return {
    value: {
      ...base.value,
      [names.otherVariety]: maximum.value[names.otherVariety]
    },
    errors: Object.assign(
      {},
      base.errors ?? {},
      required.errors ?? {},
      maximum.errors ?? {}
    )
  }
}

const validateRow = (pageState, target, payload) => {
  const lineIndex = target.line.index
  const speciesIndex = target.species.index
  const names = fieldNames(lineIndex, speciesIndex)
  const raw = valuesFrom(payload, names)
  const path = [
    'commodityLines',
    lineIndex,
    'species',
    speciesIndex,
    'varieties'
  ]
  const rows = state.collectionView(
    pageState.answers,
    path,
    pageState.evaluation
  )
  const holdsData = Object.values(raw).some((value) => value.trim() !== '')
  if (!holdsData) {
    return {
      values: raw,
      errors:
        rows.length === 0
          ? { [names.variety]: copy.errors.atLeastOneVariety }
          : null,
      entry: null,
      path
    }
  }

  const projectedPayload = {
    ...payload,
    [names.variety]: raw.variety,
    [names.otherVariety]: raw.otherVariety,
    [names.varietyClass]: raw.varietyClass
  }
  const { value, errors } = validateActiveRow(
    names,
    target.species.entry,
    raw,
    projectedPayload
  )
  if (errors && Object.keys(errors).length > 0) {
    return { values: raw, errors, entry: null, path }
  }

  const committedVariety =
    value[names.variety] === OTHER_VARIETY
      ? value[names.otherVariety]
      : value[names.variety]
  const entry = {
    variety: committedVariety,
    ...(classesFor(target.species.entry.eppoCode).length > 0
      ? { varietyClass: value[names.varietyClass] }
      : {})
  }
  const duplicate = rows.some(
    ({ entry: saved }) =>
      saved.variety === entry.variety &&
      saved.varietyClass === entry.varietyClass
  )
  return {
    values: raw,
    errors: duplicate ? { [names.variety]: copy.errors.duplicatePair } : null,
    entry,
    path
  }
}

const formsAndErrors = (results) => ({
  forms: Object.fromEntries(
    results.map(({ target, result }) => [
      `${target.line.index}:${target.species.index}`,
      result.values
    ])
  ),
  errors: Object.assign({}, ...results.map(({ result }) => result.errors ?? {}))
})

const recoverableMutation = async (
  request,
  h,
  pageState,
  viewState,
  mutation
) =>
  kit.recoverableSave(mutation, async () => {
    const current = await state.get(request, h)
    return render(request, h, current ?? pageState, {
      ...viewState,
      recoverableError: true
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  })

const redirectToPage = (request, h) =>
  h.redirect(
    kit.withChangeContext(
      request,
      pagePath(request.params.journeyId, page.slug)
    )
  )

const postAdd = async (request, h, pageState, action) => {
  const targetParts = parseTarget(action, 'add:', 2)
  if (
    !targetParts ||
    !validSpeciesTarget(pageState.answers, targetParts[0], targetParts[1])
  ) {
    return badRequest(h)
  }
  const target = qualifyingSpecies(pageState).find(
    ({ line, species }) =>
      line.index === targetParts[0] && species.index === targetParts[1]
  )
  if (!target) return badRequest(h)
  const result = validateRow(pageState, target, request.payload)
  const viewState = formsAndErrors([{ target, result }])
  if (result.errors) {
    return render(request, h, pageState, viewState).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  const { failure, value: appended } = await recoverableMutation(
    request,
    h,
    pageState,
    viewState,
    () => state.appendEntryAt(request, h, result.path, result.entry)
  )
  if (failure) return failure
  if (!Number.isInteger(appended)) return badRequest(h)
  return redirectToPage(request, h)
}

const postRemove = async (request, h, pageState, action) => {
  const target = parseTarget(action, 'remove:', 3)
  if (!target || !validSpeciesTarget(pageState.answers, target[0], target[1])) {
    return badRequest(h)
  }
  const varietyIndex = target[2]
  const path = ['commodityLines', target[0], 'species', target[1], 'varieties']
  const rows = state.collectionView(
    pageState.answers,
    path,
    pageState.evaluation
  )
  if (
    !Number.isInteger(varietyIndex) ||
    varietyIndex < 0 ||
    varietyIndex >= rows.length
  ) {
    return badRequest(h)
  }

  const { failure } = await recoverableMutation(request, h, pageState, {}, () =>
    state.removeEntryAt(request, h, path, varietyIndex)
  )
  if (failure) return failure
  return redirectToPage(request, h)
}

const postContinue = async (request, h, pageState) => {
  const targets = qualifyingSpecies(pageState)
  if (targets.length === 0) {
    return h.redirect(await kit.nextTarget(request, page, pageState.scope))
  }
  const results = targets.map((target) => ({
    target,
    result: validateRow(pageState, target, request.payload)
  }))
  const viewState = formsAndErrors(results)
  if (Object.keys(viewState.errors).length > 0) {
    return render(request, h, pageState, viewState).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  const pending = results.filter(({ result }) => result.entry)
  if (pending.length > 0) {
    const { failure } = await recoverableMutation(
      request,
      h,
      pageState,
      viewState,
      async () => {
        for (const { result } of pending) {
          const appended = await state.appendEntryAt(
            request,
            h,
            result.path,
            result.entry
          )
          if (!Number.isInteger(appended)) {
            throw new Error('Variety append did not return a valid index')
          }
        }
      }
    )
    if (failure) return failure
  }

  const current = await state.get(request, h)
  const hubTarget = kit.hubExitTarget(request)
  return h.redirect(
    hubTarget ?? (await kit.nextTarget(request, page, current.scope))
  )
}

const post = async (request, h) => {
  const pageState = await state.get(request, h)
  const action = String(request.payload?.action ?? '')
  if (action.startsWith('add:')) {
    return postAdd(request, h, pageState, action)
  }
  if (action.startsWith('remove:')) {
    return postRemove(request, h, pageState, action)
  }
  return postContinue(request, h, pageState)
}

export const routes = kit.pageRoutes(page, { get, post })

import { hubPath, pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import * as commodities from '../../services/commodities/index.js'
import { commoditiesPage as page, consignmentDetailsPage } from './page.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

export const meta = { ...page, collects: ['commodityLines'] }
const view = `${TEMPLATES}/features/commodities/search`

const copy = copyFor({ en, cy }).search

/** One commodity line = one commodity plus ONE species. The pair is
 * the line's identity for batch reconcile. */
export const lineKey = (line) =>
  `${line.commoditySelection}|${line.speciesSelection}`

const splitKey = (key) => {
  const separator = key.indexOf('|')
  return [key.slice(0, separator), key.slice(separator + 1)]
}

const isValidKey = (key) => {
  const [name, species] = splitKey(key)
  return commodities.isCommoditySpecies(name, species)
}

// Canonical selection order: commodity list order, then that commodity's
// species order — so the details page renders deterministic groups whatever
// order the boxes were ticked in.
const canonicalKeys = () =>
  commodities
    .list()
    .flatMap((name) =>
      commodities.speciesFor(name).map((option) => `${name}|${option.value}`)
    )

const normaliseKeys = (keys) => {
  const wanted = new Set(keys.filter(isValidKey))
  return canonicalKeys().filter((key) => wanted.has(key))
}

const toList = (value) => (value === undefined ? [] : [].concat(value))

// The form's selection state across search round-trips: hidden `selected`
// inputs carry the running selection, hidden `shown` inputs name the keys
// rendered as checkboxes (an unchecked box posts nothing, so "shown and
// unposted" means deselected, while "not shown" means carried forward).
const selectedKeysFromPayload = (payload) => {
  const shown = new Set(toList(payload.shown))
  const carried = toList(payload.selected).filter((key) => !shown.has(key))
  return normaliseKeys([...carried, ...toList(payload.species)])
}

const storedKeys = (answers) =>
  normaliseKeys((answers.commodityLines ?? []).map(lineKey))

// A multi-type commodity (Cow) shows a type select whose choice narrows the
// species offered; before a type is picked, or for single-type commodities, its
// full species set shows and no control is rendered.
const groupSpecies = (group, typeFilters) => {
  if (!commodities.isMultiType(group.name)) return group.species
  const typeId = typeFilters[group.name]
  return typeId ? commodities.speciesForType(group.name, typeId) : group.species
}

const typeItemsFor = (name, typeFilters) => {
  const chosen = typeFilters[name] ?? ''
  return [
    { value: '', text: copy.typeFilter.all },
    ...commodities.typeSelectOptions(name)
  ].map((option) => ({ ...option, selected: option.value === chosen }))
}

const resultGroups = (query, selected, typeFilters) =>
  commodities.search(query).map((group) => {
    const multiType = commodities.isMultiType(group.name)
    return {
      legend: `${group.name} (${group.code})`,
      name: group.name,
      multiType,
      typeItems: multiType ? typeItemsFor(group.name, typeFilters) : [],
      items: groupSpecies(group, typeFilters).map((option) => {
        const key = `${group.name}|${option.value}`
        return {
          value: key,
          text: option.text,
          checked: selected.includes(key)
        }
      })
    }
  })

const selectedSummary = (selected) =>
  selected.map((key) => {
    const [name, species] = splitKey(key)
    const code = commodities.commodityCodeFor(name)
    const label = commodities.speciesLabel(species) ?? species
    return { key, text: `${name} (${code}) — ${label}` }
  })

const render = (
  request,
  h,
  journey,
  { query = '', selected, typeFilters = {}, errors = {} }
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(),
      journey
    }),
    copy,
    query,
    results: resultGroups(query, selected, typeFilters),
    searched: query.trim() !== '',
    selectedSummary: selectedSummary(selected),
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(request, h, journey, { selected: storedKeys(answers) })
}

// The line's type is its species' owning type id — always non-blank, so every
// line completes. Multi-type commodities (Cow) carry the chosen type's id via
// the species the filter narrowed to; single-type commodities collapse to their
// one type id with no control shown.
const seedLine = (key) => {
  const [commoditySelection, speciesSelection] = splitKey(key)
  return {
    commoditySelection,
    speciesSelection,
    commodityType: commodities.typeIdForSpecies(
      commoditySelection,
      speciesSelection
    ),
    numberOfPackages: '',
    numberOfAnimalsQuantity: ''
  }
}

const SEARCH_ACTION = 'search'
const FILTER_ACTION = 'filter'
const REMOVE_ACTION_PREFIX = 'remove:'
const TYPE_FILTER_PREFIX = 'typeFilter:'

const isReRenderAction = (action) =>
  action === SEARCH_ACTION ||
  action === FILTER_ACTION ||
  action.startsWith(REMOVE_ACTION_PREFIX)

// The type-select values, keyed by commodity name, carried on every submit as
// `typeFilter:<name>` fields.
const typeFiltersFromPayload = (payload) =>
  Object.fromEntries(
    Object.entries(payload)
      .filter(([key]) => key.startsWith(TYPE_FILTER_PREFIX))
      .map(([key, value]) => [key.slice(TYPE_FILTER_PREFIX.length), value])
  )

const withRemovalApplied = (action, selected) =>
  action.startsWith(REMOVE_ACTION_PREFIX)
    ? selected.filter(
        (key) => key !== action.slice(REMOVE_ACTION_PREFIX.length)
      )
    : selected

const renderSearchOrRemove = async (
  request,
  h,
  query,
  selected,
  typeFilters
) => {
  const { journey } = await state.get(request, h)
  return render(request, h, journey, { query, selected, typeFilters })
}

const renderSelectionRequired = async (
  request,
  h,
  query,
  selected,
  typeFilters
) => {
  const { journey } = await state.get(request, h)
  return render(request, h, journey, {
    query,
    selected,
    typeFilters,
    errors: { search: copy.errors.selectCommodity }
  })
}

const commitSelection = async (request, h, selected) => {
  await state.reconcileEntriesAt(
    request,
    h,
    ['commodityLines'],
    lineKey,
    selected.map(seedLine)
  )
  return h.redirect(
    kit.hubExitTarget(request) ??
      kit.withChangeContext(request, pagePath(consignmentDetailsPage.slug))
  )
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const action = payload.action ?? ''
  const query = payload.search ?? ''
  const typeFilters = typeFiltersFromPayload(payload)
  const selected = selectedKeysFromPayload(payload)

  if (isReRenderAction(action)) {
    return renderSearchOrRemove(
      request,
      h,
      query,
      withRemovalApplied(action, selected),
      typeFilters
    )
  }

  if (selected.length === 0) {
    return renderSelectionRequired(request, h, query, selected, typeFilters)
  }

  return commitSelection(request, h, selected)
}

export const routes = kit.pageRoutes(page, { get, post })

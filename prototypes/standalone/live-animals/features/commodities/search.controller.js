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

/** One commodity line = one commodity plus ONE species (inc-062). The pair is
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

const resultGroups = (query, selected) =>
  commodities.search(query).map((group) => ({
    legend: `${group.name} (${group.code})`,
    items: group.species.map((option) => {
      const key = `${group.name}|${option.value}`
      return {
        value: key,
        text: option.text,
        checked: selected.includes(key)
      }
    })
  }))

const selectedSummary = (selected) =>
  selected.map((key) => {
    const [name, species] = splitKey(key)
    const code = commodities.commodityCodeFor(name)
    const label = commodities.speciesLabel(species) ?? species
    return { key, text: `${name} (${code}) — ${label}` }
  })

const render = (request, h, journey, { query = '', selected, errors = {} }) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(),
      journey
    }),
    copy,
    query,
    results: resultGroups(query, selected),
    searched: query.trim() !== '',
    selectedSummary: selectedSummary(selected),
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(request, h, journey, { selected: storedKeys(answers) })
}

const seedLine = (key) => {
  const [commoditySelection, speciesSelection] = splitKey(key)
  return {
    commoditySelection,
    speciesSelection,
    numberOfPackages: '',
    numberOfAnimalsQuantity: ''
  }
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const action = payload.action ?? ''
  const query = payload.search ?? ''
  let selected = selectedKeysFromPayload(payload)

  if (action === 'search' || action.startsWith('remove:')) {
    if (action.startsWith('remove:')) {
      const removed = action.slice('remove:'.length)
      selected = selected.filter((key) => key !== removed)
    }
    const { journey } = await state.get(request, h)
    return render(request, h, journey, { query, selected })
  }

  if (selected.length === 0) {
    const { journey } = await state.get(request, h)
    return render(request, h, journey, {
      query,
      selected,
      errors: { search: copy.errors.selectCommodity }
    })
  }

  // Batch-create: one line per selected species. A line whose species stays
  // selected keeps ALL its data (per-species values, nested identifier
  // records); a deselected species' line is removed with wipe semantics.
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

export const routes = kit.pageRoutes(page, { get, post })

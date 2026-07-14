import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, integerInRange, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'
import * as commodities from '../../services/commodities/index.js'
import { commoditiesPage, consignmentDetailsPage as page } from './page.js'
import { lineKey } from './search.controller.js'

export const meta = { ...page, collects: [] }
const view = `${TEMPLATES}/features/commodities/consignment-details`

export const packagesApply = (commoditySelection) =>
  commodities.packageCountCommodities().includes(commoditySelection)

const animalsField = (index) => `numberOfAnimalsQuantity-${index}`
const packagesField = (index) => `numberOfPackages-${index}`

const fieldsFor = (lines) =>
  compose(
    ...lines.flatMap(({ index, entry }) => [
      integerInRange(animalsField(index), {
        min: 1,
        message: 'Number of animals must be a whole number, like 25'
      }),
      ...(packagesApply(entry.commoditySelection)
        ? [
            integerInRange(packagesField(index), {
              min: 1,
              message: 'Number of packages must be a whole number, like 5'
            })
          ]
        : [])
    ])
  )

// One table row + quantity block group per commodity, one species block per
// line — the design's Consignment details page over the line-per-species
// store (design 01-14/15).
const buildGroups = (request, lines, values, errors) => {
  const groups = new Map()
  for (const { index, entry } of lines) {
    const name = entry.commoditySelection
    if (!groups.has(name)) {
      groups.set(name, {
        name,
        code: commodities.commodityCodeFor(name) ?? '',
        showPackages: packagesApply(name),
        removeHref: kit.withChangeContext(
          request,
          pagePath(`${page.slug}/${encodeURIComponent(name)}/remove`)
        ),
        lines: []
      })
    }
    groups.get(name).lines.push({
      index,
      speciesText:
        commodities.speciesLabel(entry.speciesSelection) ??
        entry.speciesSelection,
      animalsField: animalsField(index),
      packagesField: packagesField(index),
      animalsValue: values[animalsField(index)] ?? '',
      packagesValue: values[packagesField(index)] ?? '',
      animalsError: errors[animalsField(index)],
      packagesError: errors[packagesField(index)],
      identifiersHref: kit.withChangeContext(
        request,
        pagePath(`commodities/${index}/identifiers`)
      )
    })
  }
  return [...groups.values()]
}

const storedValues = (lines) => {
  const values = {}
  for (const { index, entry } of lines) {
    values[animalsField(index)] = entry.numberOfAnimalsQuantity ?? ''
    values[packagesField(index)] = entry.numberOfPackages ?? ''
  }
  return values
}

const payloadValues = (payload, lines) => {
  const values = {}
  for (const { index } of lines) {
    values[animalsField(index)] = (payload[animalsField(index)] ?? '').trim()
    values[packagesField(index)] = (payload[packagesField(index)] ?? '').trim()
  }
  return values
}

const render = (request, h, journey, lines, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Consignment details', {
      backLink: kit.withChangeContext(request, pagePath(commoditiesPage.slug)),
      journey
    }),
    heading: 'Consignment details',
    hasLines: lines.length > 0,
    emptyText: 'You have not added any commodities yet.',
    addHref: kit.withChangeContext(request, pagePath(commoditiesPage.slug)),
    addText: lines.length > 0 ? 'Add another commodity' : 'Add a commodity',
    groups: buildGroups(request, lines, values, errors),
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const linesOf = (answers) => state.collectionView(answers, ['commodityLines'])

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  const lines = linesOf(answers)
  return render(request, h, journey, lines, storedValues(lines))
}

const post = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  const lines = linesOf(answers)
  const payload = request.payload ?? {}
  const values = payloadValues(payload, lines)
  const { errors } = validate(fieldsFor(lines), payload)
  if (errors) return render(request, h, journey, lines, values, errors)

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

const getRemove = async (request, h) => {
  const { answers } = await state.get(request, h)
  const kept = (answers.commodityLines ?? []).filter(
    (entry) => entry.commoditySelection !== request.params.commodity
  )
  await state.reconcileEntriesAt(request, h, ['commodityLines'], lineKey, kept)
  return h.redirect(kit.withChangeContext(request, pagePath(page.slug)))
}

export const routes = [
  ...kit.pageRoutes(page, { get, post }),
  {
    method: 'GET',
    path: pagePath(`${page.slug}/{commodity}/remove`),
    options: open,
    handler: getRemove
  }
]

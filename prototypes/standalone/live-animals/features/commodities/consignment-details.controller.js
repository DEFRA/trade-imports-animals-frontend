import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, integerInRange, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import * as commodities from '../../services/commodities/index.js'
import {
  animalIdentificationPage,
  commoditiesPage,
  consignmentDetailsPage as page
} from './page.js'
import { lineKey } from './search.controller.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'
import { copy as sharedEn } from '../../shared/copy.en.js'
import { copy as sharedCy } from '../../shared/copy.cy.js'

export const meta = { ...page, collects: [] }
const view = `${TEMPLATES}/features/commodities/consignment-details`

const copy = copyFor({ en, cy }).consignmentDetails
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

export const packagesApply = (commoditySelection) =>
  commodities.packageCountCommodities().includes(commoditySelection)

const animalsField = (index) => `numberOfAnimalsQuantity-${index}`
const packagesField = (index) => `numberOfPackages-${index}`

const fieldsFor = (lines) =>
  compose(
    ...lines.flatMap(({ index, entry }) => [
      integerInRange(animalsField(index), {
        min: 1,
        message: copy.errors.animalsWholeNumber
      }),
      ...(packagesApply(entry.commoditySelection)
        ? [
            integerInRange(packagesField(index), {
              min: 1,
              message: copy.errors.packagesWholeNumber
            })
          ]
        : [])
    ])
  )

// One table row + quantity block group per commodity, one species block per
// line — the design's Consignment details page over the line-per-species
// store (design 01-14/15).
const groupLine = ({ index, entry }, values, errors) => ({
  index,
  speciesText:
    commodities.speciesLabel(entry.speciesSelection) ?? entry.speciesSelection,
  animalsField: animalsField(index),
  packagesField: packagesField(index),
  animalsValue: values[animalsField(index)] ?? '',
  packagesValue: values[packagesField(index)] ?? '',
  animalsError: errors[animalsField(index)],
  packagesError: errors[packagesField(index)]
})

const buildGroups = (request, lines, values, errors) => {
  const names = [...new Set(lines.map(({ entry }) => entry.commoditySelection))]
  return names.map((name) => ({
    name,
    code: commodities.commodityCodeFor(name) ?? '',
    showPackages: packagesApply(name),
    removeHref: kit.withChangeContext(
      request,
      pagePath(`${page.slug}/${encodeURIComponent(name)}/remove`)
    ),
    lines: lines
      .filter(({ entry }) => entry.commoditySelection === name)
      .map((line) => groupLine(line, values, errors))
  }))
}

const storedValues = (lines) =>
  Object.fromEntries(
    lines.flatMap(({ index, entry }) => [
      [animalsField(index), entry.numberOfAnimalsQuantity ?? ''],
      [packagesField(index), entry.numberOfPackages ?? '']
    ])
  )

const payloadValues = (payload, lines) =>
  Object.fromEntries(
    lines.flatMap(({ index }) => [
      [animalsField(index), (payload[animalsField(index)] ?? '').trim()],
      [packagesField(index), (payload[packagesField(index)] ?? '').trim()]
    ])
  )

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
      backLink: kit.withChangeContext(request, pagePath(commoditiesPage.slug)),
      journey
    }),
    copy,
    hasLines: lines.length > 0,
    addHref: kit.withChangeContext(request, pagePath(commoditiesPage.slug)),
    addText: lines.length > 0 ? copy.addAnother : copy.addFirst,
    groups: buildGroups(request, lines, values, errors),
    errors,
    errorSummary: errorSummary ?? kit.errorSummary(errors)
  })

const linesOf = (answers) => state.collectionView(answers, ['commodityLines'])

// The count-drop rule (inc-063, c-031 ruling): lowering a species' animal
// count below its existing identifier-record count BLOCKS the save — never
// silently trim. The error names the species and the summary links straight
// to that species' card on the identification surface.
const countDropIssues = (request, lines, values) =>
  lines.flatMap(({ index, entry }) => {
    const records = (entry.animalIdentifiers ?? []).length
    const value = values[animalsField(index)]
    if (records === 0 || value === '') return []
    const entered = Number(value)
    if (!Number.isInteger(entered) || entered >= records) return []
    const species =
      commodities.speciesLabel(entry.speciesSelection) ?? entry.speciesSelection
    return [
      {
        field: animalsField(index),
        text: copy.errors.countDrop(records, species, entered),
        href: `${kit.withChangeContext(
          request,
          pagePath(animalIdentificationPage.slug)
        )}#identification-card-${index}`
      }
    ]
  })

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

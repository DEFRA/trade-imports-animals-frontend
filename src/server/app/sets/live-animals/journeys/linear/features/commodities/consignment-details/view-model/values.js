import { animalsField, packagesField } from '../fields.js'
import { lineKey } from '../../search/selection/line-key.js'
import { packagesApply } from '../../../check-answers/view-model/applicability.js'

export const formValue = (value) =>
  typeof value === 'number' ? value.toString() : (value ?? '')

export const storedValues = (lines) =>
  Object.fromEntries(
    lines.flatMap(({ index, entry }) => [
      [animalsField(index), formValue(entry.numberOfAnimalsQuantity)],
      [packagesField(index), entry.numberOfPackages ?? '']
    ])
  )

export const payloadValues = (payload, lines) =>
  Object.fromEntries(
    lines.flatMap(({ index }) => [
      [animalsField(index), (payload[animalsField(index)] ?? '').trim()],
      [packagesField(index), (payload[packagesField(index)] ?? '').trim()]
    ])
  )

const postedIndexByKey = (postedLines) =>
  new Map(postedLines.map(({ index, entry }) => [lineKey(entry), index]))

const renderedFieldsFor = (entry) =>
  packagesApply(entry.commodityCode)
    ? [animalsField, packagesField]
    : [animalsField]

export const survivorForm = (postedLines, payload, survivors) => {
  const postedIndexOfKey = postedIndexByKey(postedLines)
  const missingCountKeys = []
  const posted = []
  for (const { index, entry } of survivors) {
    const postedIndex = postedIndexOfKey.get(lineKey(entry))
    let missesARenderedCount = false
    for (const fieldOf of renderedFieldsFor(entry)) {
      const postedField = fieldOf(postedIndex)
      if (Object.hasOwn(payload, postedField)) {
        posted.push([fieldOf(index), (payload[postedField] ?? '').trim()])
      } else {
        missesARenderedCount = true
      }
    }
    if (missesARenderedCount) {
      missingCountKeys.push(lineKey(entry))
    }
  }
  return {
    values: { ...storedValues(survivors), ...Object.fromEntries(posted) },
    missingCountKeys
  }
}

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

export const survivorValues = (postedLines, payload, survivors) => {
  const postedIndexOfKey = postedIndexByKey(postedLines)
  const posted = survivors.flatMap(({ index, entry }) => {
    const postedIndex = postedIndexOfKey.get(lineKey(entry))
    const postedAnimalsField = animalsField(postedIndex)
    const postedPackagesField = packagesField(postedIndex)
    return [
      ...(Object.hasOwn(payload, postedAnimalsField)
        ? [[animalsField(index), (payload[postedAnimalsField] ?? '').trim()]]
        : []),
      ...(Object.hasOwn(payload, postedPackagesField)
        ? [[packagesField(index), (payload[postedPackagesField] ?? '').trim()]]
        : [])
    ]
  })
  return { ...storedValues(survivors), ...Object.fromEntries(posted) }
}

export const survivorKeysMissingRenderedCount = (
  postedLines,
  payload,
  survivors
) => {
  const postedIndexOfKey = postedIndexByKey(postedLines)
  return survivors
    .filter(({ entry }) => {
      const postedIndex = postedIndexOfKey.get(lineKey(entry))
      const missingAnimalsField = !Object.hasOwn(
        payload,
        animalsField(postedIndex)
      )
      const missingPackagesField =
        packagesApply(entry.commodityCode) &&
        !Object.hasOwn(payload, packagesField(postedIndex))
      return missingAnimalsField || missingPackagesField
    })
    .map(({ entry }) => lineKey(entry))
}

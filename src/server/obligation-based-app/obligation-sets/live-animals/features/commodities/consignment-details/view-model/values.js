import { animalsField, packagesField } from '../fields.js'

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

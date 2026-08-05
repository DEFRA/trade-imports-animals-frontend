import {
  descriptionFor,
  isPlantsForPlanting
} from '../../../../../services/commodities/index.js'
import { packageTypeOptions } from '../../../../../services/reference/package-types.js'
import { quantityTypeOptions } from '../../../../../services/reference/quantity-types.js'
import { BULK_FIELDS, LINE_FIELDS, bulkField, lineField } from './fields.js'

const textValue = (value) =>
  typeof value === 'boolean' || typeof value === 'number'
    ? String(value)
    : (value ?? '')

export const EMPTY_BULK_VALUES = Object.fromEntries(
  BULK_FIELDS.map((name) => [bulkField(name), ''])
)

export const storedValues = (lines) =>
  Object.fromEntries(
    lines.flatMap(({ index, entry }) =>
      LINE_FIELDS.map((name) => [
        lineField(name, index),
        textValue(entry[name])
      ])
    )
  )

export const payloadValues = (payload, lines) =>
  Object.fromEntries(
    lines.flatMap(({ index }) =>
      LINE_FIELDS.map((name) => {
        const field = lineField(name, index)
        return [field, String(payload[field] ?? '').trim()]
      })
    )
  )

export const bulkValues = (payload = {}) =>
  Object.fromEntries(
    BULK_FIELDS.map((name) => {
      const field = bulkField(name)
      return [field, String(payload[field] ?? '').trim()]
    })
  )

const optionItems = (placeholder, options, value) => [
  { value: '', text: placeholder, selected: value === '' },
  ...options.map((option) => ({ ...option, selected: value === option.value }))
]

const totalOf = (lines, values, name) =>
  lines.reduce((total, { index }) => {
    const value = Number(values[lineField(name, index)])
    return total + (Number.isFinite(value) ? value : 0)
  }, 0)

const interpolate = (template, values) =>
  Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template
  )

const controlContext = (copy, label, commodity) =>
  interpolate(copy.controlContext, { label, commodity })

const optionContext = (copy, option, legend, commodity) =>
  interpolate(copy.optionContext, { option, legend, commodity })

export const pageModel = (lines, values, bulk, errors, copy) => {
  const renderedLines = lines.map(({ index, entry }) => {
    const code = entry.commoditySelection
    const description = descriptionFor(code) ?? ''
    const context = `${code} ${description}`.trim()
    const valueFor = (name) => values[lineField(name, index)] ?? ''
    const errorFor = (name) => errors[lineField(name, index)]
    return {
      index,
      code,
      description,
      context,
      showFinishedOrPropagated: isPlantsForPlanting(code),
      labels: Object.fromEntries(
        LINE_FIELDS.map((name) => [
          name,
          controlContext(
            copy,
            copy.fields[name].label ?? copy.fields[name].legend,
            context
          )
        ])
      ),
      optionLabels: {
        controlledAtmosphereContainer: {
          yes: optionContext(
            copy,
            copy.fields.controlledAtmosphereContainer.options.yes,
            copy.fields.controlledAtmosphereContainer.legend,
            context
          ),
          no: optionContext(
            copy,
            copy.fields.controlledAtmosphereContainer.options.no,
            copy.fields.controlledAtmosphereContainer.legend,
            context
          )
        },
        finishedOrPropagated: {
          finished: controlContext(
            copy,
            copy.fields.finishedOrPropagated.options.finished,
            context
          ),
          propagated: controlContext(
            copy,
            copy.fields.finishedOrPropagated.options.propagated,
            context
          )
        },
        intendedForFinalUsers: {
          yes: optionContext(
            copy,
            copy.fields.intendedForFinalUsers.options.yes,
            copy.fields.intendedForFinalUsers.legend,
            context
          ),
          no: optionContext(
            copy,
            copy.fields.intendedForFinalUsers.options.no,
            copy.fields.intendedForFinalUsers.legend,
            context
          )
        }
      },
      values: Object.fromEntries(
        LINE_FIELDS.map((name) => [name, valueFor(name)])
      ),
      errors: Object.fromEntries(
        LINE_FIELDS.map((name) => [name, errorFor(name)])
      ),
      fields: Object.fromEntries(
        LINE_FIELDS.map((name) => [name, lineField(name, index)])
      ),
      packageTypeItems: optionItems(
        copy.fields.packageType.placeholder,
        packageTypeOptions,
        valueFor('packageType')
      ),
      quantityTypeItems: optionItems(
        copy.fields.quantityType.placeholder,
        quantityTypeOptions,
        valueFor('quantityType')
      ),
      totals: {
        packages: Number(valueFor('numberOfPackages')) || 0,
        netWeight: Number(valueFor('netWeight')) || 0
      }
    }
  })

  return {
    lines: renderedLines,
    bulk: {
      values: bulk,
      errors: Object.fromEntries(
        BULK_FIELDS.map((name) => [name, errors[bulkField(name)]])
      ),
      fields: Object.fromEntries(
        BULK_FIELDS.map((name) => [name, bulkField(name)])
      ),
      packageTypeItems: optionItems(
        copy.fields.packageType.placeholder,
        packageTypeOptions,
        bulk[bulkField('packageType')]
      ),
      quantityTypeItems: optionItems(
        copy.fields.quantityType.placeholder,
        quantityTypeOptions,
        bulk[bulkField('quantityType')]
      )
    },
    totals: {
      packages: totalOf(lines, values, 'numberOfPackages'),
      netWeight: totalOf(lines, values, 'netWeight')
    }
  }
}

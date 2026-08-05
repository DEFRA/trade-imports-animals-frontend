import { describe, expect, it } from 'vitest'

import { featureEvaluationBindings } from './evaluation.js'

const controllerWrittenInputs = new Map([
  ['transport.arrivalDate', { day: '4', month: '8', year: '2026' }],
  ['transport.arrivalTime', { hour: '14', minute: '50' }],
  ['goods-movement.usingGvms', 'yes']
])

const customConverters = featureEvaluationBindings.flatMap((feature) =>
  feature.bindings
    .filter((binding) => binding.convert.name !== 'identity')
    .map((binding) => ({
      name: `${feature.name}.${binding.field}`,
      convert: binding.convert
    }))
)

describe('plant-products feature evaluation converters', () => {
  it('pins a controller-written input shape for every registered custom converter', () => {
    expect(customConverters.map(({ name }) => name)).toEqual([
      ...controllerWrittenInputs.keys()
    ])
  })

  it.each(customConverters)(
    '$name remains idempotent when fulfilments are rebuilt',
    ({ name, convert }) => {
      const once = convert(controllerWrittenInputs.get(name))

      expect(convert(once)).toEqual(once)
    }
  )
})

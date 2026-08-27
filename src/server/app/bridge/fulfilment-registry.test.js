import { describe, expect, it } from 'vitest'
import { feature, grouped, scalar } from './fulfilment-bindings.js'
import {
  createFulfilmentRegistry,
  fulfilmentRegistry
} from './fulfilment-registry.js'
import { obligationSet } from '../model/obligations/manifest.js'

const featureEvaluationBindings = fulfilmentRegistry.features
const { commodityLine, countryOfOrigin, earTag } = obligationSet()

describe('#createFulfilmentRegistry', () => {
  it('Should accept the complete feature-owned registry', () => {
    expect(() =>
      createFulfilmentRegistry(featureEvaluationBindings)
    ).not.toThrow()
  })

  it('Should reject missing obligation ownership', () => {
    const withoutOrigin = featureEvaluationBindings.filter(
      ({ name }) => name !== 'origin'
    )
    expect(() => createFulfilmentRegistry(withoutOrigin)).toThrow(
      /owned by no feature.*countryOfOrigin/
    )
  })

  it('Should reject duplicate obligation ownership', () => {
    const duplicate = feature('duplicate-origin', [
      scalar({ field: 'countryOfOrigin', obligation: countryOfOrigin })
    ])
    expect(() =>
      createFulfilmentRegistry([...featureEvaluationBindings, duplicate])
    ).toThrow(/owned by both "origin" and "duplicate-origin"/)
  })

  it('Should reject a grouped binding with the wrong collection path', () => {
    const commodities = featureEvaluationBindings.find(
      ({ name }) => name === 'commodities'
    )
    const wronglyPathed = feature('commodities', [
      ...commodities.bindings.filter(({ obligation }) => obligation !== earTag),
      grouped({
        field: 'animalIdentifierEarTag',
        obligation: earTag,
        groups: [
          {
            field: 'commodityLines',
            token: 'line',
            obligation: commodityLine
          }
        ]
      })
    ])
    const registryWithWrongPath = featureEvaluationBindings.map((bindings) =>
      bindings === commodities ? wronglyPathed : bindings
    )
    expect(() => createFulfilmentRegistry(registryWithWrongPath)).toThrow(
      /requires depth 2/
    )
  })

  it('Should reject a path containing store-path metacharacters', () => {
    const invalidPath = feature('invalid-path', [
      scalar({ field: 'country.ofOrigin', obligation: countryOfOrigin })
    ])
    expect(() =>
      createFulfilmentRegistry([invalidPath], [countryOfOrigin])
    ).toThrow(/invalid store field/)
  })

  it('Should reject a field containing the fulfilment-id delimiter `:`', () => {
    const invalidField = feature('invalid-field', [
      scalar({ field: 'country:ofOrigin', obligation: countryOfOrigin })
    ])
    expect(() =>
      createFulfilmentRegistry([invalidField], [countryOfOrigin])
    ).toThrow(/invalid store field/)
  })
})

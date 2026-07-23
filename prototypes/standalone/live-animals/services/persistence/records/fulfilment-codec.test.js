import { describe, expect, test } from 'vitest'
import { characterisationCorpus } from '../../../bridge/fixtures/characterisation-corpus.js'
import { answersToFulfilments } from '../../../bridge/fulfilments.js'
import { createObligationEvaluator } from '../../../model/obligations/evaluator.js'
import {
  commodityCode,
  earTag,
  placeOfOrigin,
  reasonForImport,
  transitedCountries
} from '../../../model/obligations/obligations.js'
import {
  decodePersistedFulfilment,
  encodeEvaluatorFulfilments
} from './fulfilment-codec.js'

const evaluator = createObligationEvaluator()

const extraMapCorpus = [
  {
    name: 'explicit-non-manifest-key-order',
    map: {
      [earTag.id]: {
        'line1/unit2': '',
        'line0/unit0': 'UK123456789012'
      },
      [reasonForImport.id]: 'internalMarket',
      [commodityCode.id]: {
        line1: 'Horse',
        line0: 'Cow'
      }
    }
  },
  {
    name: 'opaque-scalar-values',
    map: {
      [transitedCountries.id]: ['FR', 'BE'],
      [placeOfOrigin.id]: {
        name: 'Holding',
        addressLine1: '1 Field Lane',
        country: 'United Kingdom'
      },
      [reasonForImport.id]: ''
    }
  }
]

const mapCorpus = [
  ...characterisationCorpus.map(({ name, answers }) => ({
    name,
    map: answersToFulfilments(answers)
  })),
  ...extraMapCorpus
]

describe('persisted fulfilment codec', () => {
  test.each(mapCorpus)(
    'Should losslessly round-trip the $name evaluator map',
    ({ map }) => {
      const encoded = encodeEvaluatorFulfilments(map)
      const decoded = decodePersistedFulfilment(encoded)

      expect(decoded).toEqual(map)
      expect(JSON.stringify(decoded)).toBe(JSON.stringify(map))
      expect(encodeEvaluatorFulfilments(decoded)).toEqual(encoded)
      expect(JSON.stringify(encodeEvaluatorFulfilments(decoded))).toBe(
        JSON.stringify(encoded)
      )
    }
  )

  test('Should emit the canonical entry and record field shapes in input order', () => {
    const persisted = [
      {
        value: 'internalMarket',
        obligationId: reasonForImport.id
      },
      {
        records: [
          { value: 'Cow', fulfilmentId: 'line1' },
          { value: 'Horse', fulfilmentId: 'line0' }
        ],
        obligationId: commodityCode.id
      }
    ]

    expect(
      JSON.stringify(
        encodeEvaluatorFulfilments(decodePersistedFulfilment(persisted))
      )
    ).toBe(
      JSON.stringify([
        {
          obligationId: reasonForImport.id,
          value: 'internalMarket'
        },
        {
          obligationId: commodityCode.id,
          records: [
            { fulfilmentId: 'line1', value: 'Cow' },
            { fulfilmentId: 'line0', value: 'Horse' }
          ]
        }
      ])
    )
  })

  test.each(characterisationCorpus)(
    'Should pass both golden-equivalence gates for $name',
    ({ answers }) => {
      const oldMap = answersToFulfilments(answers)
      const decodedMap = decodePersistedFulfilment(
        encodeEvaluatorFulfilments(oldMap)
      )

      expect(JSON.stringify(decodedMap)).toBe(JSON.stringify(oldMap))

      const oldEvaluation = evaluator.evaluate(oldMap)
      const decodedEvaluation = evaluator.evaluate(decodedMap)
      expect(JSON.stringify(decodedEvaluation.fulfilments)).toBe(
        JSON.stringify(oldEvaluation.fulfilments)
      )
      expect(JSON.stringify(decodedEvaluation.obligations)).toBe(
        JSON.stringify(oldEvaluation.obligations)
      )
    }
  )

  test.each([
    {
      name: 'duplicate obligation ids',
      persisted: [
        { obligationId: reasonForImport.id, value: 'transit' },
        { obligationId: reasonForImport.id, value: 'internalMarket' }
      ],
      error: /duplicate obligationId/
    },
    {
      name: 'duplicate fulfilment ids within one obligation',
      persisted: [
        {
          obligationId: commodityCode.id,
          records: [
            { fulfilmentId: 'line0', value: 'Cow' },
            { fulfilmentId: 'line0', value: 'Horse' }
          ]
        }
      ],
      error: /duplicate fulfilmentId/
    },
    {
      name: 'an entry with both value and records',
      persisted: [
        {
          obligationId: reasonForImport.id,
          value: 'transit',
          records: [{ fulfilmentId: 'line0', value: 'Cow' }]
        }
      ],
      error: /exactly one of value or records/
    },
    {
      name: 'an entry with neither value nor records',
      persisted: [{ obligationId: reasonForImport.id }],
      error: /exactly one of value or records/
    },
    {
      name: 'an empty records array',
      persisted: [{ obligationId: commodityCode.id, records: [] }],
      error: /non-empty array/
    },
    {
      name: 'records for a current scalar obligation',
      persisted: [
        {
          obligationId: reasonForImport.id,
          records: [{ fulfilmentId: 'line0', value: 'transit' }]
        }
      ],
      error: /must use value/
    },
    {
      name: 'value for a current grouped obligation',
      persisted: [{ obligationId: commodityCode.id, value: 'Cow' }],
      error: /must use records/
    },
    {
      name: 'a composite id deeper than the current within chain',
      persisted: [
        {
          obligationId: commodityCode.id,
          records: [{ fulfilmentId: 'line0/unit0', value: 'Cow' }]
        }
      ],
      error: /requires depth 1/
    },
    {
      name: 'a composite id shallower than the current within chain',
      persisted: [
        {
          obligationId: earTag.id,
          records: [{ fulfilmentId: 'line0', value: 'UK123456789012' }]
        }
      ],
      error: /requires depth 2/
    },
    {
      name: 'a segment without a trailing numeric index',
      persisted: [
        {
          obligationId: earTag.id,
          records: [
            { fulfilmentId: 'line0/unit-unknown', value: 'UK123456789012' }
          ]
        }
      ],
      error: /trailing numeric index/
    }
  ])('Should reject $name', ({ persisted, error }) => {
    expect(() => decodePersistedFulfilment(persisted)).toThrow(error)
  })

  test('Should preserve unknown UUID entries before the evaluator drops them', () => {
    const unknownScalarId = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
    const unknownGroupedId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
    const persisted = [
      {
        obligationId: unknownScalarId,
        value: { legacyValue: true }
      },
      {
        obligationId: unknownGroupedId,
        records: [
          { fulfilmentId: 'historic2', value: 'first' },
          { fulfilmentId: 'historic0/record3', value: { untouched: true } }
        ]
      }
    ]

    const decoded = decodePersistedFulfilment(persisted)

    expect(decoded).toHaveProperty(unknownScalarId, { legacyValue: true })
    expect(decoded).toHaveProperty(unknownGroupedId, {
      historic2: 'first',
      'historic0/record3': { untouched: true }
    })
    expect(encodeEvaluatorFulfilments(decoded)).toEqual(persisted)

    const evaluated = evaluator.evaluate(decoded)
    expect(evaluated.fulfilments).not.toHaveProperty(unknownScalarId)
    expect(evaluated.fulfilments).not.toHaveProperty(unknownGroupedId)
    expect(evaluated.fulfilments).toEqual({})
  })
})

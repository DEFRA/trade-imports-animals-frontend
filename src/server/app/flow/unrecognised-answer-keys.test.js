import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { unrecognisedAnswerKeys } from '../bridge/obligation-source.js'

const happyPath = JSON.parse(
  readFileSync(
    new URL(
      '../sets/live-animals/journeys/linear/flow/fixtures/happy-path.json',
      import.meta.url
    )
  )
).values

describe('#unrecognisedAnswerKeys', () => {
  it('Should recognise the full happy-path fixture end to end', () => {
    expect(unrecognisedAnswerKeys(happyPath)).toEqual([])
  })

  it('Should report a typo of an obligation name at top level', () => {
    expect(
      unrecognisedAnswerKeys({ animalIdentifierHorseName: 'Dobbin' })
    ).toEqual([{ key: 'animalIdentifierHorseName', path: '(top level)' }])
  })

  it('Should report a typo inside a nested collection entry, with its path', () => {
    const answers = {
      commodityLines: [
        {
          commodityCode: '0101',
          animalIdentifiers: [{ animalIdentifierHorseName: 'Dobbin' }]
        }
      ]
    }
    expect(unrecognisedAnswerKeys(answers)).toEqual([
      {
        key: 'animalIdentifierHorseName',
        path: 'commodityLines[0].animalIdentifiers[0]'
      }
    ])
  })

  it('Should report an unknown key on a documents entry but allow its manifest obligations', () => {
    const answers = {
      documents: [
        {
          accompanyingDocumentType: 'ITAHC',
          uploadId: 'u-1',
          filename: 'itahc.pdf',
          bogusKey: 'x'
        }
      ]
    }
    expect(unrecognisedAnswerKeys(answers)).toEqual([
      { key: 'bogusKey', path: 'documents[0]' }
    ])
  })

  it('Should recognise the flow-only and system keys', () => {
    expect(
      unrecognisedAnswerKeys({
        declaration: 'confirmed',
        referenceNumber: 'GBN-AG-26-0001'
      })
    ).toEqual([])
  })

  it('Should treat values below a leaf key as opaque', () => {
    expect(
      unrecognisedAnswerKeys({ consignor: { anything: { at: 'all' } } })
    ).toEqual([])
  })
})

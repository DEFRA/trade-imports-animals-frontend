import { describe, expect, it } from 'vitest'
import { entryComplete } from './collection-complete.js'
import { valueAt } from '../lib/path.js'
import { evaluateAnswers } from './evaluation.js'
import { commodityLine, completeCommodityLine } from '../engine/test-support.js'

const address = {
  name: 'Owner',
  address: {
    addressLine1: '1 Farm Lane',
    addressLine2: '',
    townOrCity: 'Yorkton',
    county: '',
    postcode: 'YO1 1AA',
    country: 'United Kingdom',
    phone: '01000 000000',
    email: 'owner@example.test'
  }
}

const completeLine = completeCommodityLine()

const partialLine = { commodityCode: '0102' }

const emptyLine = {}

const completeFlags = (answers, collectionPath) => {
  const entries = valueAt(answers, collectionPath) ?? []
  const evaluation = evaluateAnswers(answers)
  return entries.map((_entry, index) =>
    entryComplete(evaluation, collectionPath, index)
  )
}

describe('#entryComplete', () => {
  it('Should read a multi-line state — full / partial / empty', () => {
    const answers = { commodityLines: [completeLine, partialLine, emptyLine] }
    expect(completeFlags(answers, ['commodityLines'])).toEqual([
      true,
      false,
      false
    ])
  })

  it('Should read a multi-unit state — full unit complete', () => {
    const answers = {
      commodityLines: [
        commodityLine({
          commodityCode: '01061900',
          speciesLatinName: 'Felis catus',
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [
            { animalIdentifierPassport: 'P-1', permanentAddress: address },
            { animalIdentifierPassport: 'P-2', permanentAddress: address }
          ]
        })
      ]
    }
    const path = ['commodityLines', 0, 'animalIdentifiers']
    expect(completeFlags(answers, path)).toEqual([true, true])
  })

  it('Should read a Bos taurus unit under 0102 without permanentAddress as complete', () => {
    const answers = {
      commodityLines: [
        commodityLine({
          commodityType: '16',
          numberOfAnimalsQuantity: '1',
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
        })
      ]
    }
    expect(completeFlags(answers, ['commodityLines'])).toEqual([true])
  })

  it('Should read a fully-empty nested unit as complete (never enumerated)', () => {
    const answers = {
      commodityLines: [
        commodityLine({
          numberOfAnimalsQuantity: '1',
          animalIdentifiers: [{}]
        })
      ]
    }
    const path = ['commodityLines', 0, 'animalIdentifiers']
    expect(completeFlags(answers, path)).toEqual([true])
  })

  it('Should treat an upload-only document as started but incomplete', () => {
    const answers = {
      documents: [{ uploadId: 'upload-001', filename: 'itahc-certificate.pdf' }]
    }
    expect(completeFlags(answers, ['documents'])).toEqual([false])
  })

  it('Should not let optional upload fields block a complete document', () => {
    const completeDocument = {
      accompanyingDocumentType: 'ITAHC',
      accompanyingDocumentAttachmentType: 'PDF',
      accompanyingDocumentReference: 'GBHC1234567890',
      accompanyingDocumentDateOfIssue: {
        day: '12',
        month: '12',
        year: '2025'
      }
    }
    const answers = {
      documents: [
        completeDocument,
        {
          ...completeDocument,
          uploadId: 'upload-001',
          filename: 'itahc-certificate.pdf'
        }
      ]
    }
    expect(completeFlags(answers, ['documents'])).toEqual([true, true])
  })
})

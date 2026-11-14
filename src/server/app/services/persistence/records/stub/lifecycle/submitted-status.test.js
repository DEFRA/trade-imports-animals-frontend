import { describe, expect, it } from 'vitest'
import {
  SUBMITTED,
  SUBMITTED_ACTION_REQUIRED
} from '../../../../../engine/persistence/records.js'
import { assembleFulfilments } from '../../../../../bridge/assemble-fulfilments.js'
import { encodeEvaluatorFulfilments } from '../../fulfilment-codec/index.js'
import { submittedStatusFor } from './submitted-status.js'

const persistedWithDocuments = (documents) =>
  encodeEvaluatorFulfilments(assembleFulfilments({ documents }))

describe('#submittedStatusFor', () => {
  it('Should record Submitted action required when no document was uploaded', () => {
    expect(submittedStatusFor(persistedWithDocuments([]))).toBe(
      SUBMITTED_ACTION_REQUIRED
    )
  })

  it('Should record Submitted action required when only other document types were uploaded', () => {
    const persisted = persistedWithDocuments([
      { accompanyingDocumentType: 'COMMERCIAL_INVOICE' }
    ])

    expect(submittedStatusFor(persisted)).toBe(SUBMITTED_ACTION_REQUIRED)
  })

  it('Should record Submitted action required when only a veterinary health certificate was uploaded', () => {
    const persisted = persistedWithDocuments([
      { accompanyingDocumentType: 'VETERINARY_HEALTH_CERTIFICATE' }
    ])

    expect(submittedStatusFor(persisted)).toBe(SUBMITTED_ACTION_REQUIRED)
  })

  it('Should record Submitted when an ITAHC was uploaded', () => {
    const persisted = persistedWithDocuments([
      { accompanyingDocumentType: 'COMMERCIAL_INVOICE' },
      { accompanyingDocumentType: 'ITAHC' }
    ])

    expect(submittedStatusFor(persisted)).toBe(SUBMITTED)
  })
})

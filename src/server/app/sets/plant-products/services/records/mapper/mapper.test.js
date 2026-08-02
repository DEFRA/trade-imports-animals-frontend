import { describe, expect, it } from 'vitest'

import { fromDto } from './from-dto.js'
import { toDto } from './to-dto.js'

const SERVER_SET_FIELDS = [
  'referenceNumber',
  'status',
  'chedType',
  'ownership',
  'created',
  'updated',
  'expireAt',
  'submittedBaseline'
]

describe('plant-products notification mapper at the m0 boundary', () => {
  it('maps the empty m0 answers tree to an empty DTO', () => {
    expect(toDto({})).toEqual({})
  })

  it('round-trips the m0 answers tree', () => {
    const answers = {}

    expect(fromDto(toDto(answers))).toEqual(answers)
  })

  it('round-trips the country-of-origin code through origin.countryCode', () => {
    const answers = { countryOfOrigin: 'GB-SCT' }

    expect(toDto(answers)).toEqual({
      origin: { countryCode: 'GB-SCT' }
    })
    expect(fromDto(toDto(answers))).toEqual(answers)
  })

  it('omits server-set fields from the PUT content DTO', () => {
    const answers = Object.fromEntries(
      SERVER_SET_FIELDS.map((field) => [field, `answer-${field}`])
    )

    const dto = toDto(answers)

    for (const field of SERVER_SET_FIELDS) {
      expect(dto).not.toHaveProperty(field)
    }
  })

  it('does not invent homes for flow-only or accompanying-document answers', () => {
    expect(
      toDto({
        importType: 'plant-products',
        declaration: { agreed: true },
        accompanyingDocuments: [{ documentReference: 'PHYTO-COPY-001' }]
      })
    ).toEqual({})
  })

  it('drops server-set and unknown response fields and ignores embedded documents', () => {
    const dto = {
      referenceNumber: 'GBN-PP-26-ABC001',
      status: 'DRAFT',
      chedType: 'CHEDPP',
      ownership: { assignedOrganisationId: 'stub-org' },
      created: '2026-08-01T10:00:00',
      updated: '2026-08-01T11:00:00',
      expireAt: '2026-09-01T10:00:00',
      submittedBaseline: { status: 'DRAFT' },
      unknownBackendField: 'contract drift',
      accompanyingDocuments: [
        {
          documentType: 'PHYTOSANITARY_CERTIFICATE',
          documentReference: 'PHYTO-COPY-001'
        }
      ]
    }

    expect(fromDto(dto)).toEqual({})
  })

  it('treats null and absent DTOs as an empty answers tree', () => {
    expect(fromDto()).toEqual({})
    expect(fromDto(null)).toEqual({})
  })
})

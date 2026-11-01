import { describe, expect, it } from 'vitest'

import { documentTypes } from './document-types/index.js'
import { certificationPurposes } from './certification-purposes/index.js'

// The Mapper A vocabulary contract (pr-006, p-002 + p-024). These are the exact
// values the frontend emits to the backend; the backend accepts them — the
// accompanying-document type as the DocumentType enum (14 values) and
// certifiedFor as a free string carrying one of these 16 V4 slugs. Pinning them
// here catches a frontend drift away from the agreed set. The backend pins its
// own side (DocumentTypeTest, NotificationIT certifiedFor round-trip).

const DOCUMENT_TYPES = [
  'ITAHC',
  'VETERINARY_HEALTH_CERTIFICATE',
  'AIR_WAYBILL',
  'IMPORT_PERMIT',
  'LETTER_OF_AUTHORITY',
  'COMMERCIAL_INVOICE',
  'SEA_WAYBILL',
  'RAIL_WAYBILL',
  'BILL_OF_LADING',
  'CATCH_CERTIFICATE',
  'LABORATORY_SAMPLING_RESULTS_FOR_AFLATOXIN',
  'HEALTH_CERTIFICATE',
  'JOURNEY_LOG',
  'OTHER'
]

const CERTIFIED_FOR = [
  'further-keeping',
  'slaughter',
  'confined-establishment',
  'germinal-products',
  'registered-equine-animal',
  'travelling-circus-animal-act',
  'exhibition',
  'event-or-activity-near-borders',
  'release-into-the-wild',
  'dispatch-centre',
  'relaying-area-purification-centre',
  'ornamental-aquaculture-establishment',
  'technical-use',
  'quarantine-or-similar-establishment',
  'live-aquatic-animals-for-human-consumption',
  'other'
]

describe('Mapper A enum vocabulary contract', () => {
  it('Should emit exactly the 14 V4 accompanying-document types', () => {
    expect(documentTypes()).toEqual(DOCUMENT_TYPES)
  })

  it('Should emit exactly the 16 V4 certifiedFor values', () => {
    expect(certificationPurposes().map((purpose) => purpose.value)).toEqual(
      CERTIFIED_FOR
    )
  })
})

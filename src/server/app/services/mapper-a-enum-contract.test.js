import { describe, expect, it } from 'vitest'

import { documentTypes } from './document-types/index.js'
import { certificationPurposes } from './certification-purposes/index.js'

const DOCUMENT_TYPES = [
  'ITAHC',
  'VETERINARY_HEALTH_CERTIFICATE',
  'SELF_DECLARATION',
  'JOURNEY_LOG',
  'IMPORT_PERMIT',
  'CITES_PERMIT_OR_CERTIFICATE',
  'AIR_WAYBILL',
  'SEA_WAYBILL',
  'RAIL_WAYBILL',
  'BILL_OF_LADING',
  'COMMERCIAL_INVOICE',
  'PACKING_OR_SPECIES_LIST',
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
  it('Should emit exactly the pinned accompanying-document types, in the order the page offers them', () => {
    expect(documentTypes()).toEqual(DOCUMENT_TYPES)
  })

  it('Should emit exactly the pinned certifiedFor values', () => {
    expect(certificationPurposes().map((purpose) => purpose.value)).toEqual(
      CERTIFIED_FOR
    )
  })
})

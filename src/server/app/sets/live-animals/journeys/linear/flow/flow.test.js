import { describe, expect, it } from 'vitest'

import { sections } from './flow.js'

const SECTION_ORDER = [
  { id: 'start', pageIds: ['dashboard'] },
  {
    id: 'about-the-consignment',
    pageIds: ['origin', 'commodities', 'import-reason']
  },
  {
    id: 'description-of-the-goods',
    pageIds: [
      'consignmentDetails',
      'animalIdentification',
      'additional-details'
    ]
  },
  {
    id: 'transport-and-arrival',
    pageIds: ['port-of-entry', 'transit-countries', 'transporters']
  },
  { id: 'documents', pageIds: ['accompanying-documents'] },
  {
    id: 'consignment-parties',
    pageIds: ['cphNumber', 'permanentAddress', 'addresses']
  },
  { id: 'contact-address', pageIds: ['consignment-contact-select'] },
  {
    id: 'review',
    pageIds: ['notification-view', 'declaration', 'confirmation']
  }
]

describe('#sections — the journey is ordered as eight sections', () => {
  it('Should run the eight sections in the order Overview lists them', () => {
    expect(
      sections.map((section) => ({
        id: section.id,
        pageIds: section.pages.map((page) => page.id)
      }))
    ).toEqual(SECTION_ORDER)
  })
})

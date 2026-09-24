import { describe, expect, it } from 'vitest'

import { sections } from './flow.js'

// SCN-FLOW-001-A product-facing names, in Then order, mapped onto the
// section id and page ids flow.js actually exports.
const PRODUCT_SECTION_ORDER = [
  { id: 'start', then: 'the dashboard', pageIds: ['dashboard'] },
  { id: 'origin', then: 'origin of the import', pageIds: ['origin'] },
  {
    id: 'commodities',
    then: 'what are you importing and commodity details',
    pageIds: ['commodities', 'consignmentDetails']
  },
  {
    id: 'animalIdentification',
    then: 'identification details',
    pageIds: ['animalIdentification']
  },
  {
    id: 'consignment',
    then: 'import reason and additional details',
    pageIds: ['import-reason', 'additional-details']
  },
  {
    id: 'documents',
    then: 'upload documents',
    pageIds: ['accompanying-documents']
  },
  {
    id: 'addresses',
    then: 'consignment addresses and County Parish Holding',
    pageIds: ['addresses', 'cphNumber']
  },
  {
    id: 'transport',
    then: 'the transport pages',
    pageIds: ['port-of-entry', 'transit-countries', 'transporters']
  },
  {
    id: 'contact',
    then: 'contact address',
    pageIds: ['consignment-contact-select']
  },
  {
    id: 'review',
    then: 'check your answers, declaration and confirmation',
    pageIds: ['notification-view', 'declaration', 'confirmation']
  }
]

describe('#sections — the journey is ordered as ten sections', () => {
  it('Should run the ten product-facing sections in the specified order', () => {
    expect(
      sections.map((section) => ({
        id: section.id,
        pageIds: section.pages.map((page) => page.id)
      }))
    ).toEqual(PRODUCT_SECTION_ORDER.map(({ id, pageIds }) => ({ id, pageIds })))
  })
})

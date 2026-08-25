import { describe, expect, it } from 'vitest'

import { allFlowPages } from '../flow.js'
import { captionSections, sectionCaptionOf } from './index.js'
import { copy as en } from './copy/copy.en.js'

const ABOUT_THE_CONSIGNMENT = 'About the consignment'
const CONSIGNMENT_PARTIES = 'Consignment parties'
const TRANSPORT_AND_ARRIVAL = 'Transport and arrival'
const NEW_TRANSPORTER = 'Add a new transporter'

// The page a reader lands on, and the section it should name. One case per
// page so a mis-filed page names itself in the failure.
const CAPTIONED = [
  ['dashboard', 'Dashboard'],
  ['origin', ABOUT_THE_CONSIGNMENT],
  ['commodities', ABOUT_THE_CONSIGNMENT],
  ['consignmentDetails', ABOUT_THE_CONSIGNMENT],
  ['animalIdentification', ABOUT_THE_CONSIGNMENT],
  ['import-reason', ABOUT_THE_CONSIGNMENT],
  ['import-purpose', ABOUT_THE_CONSIGNMENT],
  ['destination-country', ABOUT_THE_CONSIGNMENT],
  ['port-of-exit', ABOUT_THE_CONSIGNMENT],
  ['exit-date', ABOUT_THE_CONSIGNMENT],
  ['additional-details', 'Commodity details'],
  ['addresses', CONSIGNMENT_PARTIES],
  ['cphNumber', CONSIGNMENT_PARTIES],
  ['transit-countries', 'Movement'],
  ['port-of-entry', TRANSPORT_AND_ARRIVAL],
  ['transporters', TRANSPORT_AND_ARRIVAL],
  ['transporters-select', NEW_TRANSPORTER],
  ['private-transporter-details', NEW_TRANSPORTER],
  ['accompanying-documents', 'Documents']
]

// Pages that open straight into their heading: the overview and the three
// pages that close the notification say nothing about a section, and the
// contact address is asked once rather than as part of one.
const BARE = [
  'consignment-contact-select',
  'notification-view',
  'declaration',
  'confirmation'
]

describe('#sectionCaptionOf — the section a page names above its heading', () => {
  it.each(CAPTIONED)('Should caption %s "%s"', (pageId, expected) => {
    expect(sectionCaptionOf(pageId)).toBe(expected)
  })

  it.each(BARE)('Should leave %s uncaptioned', (pageId) => {
    expect(sectionCaptionOf(pageId)).toBeUndefined()
  })

  it('Should leave a page it has never heard of uncaptioned', () => {
    expect(sectionCaptionOf('not-a-page')).toBeUndefined()
    expect(sectionCaptionOf(undefined)).toBeUndefined()
  })
})

describe('the caption map covers the journey', () => {
  it('Should decide every flow page, either captioning it or listing it as bare', () => {
    const undecided = allFlowPages
      .map((page) => page.id)
      .filter(
        (pageId) =>
          sectionCaptionOf(pageId) === undefined && !BARE.includes(pageId)
      )
    expect(
      undecided,
      'a new journey page must be given a caption or added to the bare list'
    ).toEqual([])
  })

  it('Should file each page under exactly one section', () => {
    const pageIds = captionSections.flatMap((section) =>
      section.pages.map((page) => page.id)
    )
    expect(pageIds).toHaveLength(new Set(pageIds).size)
  })

  it('Should back every section with a caption string', () => {
    for (const { id } of captionSections) {
      expect(en.sections[id], `${id} must have a caption`).toBeTruthy()
    }
  })

  it('Should leave no caption string unused by any section', () => {
    const sectionIds = captionSections.map((section) => section.id)
    expect(Object.keys(en.sections).toSorted()).toEqual(sectionIds.toSorted())
  })
})

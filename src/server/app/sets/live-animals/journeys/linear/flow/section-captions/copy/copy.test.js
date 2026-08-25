import { describe, expect, it } from 'vitest'

import { leaves, isCopyLeaf } from '../../../../../../../shared/copy-leaves.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('section-caption copy modules', () => {
  it.each([
    ['en', en],
    ['cy', cy]
  ])('Should keep every %s leaf valid copy', (locale, copy) => {
    for (const { path, value } of leaves(copy)) {
      expect(isCopyLeaf(value), `${locale}: ${path} must be copy`).toBe(true)
    }
  })

  it('Should name the sections Design release 1 names', () => {
    expect(en.sections).toEqual({
      dashboard: 'Dashboard',
      aboutTheConsignment: 'About the consignment',
      commodityDetails: 'Commodity details',
      consignmentParties: 'Consignment parties',
      movement: 'Movement',
      transportAndArrival: 'Transport and arrival',
      newTransporter: 'Add a new transporter',
      documents: 'Documents'
    })
  })
})

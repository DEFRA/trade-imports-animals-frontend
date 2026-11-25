import { describe, expect, it } from 'vitest'

import { itHoldsCopyAtEveryLeaf } from '../../../../../../../engine/copy-test-support.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('section-caption copy modules', () => {
  itHoldsCopyAtEveryLeaf(en, cy)

  it('Should name every journey section', () => {
    expect(en.sections).toEqual({
      dashboard: 'Dashboard',
      aboutTheConsignment: 'About the consignment',
      descriptionOfTheGoods: 'Description of the goods',
      additionalDetails: 'Commodity details',
      addresses: 'Addresses',
      movement: 'Movement',
      transportAndArrival: 'Transport and arrival',
      newTransporter: 'Add a new transporter',
      documents: 'Documents'
    })
  })
})

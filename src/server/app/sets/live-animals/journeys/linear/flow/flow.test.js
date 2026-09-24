import { describe, expect, it } from 'vitest'

import { sections } from './flow.js'

describe('#sections', () => {
  it("The journey's sections run in a fixed order", () => {
    expect(sections.map((section) => section.id)).toEqual([
      'start',
      'origin',
      'commodities',
      'animalIdentification',
      'consignment',
      'documents',
      'addresses',
      'transport',
      'contact',
      'review'
    ])
  })
})

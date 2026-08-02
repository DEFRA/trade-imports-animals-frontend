import { describe, expect, it } from 'vitest'

import { copy as cy } from './copy.cy.js'
import { copy as en } from './copy.en.js'

const shape = (value) =>
  Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      child !== null && typeof child === 'object' ? shape(child) : typeof child
    ])
  )

describe('plant-products import-type copy', () => {
  it('keeps English and Welsh structure-identical', () => {
    expect(shape(cy)).toEqual(shape(en))
  })

  it('pins the trace-confirmed English page copy', () => {
    expect(en).toEqual({
      title: 'What are you importing?',
      caption: 'About the consignment',
      legend: 'What are you importing?',
      importTypes: {
        'live-animals': 'Live animals',
        poao: 'Products of animal origin, germinal products or animal by-products',
        hrfnao: 'High risk food and feed of non-animal origin',
        plants: 'Plants, plant products and other objects'
      },
      continueButton: 'Save and continue',
      errors: {
        importTypeRequired: 'Select the type of import'
      },
      notAvailable: {
        title: 'You cannot use this service',
        onlyCovers:
          'This service currently only supports imports of plants, plant products and other objects.',
        changeAnswer: 'Go back and change your answer',
        ifImporting:
          'if you are importing plants, plant products or other objects.'
      }
    })
  })
})

import { describe, expect, it } from 'vitest'

import { SEED_SHAPES, seedSteps, values } from './seed-notification.js'

const stepFor = (slug) =>
  seedSteps(SEED_SHAPES.draft).find((step) => step.slug === slug)

describe('#seedSteps cph-number', () => {
  it('Should post the three parts the page asks for, split two, three and four', () => {
    expect(stepFor('cph-number').fields).toEqual({
      cphCounty: '12',
      cphParish: '345',
      cphHolding: '6789'
    })
  })

  it('Should send the fixture number, whichever way the fixture punctuates it', () => {
    const { cphCounty, cphParish, cphHolding } = stepFor('cph-number').fields

    expect(`${cphCounty}${cphParish}${cphHolding}`).toBe(
      values.countyParishHoldingCph.replace(/\D/g, '')
    )
  })
})

import { load } from 'cheerio'
import { describe, expect, it } from 'vitest'

import { SET_BASE } from '../../src/server/app/sets/live-animals/set.js'
import {
  journeyIdIn,
  SEED_SHAPES,
  seedSteps,
  submitNotification,
  values
} from './seed-notification.js'

const JOURNEY_ID = 'GBN-AG-26-DRAFT1'

const stepFor = (slug) =>
  seedSteps(SEED_SHAPES.draft).find((step) => step.slug === slug)

describe('#journeyIdIn', () => {
  it('Should read the id out of a Location carrying the set mount prefix', () => {
    expect(journeyIdIn(`${SET_BASE}/notifications/${JOURNEY_ID}`)).toBe(
      JOURNEY_ID
    )
  })

  it('Should stop at the first separator after the id', () => {
    expect(
      journeyIdIn(`${SET_BASE}/notifications/${JOURNEY_ID}/origin?change=1`)
    ).toBe(JOURNEY_ID)
  })

  it.each([
    ['the bare create path', `${SET_BASE}/notifications`],
    ['a path outside the set', '/somewhere-else'],
    ['no Location header at all', undefined]
  ])('Should answer empty for %s', (_shape, location) => {
    expect(journeyIdIn(location)).toBe('')
  })
})

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

describe('#submitNotification', () => {
  const notificationPath = (slug) =>
    `${SET_BASE}/notifications/${JOURNEY_ID}/${slug}`

  const pageWithToken = (token) => ({
    status: 200,
    location: null,
    crumb: 'test-crumb',
    heading: '',
    $: load(`<input type="hidden" name="concurrencyToken" value="${token}">`)
  })

  /** A server that renders the review at token 7, the declaration from the
   * review's Continue, and confirms a declared submit. */
  const fakeClient = () => {
    const posts = []
    return {
      posts,
      document: async () => pageWithToken('7'),
      submit: async (path, fields, crumb) => {
        posts.push({ path, fields, crumb })
        return fields.step === 'review'
          ? pageWithToken('7')
          : {
              status: 302,
              location: notificationPath('confirmation'),
              crumb: '',
              heading: '',
              $: load('')
            }
      }
    }
  }

  it("Should continue from the review, then declare at the review's token", async () => {
    const client = fakeClient()

    await submitNotification(client, JOURNEY_ID)

    expect(client.posts).toEqual([
      {
        path: notificationPath('declaration'),
        fields: { step: 'review', concurrencyToken: '7' },
        crumb: 'test-crumb'
      },
      {
        path: notificationPath('declaration'),
        fields: {
          step: 'declare',
          declaration: values.declaration,
          concurrencyToken: '7'
        },
        crumb: 'test-crumb'
      }
    ])
  })
})

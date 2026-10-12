import { afterEach, describe, expect, it } from 'vitest'

import { config } from '../../../config/config.js'
import { copy } from './copy/copy.en.js'
import { LEVELS, TAG_CLASSES } from './levels.js'
import { pageLevelFor, pageMaturityContext } from './page-maturity.js'

const NOTIFICATION = '/live-animals/notifications/{journeyId}'
const ENABLED_KEY = 'pageMaturityBanner.enabled'
const originalEnabled = config.get(ENABLED_KEY)

describe('pageLevelFor', () => {
  it.each([
    ['/live-animals', LEVELS.exploring],
    [`${NOTIFICATION}/origin`, LEVELS.exploring],
    [`${NOTIFICATION}/transit-countries`, LEVELS.detailing],
    [`${NOTIFICATION}/declaration`, LEVELS.detailing]
  ])('Should return the level of the listed path %s', (routePath, level) => {
    expect(pageLevelFor(routePath)).toBe(level)
  })

  it('Should return undefined for an unlisted path', () => {
    expect(pageLevelFor('/auth/sign-out')).toBeUndefined()
  })

  it('Should return undefined for a path that only shares a prefix with a listed path', () => {
    expect(pageLevelFor(`${NOTIFICATION}/origin-x`)).toBeUndefined()
    expect(pageLevelFor('/live-animals-extra')).toBeUndefined()
    expect(pageLevelFor('/live-animals/templatesomething')).toBeUndefined()
  })

  it.each([undefined, ''])('Should return undefined for %j', (routePath) => {
    expect(pageLevelFor(routePath)).toBeUndefined()
  })

  it.each([
    '/live-animals/templates',
    '/live-animals/templates/new',
    '/live-animals/templates/{journeyId}',
    '/live-animals/templates/{journeyId}/transit-countries'
  ])('Should treat %s as Exploring through the templates section', (path) => {
    expect(pageLevelFor(path)).toBe(LEVELS.exploring)
  })
})

describe('pageMaturityContext', () => {
  afterEach(() => {
    config.set(ENABLED_KEY, originalEnabled)
  })

  it('Should return the tag, class, line and hidden prefix for a listed page', () => {
    expect(
      pageMaturityContext({
        route: { path: `${NOTIFICATION}/transit-countries` }
      })
    ).toEqual({
      pageMaturity: {
        tag: {
          text: copy.levels.detailing.tag,
          classes: TAG_CLASSES.detailing
        },
        text: copy.levels.detailing.text,
        hiddenPrefix: copy.hiddenPrefix
      }
    })
  })

  it('Should return nothing for an unlisted page', () => {
    expect(pageMaturityContext({ route: { path: '/health' } })).toEqual({})
  })

  it('Should return nothing when the switch is off', () => {
    config.set(ENABLED_KEY, false)

    expect(
      pageMaturityContext({ route: { path: `${NOTIFICATION}/origin` } })
    ).toEqual({})
  })

  it('Should return nothing when the error page is rendered on a listed route', () => {
    expect(
      pageMaturityContext({
        route: { path: `${NOTIFICATION}/origin` },
        response: { source: { template: 'shared/error' } }
      })
    ).toEqual({})
  })

  it('Should return nothing for a request with no route', () => {
    expect(pageMaturityContext({ path: '/live-animals' })).toEqual({})
  })
})

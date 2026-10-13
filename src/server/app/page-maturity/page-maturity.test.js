import { afterEach, describe, expect, it } from 'vitest'

import { config } from '../../../config/config.js'
import { copy } from './copy/copy.en.js'
import { BANNER_CLASSES, LEVELS, TAG_CLASSES } from './levels.js'
import { pageLevelFor, pageMaturityContext } from './page-maturity.js'

const NOTIFICATION = '/live-animals/notifications/{journeyId}'
const ENABLED_KEY = 'pageMaturityBanner.enabled'
const originalEnabled = config.get(ENABLED_KEY)

describe('pageLevelFor', () => {
  it('Should make the notification list Exploring', () => {
    expect(pageLevelFor('/live-animals')).toBe(LEVELS.exploring)
  })

  it.each([
    NOTIFICATION,
    `${NOTIFICATION}/origin`,
    `${NOTIFICATION}/notification-view`,
    `${NOTIFICATION}/declaration`,
    `${NOTIFICATION}/confirmation`
  ])('Should make the journey page %s Detailing', (routePath) => {
    expect(pageLevelFor(routePath)).toBe(LEVELS.detailing)
  })

  it('Should return undefined for an unlisted path', () => {
    expect(pageLevelFor('/auth/sign-out')).toBeUndefined()
  })

  it('Should return undefined for a path that only shares a prefix with a listed path', () => {
    expect(pageLevelFor('/live-animals/notifications-x')).toBeUndefined()
    expect(pageLevelFor('/live-animals-extra')).toBeUndefined()
  })

  it.each([undefined, ''])('Should return undefined for %j', (routePath) => {
    expect(pageLevelFor(routePath)).toBeUndefined()
  })

  describe('with a section', () => {
    const sections = [{ section: '/example/section', level: LEVELS.exploring }]

    it.each([
      '/example/section',
      '/example/section/new',
      '/example/section/{journeyId}/child'
    ])('Should treat %s as Exploring through the section', (path) => {
      expect(pageLevelFor(path, sections)).toBe(LEVELS.exploring)
    })

    it('Should not treat a path that only shares the section prefix as in it', () => {
      expect(
        pageLevelFor('/example/sectionsomething', sections)
      ).toBeUndefined()
    })

    it.each(['/', '/auth/sign-out', '/example/{id}/child'])(
      'Should treat %s as in the section / that covers every route',
      (path) => {
        expect(
          pageLevelFor(path, [{ section: '/', level: LEVELS.detailing }])
        ).toBe(LEVELS.detailing)
      }
    )

    it('Should use the first section that holds the route', () => {
      expect(
        pageLevelFor('/example/section/new', [
          ...sections,
          { section: '/', level: LEVELS.detailing }
        ])
      ).toBe(LEVELS.exploring)
    })
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
        classes: BANNER_CLASSES.detailing,
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

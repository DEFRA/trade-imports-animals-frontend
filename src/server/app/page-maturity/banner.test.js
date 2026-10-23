import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { config } from '../../../config/config.js'
import { createServer } from '../../server.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import {
  documentOf,
  trimmedTextOf
} from '../../common/test-helpers/document-of.js'
import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'
import { copy as sharedCopy } from '../shared/copy.en.js'
import { SET_BASE } from '../sets/live-animals/set.js'
import { copy } from './copy/copy.en.js'
import { BANNER_CLASSES, LEVELS, TAG_CLASSES } from './levels.js'

const environment = nunjucksConfig.options.compileOptions.environment

const SERVICE_SENTENCE =
  'This is a new service. Help us improve it and give your feedback by email.'

const pageMaturityFor = (level) => ({
  tag: { text: copy.levels[level].tag, classes: TAG_CLASSES[level] },
  text: copy.levels[level].text,
  classes: BANNER_CLASSES[level],
  hiddenPrefix: copy.hiddenPrefix
})

const pageMaturity = pageMaturityFor(LEVELS.exploring)

const renderLayout = (context = {}) =>
  environment.render('shared/layout.njk', {
    pageTitle: 'Create an import notification',
    sharedCopy,
    userSession: { isAuthenticated: true },
    addressBookUrl: 'http://ins.test/address-book',
    templatesUrl: '/live-animals/templates',
    homeUrl: SET_BASE,
    getAssetPath: (asset) => `/assets/${asset}`,
    ...context
  })

const TAG_SELECTOR = '.govuk-tag'
const bannersOf = (html) => [
  ...documentOf(html).querySelectorAll('.govuk-phase-banner')
]
const tagsIn = (banners) =>
  banners.flatMap((banner) => [...banner.querySelectorAll(TAG_SELECTOR)])
const textOf = (banners) =>
  banners.map(({ textContent }) => textContent).join('')
const normalised = (text) => text.replace(/\s+/g, ' ').trim()

describe('page maturity banner', () => {
  it('Should leave the layout with one phase banner when there is no level', () => {
    const banners = bannersOf(renderLayout())

    expect(banners).toHaveLength(1)
    expect(tagsIn(banners)).toHaveLength(1)
    expect(normalised(textOf(banners))).toBe(`Alpha ${SERVICE_SENTENCE}`)
    expect(environment.render('page-maturity/banner.njk', {})).toBe('')
  })

  it('Should add a second phase banner for the level, after the Alpha one', () => {
    const banners = bannersOf(renderLayout({ pageMaturity }))
    const [alpha, level] = banners
    const levelTags = tagsIn([level])

    expect(banners).toHaveLength(2)
    expect(trimmedTextOf(alpha.querySelector(TAG_SELECTOR))).toBe('Alpha')
    expect(normalised(alpha.textContent)).toBe(`Alpha ${SERVICE_SENTENCE}`)
    expect(levelTags).toHaveLength(1)
    expect(levelTags[0].classList.contains(TAG_CLASSES.exploring)).toBe(true)
    expect(
      levelTags[0].classList.contains('govuk-phase-banner__content__tag')
    ).toBe(true)
    expect(normalised(level.textContent)).toBe(
      `${pageMaturity.hiddenPrefix} ${pageMaturity.tag.text}. ${pageMaturity.text}`
    )
  })

  it.each(Object.values(LEVELS))(
    'Should give the %s row its own modifier class and tag colour',
    (levelId) => {
      const level = bannersOf(
        renderLayout({ pageMaturity: pageMaturityFor(levelId) })
      )[1]

      expect(level.classList.contains(BANNER_CLASSES[levelId])).toBe(true)
      expect(
        level
          .querySelector(TAG_SELECTOR)
          .classList.contains(TAG_CLASSES[levelId])
      ).toBe(true)
      expect(
        bannersOf(renderLayout()).some((banner) =>
          banner.classList.contains(BANNER_CLASSES[levelId])
        )
      ).toBe(false)
    }
  )

  it('Should not style the Alpha row with a level modifier', () => {
    const [alpha] = bannersOf(renderLayout({ pageMaturity }))

    expect(alpha.getAttribute('class')).not.toContain('app-page-maturity')
  })

  it('Should leave no line break or spacing utilities in the level row', () => {
    const level = bannersOf(renderLayout({ pageMaturity }))[1]

    expect(level.querySelectorAll('br')).toHaveLength(0)
    expect(level.innerHTML).not.toContain('govuk-!-margin')
  })

  it('Should keep the feedback link as the only link', () => {
    const links = bannersOf(renderLayout({ pageMaturity })).flatMap(
      (banner) => [...banner.querySelectorAll('a')]
    )

    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toMatch(/^mailto:/)
  })

  it('Should read the hidden status prefix inside the tag, before the level', () => {
    const level = bannersOf(renderLayout({ pageMaturity }))[1]
    const tag = level.querySelector(TAG_SELECTOR)

    expect(trimmedTextOf(tag.querySelector('.govuk-visually-hidden'))).toBe(
      pageMaturity.hiddenPrefix
    )
    expect(normalised(tag.textContent)).toBe(
      `${pageMaturity.hiddenPrefix} ${pageMaturity.tag.text}.`
    )
    expect(
      textOf([...level.querySelectorAll('.govuk-phase-banner__text')])
    ).not.toContain(pageMaturity.hiddenPrefix)
  })

  it('Should keep the service sentence in the Alpha row', () => {
    expect(
      normalised(bannersOf(renderLayout({ pageMaturity }))[0].textContent)
    ).toContain(SERVICE_SENTENCE)
  })
})

describe('page maturity banner on a served page', () => {
  const ENABLED_KEY = 'pageMaturityBanner.enabled'
  const originalStubMode = config.get('stubMode')
  const originalEnabled = config.get(ENABLED_KEY)
  const SERVED_PAGE_URL = SET_BASE
  let server
  let cookie

  const phaseBannersOfServedPage = async () => {
    const { payload } = await server.inject({
      method: 'GET',
      url: SERVED_PAGE_URL,
      headers: { cookie }
    })
    return bannersOf(payload)
  }

  beforeAll(async () => {
    config.set('stubMode', true)
    server = await createServer()
    await server.initialize()
    const signIn = await server.inject({
      method: 'GET',
      url: '/auth/stub-sign-in'
    })
    cookie = signIn.headers['set-cookie'][0].split(';')[0]
  })

  afterEach(() => {
    config.set(ENABLED_KEY, originalEnabled)
  })

  afterAll(async () => {
    config.set('stubMode', originalStubMode)
    await server.stop({ timeout: 0 })
  })

  it('Should show the Exploring tag on the live animals start page', async () => {
    const banners = await phaseBannersOfServedPage()

    expect(banners).toHaveLength(2)
    expect(tagsIn(banners).map((tag) => normalised(tag.textContent))).toEqual([
      'Alpha',
      `${copy.hiddenPrefix} ${copy.levels.exploring.tag}.`
    ])
  })

  it('Should show only the Alpha tag when the switch is off', async () => {
    config.set(ENABLED_KEY, false)

    const banners = await phaseBannersOfServedPage()

    expect(tagsIn(banners)).toHaveLength(1)
    expect(textOf(banners)).not.toContain(copy.levels.exploring.text)
  })

  it('Should show only the Alpha tag on the not found page of a listed route', async () => {
    const { statusCode, payload } = await server.inject({
      method: 'GET',
      url: `${SET_BASE}/notifications/no-such-notification/origin`,
      headers: { cookie }
    })
    const banners = bannersOf(payload)

    expect(statusCode).toBe(statusCodes.notFound)
    expect(tagsIn(banners)).toHaveLength(1)
    expect(textOf(banners)).not.toContain(copy.levels.exploring.text)
  })
})

import { load } from 'cheerio'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { config } from '../../../config/config.js'
import { createServer } from '../../server.js'
import { statusCodes } from '../../common/constants/status-codes.js'
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
const bannerOf = (html) => load(html)('.govuk-phase-banner')
const normalised = (text) => text.replace(/\s+/g, ' ').trim()

describe('page maturity banner', () => {
  it('Should leave the layout with one phase banner when there is no level', () => {
    const banner = bannerOf(renderLayout())

    expect(banner).toHaveLength(1)
    expect(banner.find(TAG_SELECTOR)).toHaveLength(1)
    expect(normalised(banner.text())).toBe(`Alpha ${SERVICE_SENTENCE}`)
    expect(environment.render('page-maturity/banner.njk', {})).toBe('')
  })

  it('Should add a second phase banner for the level, after the Alpha one', () => {
    const banners = bannerOf(renderLayout({ pageMaturity }))
    const alpha = banners.eq(0)
    const level = banners.eq(1)
    const levelTag = level.find(TAG_SELECTOR)

    expect(banners).toHaveLength(2)
    expect(alpha.find(TAG_SELECTOR).text().trim()).toBe('Alpha')
    expect(normalised(alpha.text())).toBe(`Alpha ${SERVICE_SENTENCE}`)
    expect(levelTag).toHaveLength(1)
    expect(levelTag.hasClass(TAG_CLASSES.exploring)).toBe(true)
    expect(levelTag.hasClass('govuk-phase-banner__content__tag')).toBe(true)
    expect(normalised(level.text())).toBe(
      `${pageMaturity.hiddenPrefix} ${pageMaturity.tag.text}. ${pageMaturity.text}`
    )
  })

  it.each(Object.values(LEVELS))(
    'Should give the %s row its own modifier class and tag colour',
    (levelId) => {
      const level = bannerOf(
        renderLayout({ pageMaturity: pageMaturityFor(levelId) })
      ).eq(1)

      expect(level.hasClass(BANNER_CLASSES[levelId])).toBe(true)
      expect(level.find(TAG_SELECTOR).hasClass(TAG_CLASSES[levelId])).toBe(true)
      expect(bannerOf(renderLayout()).hasClass(BANNER_CLASSES[levelId])).toBe(
        false
      )
    }
  )

  it('Should not style the Alpha row with a level modifier', () => {
    const alpha = bannerOf(renderLayout({ pageMaturity })).eq(0)

    expect(alpha.attr('class')).not.toContain('app-page-maturity')
  })

  it('Should leave no line break or spacing utilities in the level row', () => {
    const level = bannerOf(renderLayout({ pageMaturity })).eq(1)

    expect(level.find('br')).toHaveLength(0)
    expect(level.html()).not.toContain('govuk-!-margin')
  })

  it('Should keep the feedback link as the only link', () => {
    const links = bannerOf(renderLayout({ pageMaturity })).find('a')

    expect(links).toHaveLength(1)
    expect(links.attr('href')).toMatch(/^mailto:/)
  })

  it('Should read the hidden status prefix inside the tag, before the level', () => {
    const level = bannerOf(renderLayout({ pageMaturity })).eq(1)
    const tag = level.find(TAG_SELECTOR)

    expect(tag.find('.govuk-visually-hidden').first().text().trim()).toBe(
      pageMaturity.hiddenPrefix
    )
    expect(normalised(tag.text())).toBe(
      `${pageMaturity.hiddenPrefix} ${pageMaturity.tag.text}.`
    )
    expect(level.find('.govuk-phase-banner__text').text()).not.toContain(
      pageMaturity.hiddenPrefix
    )
  })

  it('Should keep the service sentence in the Alpha row', () => {
    expect(
      normalised(bannerOf(renderLayout({ pageMaturity })).eq(0).text())
    ).toContain(SERVICE_SENTENCE)
  })
})

describe('page maturity banner on a served page', () => {
  const ENABLED_KEY = 'pageMaturityBanner.enabled'
  const originalStubMode = config.get('stubMode')
  const originalEnabled = config.get(ENABLED_KEY)
  const MANAGE_TEMPLATES_URL = `${SET_BASE}/templates`
  let server
  let cookie

  const phaseBannerOfManageTemplates = async () => {
    const { payload } = await server.inject({
      method: 'GET',
      url: MANAGE_TEMPLATES_URL,
      headers: { cookie }
    })
    return bannerOf(payload)
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

  it('Should show the Exploring tag on Manage templates', async () => {
    const banner = await phaseBannerOfManageTemplates()

    expect(banner).toHaveLength(2)
    expect(
      banner
        .find(TAG_SELECTOR)
        .map((_, tag) => normalised(load(tag).text()))
        .get()
    ).toEqual(['Alpha', `${copy.hiddenPrefix} ${copy.levels.exploring.tag}.`])
  })

  it('Should show only the Alpha tag when the switch is off', async () => {
    config.set(ENABLED_KEY, false)

    const banner = await phaseBannerOfManageTemplates()

    expect(banner.find(TAG_SELECTOR)).toHaveLength(1)
    expect(banner.text()).not.toContain(copy.levels.exploring.text)
  })

  it('Should show only the Alpha tag on the not found page of a listed route', async () => {
    const { statusCode, payload } = await server.inject({
      method: 'GET',
      url: `${SET_BASE}/notifications/no-such-notification/origin`,
      headers: { cookie }
    })
    const banner = bannerOf(payload)

    expect(statusCode).toBe(statusCodes.notFound)
    expect(banner.find(TAG_SELECTOR)).toHaveLength(1)
    expect(banner.text()).not.toContain(copy.levels.exploring.text)
  })
})

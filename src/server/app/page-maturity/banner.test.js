import { load } from 'cheerio'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { config } from '../../../config/config.js'
import { createServer } from '../../server.js'
import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'
import { copy as sharedCopy } from '../shared/copy.en.js'
import { SET_BASE } from '../sets/live-animals/set.js'
import { copy } from './copy/copy.en.js'
import { TAG_CLASSES } from './levels.js'

const environment = nunjucksConfig.options.compileOptions.environment

const SERVICE_SENTENCE =
  'This is a new service. Help us improve it and give your feedback by email.'

const pageMaturity = {
  tag: { text: copy.levels.exploring.tag, classes: TAG_CLASSES.exploring },
  text: copy.levels.exploring.text,
  hiddenPrefix: copy.hiddenPrefix
}

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
  it('Should leave the phase banner exactly as it was when there is no level', () => {
    const banner = bannerOf(renderLayout())

    expect(banner.find(TAG_SELECTOR)).toHaveLength(1)
    expect(normalised(banner.text())).toBe(`Alpha ${SERVICE_SENTENCE}`)
    expect(bannerOf(renderLayout({ pageMaturity: null })).html()).toBe(
      banner.html()
    )
  })

  it('Should add the level tag after Alpha, then the line', () => {
    const banner = bannerOf(renderLayout({ pageMaturity }))
    const tags = banner.find(TAG_SELECTOR)

    expect(tags).toHaveLength(2)
    expect(tags.eq(0).text().trim()).toBe('Alpha')
    expect(tags.eq(1).text().trim()).toBe(pageMaturity.tag.text)
    expect(tags.eq(1).hasClass(TAG_CLASSES.exploring)).toBe(true)
    expect(normalised(banner.text())).toContain(
      `${pageMaturity.tag.text} ${pageMaturity.text}`
    )
  })

  it('Should keep the feedback link as the only link', () => {
    const links = bannerOf(renderLayout({ pageMaturity })).find('a')

    expect(links).toHaveLength(1)
    expect(links.attr('href')).toMatch(/^mailto:/)
  })

  it('Should put the hidden prefix before the level tag', () => {
    const banner = bannerOf(renderLayout({ pageMaturity }))
    const hidden = banner.find('.govuk-visually-hidden')

    expect(hidden.text()).toBe(pageMaturity.hiddenPrefix)
    expect(banner.html().indexOf(pageMaturity.hiddenPrefix)).toBeLessThan(
      banner.html().indexOf(pageMaturity.tag.text)
    )
  })

  it('Should keep the service sentence', () => {
    expect(
      normalised(bannerOf(renderLayout({ pageMaturity })).text())
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
    return load(payload)('.govuk-phase-banner')
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

    expect(
      banner
        .find(TAG_SELECTOR)
        .map((_, tag) => load(tag).text().trim())
        .get()
    ).toEqual(['Alpha', copy.levels.exploring.tag])
  })

  it('Should show only the Alpha tag when the switch is off', async () => {
    config.set(ENABLED_KEY, false)

    const banner = await phaseBannerOfManageTemplates()

    expect(banner.find(TAG_SELECTOR)).toHaveLength(1)
    expect(banner.text()).not.toContain(copy.levels.exploring.text)
  })
})

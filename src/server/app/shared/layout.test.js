import { load } from 'cheerio'
import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'
import { base, SURFACES, surfaceClass } from './kit.js'
import { copy as sharedCopy } from './copy.en.js'

const environment = nunjucksConfig.options.compileOptions.environment

const PHASE_BANNER = 'govuk-phase-banner'
const BREADCRUMBS = 'govuk-breadcrumbs'

const renderLayout = (userSession, context = {}) =>
  environment.render('shared/layout.njk', {
    pageTitle: 'Create an import notification',
    sharedCopy,
    userSession,
    getAssetPath: (asset) => `/assets/${asset}`,
    ...context
  })

const NAVIGATION_LIST = 'govuk-service-navigation__list'
const ACTIVE_ITEM = 'govuk-service-navigation__item--active'
const { serviceNavigation } = sharedCopy.layout

describe('service navigation', () => {
  const signedIn = {
    isAuthenticated: true,
    displayName: 'Sam Example',
    email: 'sam@example.test'
  }

  it('Should offer the four Design release 1 items on a signed-in page', () => {
    const $ = load(renderLayout(signedIn))
    const items = $('.govuk-service-navigation__item')
    const links = items.find('a')

    expect(items).toHaveLength(4)
    expect(links.map((_, a) => $(a).text().trim()).get()).toEqual([
      serviceNavigation.dashboard,
      serviceNavigation.addressBook,
      serviceNavigation.manageAccount,
      serviceNavigation.logOut
    ])
    expect(links.map((_, a) => $(a).attr('href')).get()).toEqual([
      '/',
      '#',
      '#',
      '/auth/sign-out'
    ])
  })

  it('Should mark the dashboard item active inside the notifications section', () => {
    const $ = load(
      renderLayout(signedIn, { activeNavigationItem: 'dashboard' })
    )

    expect($('.govuk-service-navigation__item--active')).toHaveLength(1)
    expect($('[aria-current="true"]')).toHaveLength(1)
    expect($('.govuk-service-navigation__active-fallback').text()).toBe(
      serviceNavigation.dashboard
    )
  })

  it('Should mark nothing active outside any navigation section', () => {
    const html = renderLayout(signedIn, { activeNavigationItem: null })

    expect(html).toContain(NAVIGATION_LIST)
    expect(html).not.toContain(ACTIVE_ITEM)
    expect(html).not.toContain('aria-current')
  })

  it('Should not show the signed-in user anywhere, as Design release 1 does not', () => {
    const html = renderLayout(signedIn)

    expect(html).not.toContain('Sam Example')
    expect(html).not.toContain('sam@example.test')
    expect(html).not.toContain('app-service-header')
  })

  it('Should carry the service name and no items when there is no user', () => {
    const html = renderLayout({ isAuthenticated: false })

    expect(html).toContain(sharedCopy.layout.serviceName)
    expect(html).not.toContain('Prototype')
    expect(html).not.toContain('non-functional prototype')
    expect(html).not.toContain(NAVIGATION_LIST)
    expect(html).not.toContain('href="/auth/sign-out"')
    expect(html).not.toContain(serviceNavigation.logOut)
  })
})

describe('alpha phase banner', () => {
  const feedbackAnchor =
    '<a class="govuk-link" href="mailto:APHAServiceDesk@apha.gov.uk">give your feedback by email</a>'

  it('Should tag the service as alpha in grey and offer the feedback link', () => {
    const html = renderLayout({ isAuthenticated: true })

    expect(html).toContain(PHASE_BANNER)
    expect(html).toContain('govuk-tag--grey')
    expect(html).toContain('Alpha')
    expect(html).toContain(
      `This is a new service. Help us improve it and ${feedbackAnchor}.`
    )
  })

  it('Should render the banner on a signed-out page too', () => {
    const html = renderLayout({ isAuthenticated: false })

    expect(html).toContain(PHASE_BANNER)
  })

  it('Should place the banner above the back link', () => {
    const html = renderLayout(
      { isAuthenticated: true },
      { backLink: '/notifications' }
    )

    expect(html.indexOf(PHASE_BANNER)).toBeLessThan(
      html.indexOf('govuk-back-link')
    )
  })
})

describe('breadcrumbs', () => {
  it('Should render no breadcrumb trail, as Design release 1 has none', () => {
    const html = renderLayout(
      { isAuthenticated: true },
      { backLink: '/notifications' }
    )

    expect(html).not.toContain(BREADCRUMBS)
  })

  it('Should ignore a breadcrumbs value a caller still passes', () => {
    const html = renderLayout(
      { isAuthenticated: true },
      { breadcrumbs: [{ text: 'Your notifications', href: '/' }] }
    )

    expect(html).not.toContain(BREADCRUMBS)
    expect(html).not.toContain('Your notifications')
  })
})

describe('content column width by surface', () => {
  it('Should render a display surface at full container width', () => {
    const html = renderLayout(
      { isAuthenticated: true },
      { contentColumnClass: SURFACES.display }
    )

    expect(html).toContain(SURFACES.display)
    expect(html).not.toContain(SURFACES.form)
  })

  it('Should fall back to the reading measure when no surface is declared', () => {
    const html = renderLayout({ isAuthenticated: true })

    expect(html).toContain(SURFACES.form)
    expect(html).not.toContain('class=""')
  })
})

describe('kit surfaces', () => {
  it('Should build answering-page chrome at the reading measure', () => {
    expect(base('Any page').contentColumnClass).toBe(SURFACES.form)
  })

  it('Should give display pages the full container', () => {
    expect(surfaceClass('display')).toBe(SURFACES.display)
  })

  it('Should reject an unknown surface rather than render nothing', () => {
    expect(() => surfaceClass('widescreen')).toThrow(
      /Unknown surface 'widescreen'/
    )
  })

  it('Should reject an inherited Object property as a surface name', () => {
    expect(() => surfaceClass('constructor')).toThrow(
      /Unknown surface 'constructor'/
    )
  })
})

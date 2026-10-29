import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'
import {
  documentOf,
  trimmedTextOf
} from '../../common/test-helpers/document-of.js'
import { base, SURFACES, surfaceClass } from './kit.js'
import { copy as sharedCopy } from './copy.en.js'
import { SET_BASE } from '../sets/live-animals/set.js'

const environment = nunjucksConfig.options.compileOptions.environment

const PHASE_BANNER = 'govuk-phase-banner'
const BREADCRUMBS = 'govuk-breadcrumbs'
const ADDRESS_BOOK_URL = 'http://ins.test/address-book'

const renderLayout = (userSession, context = {}) =>
  environment.render('shared/layout.njk', {
    pageTitle: 'Create an import notification',
    sharedCopy,
    userSession,
    addressBookUrl: ADDRESS_BOOK_URL,
    homeUrl: SET_BASE,
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

  it('Should offer the dashboard, address book, account and log out items on a signed-in page', () => {
    const document = documentOf(renderLayout(signedIn))
    const items = document.querySelectorAll('.govuk-service-navigation__item')
    const links = [
      ...document.querySelectorAll('.govuk-service-navigation__item a')
    ]

    expect(items).toHaveLength(4)
    expect(links.map(trimmedTextOf)).toEqual([
      serviceNavigation.dashboard,
      serviceNavigation.addressBook,
      serviceNavigation.manageAccount,
      serviceNavigation.logOut
    ])
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      SET_BASE,
      ADDRESS_BOOK_URL,
      '#',
      '/auth/sign-out'
    ])
  })

  it('Should point the dashboard link and the service name at the set’s own base', () => {
    const document = documentOf(renderLayout(signedIn))

    expect(
      document.querySelectorAll(
        `.govuk-service-navigation__item a[href="${SET_BASE}"]`
      )
    ).toHaveLength(1)
    expect(
      document
        .querySelector('.govuk-service-navigation__service-name a')
        .getAttribute('href')
    ).toBe(SET_BASE)
  })

  it('Should mark the dashboard item active inside the notifications section', () => {
    const document = documentOf(
      renderLayout(signedIn, { activeNavigationItem: 'dashboard' })
    )

    expect(
      document.querySelectorAll('.govuk-service-navigation__item--active')
    ).toHaveLength(1)
    expect(document.querySelectorAll('[aria-current="true"]')).toHaveLength(1)
    expect(
      document.querySelector('.govuk-service-navigation__active-fallback')
        .textContent
    ).toBe(serviceNavigation.dashboard)
  })

  it('Should mark nothing active outside any navigation section', () => {
    const html = renderLayout(signedIn, { activeNavigationItem: null })

    expect(html).toContain(NAVIGATION_LIST)
    expect(html).not.toContain(ACTIVE_ITEM)
    expect(html).not.toContain('aria-current')
  })

  it('Should not show the signed-in user anywhere', () => {
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
  it('Should render no breadcrumb trail', () => {
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

describe('success banner', () => {
  const successBanner = {
    titleText: 'Success',
    text: 'New Farm address added to your address book'
  }
  const stripContext = {
    journeyStrip: {
      status: { text: 'Draft', classes: 'govuk-tag--grey' },
      reference: 'GBN-AG-26-ABC123'
    }
  }

  it('Should render a success notification banner with the given title and text', () => {
    const document = documentOf(
      renderLayout({ isAuthenticated: true }, { successBanner })
    )
    const banner = document.querySelector('.govuk-notification-banner--success')

    expect(trimmedTextOf(banner.querySelector('h2'))).toBe('Success')
    expect(
      trimmedTextOf(banner.querySelector('.govuk-notification-banner__heading'))
    ).toBe('New Farm address added to your address book')
  })

  it('Should render the banner after the journey strip', () => {
    const html = renderLayout(
      { isAuthenticated: true },
      { ...stripContext, successBanner }
    )

    expect(html.indexOf('app-journey-strip')).toBeGreaterThan(-1)
    expect(html.indexOf('app-journey-strip')).toBeLessThan(
      html.indexOf('govuk-notification-banner--success')
    )
  })

  it('Should render no success banner when none is given', () => {
    const document = documentOf(renderLayout({ isAuthenticated: true }))

    expect(
      document.querySelectorAll('.govuk-notification-banner--success')
    ).toHaveLength(0)
  })
})

describe('kit surfaces', () => {
  it('Should build answering-page chrome at the reading measure', () => {
    expect(base('Any page').contentColumnClass).toBe(SURFACES.form)
  })

  it('Should build answering-page chrome at the full container when asked for the display surface', () => {
    expect(base('Any page', { surface: 'display' }).contentColumnClass).toBe(
      SURFACES.display
    )
  })

  it('Should reject an unknown surface passed to the chrome', () => {
    expect(() => base('Any page', { surface: 'widescreen' })).toThrow(
      /Unknown surface 'widescreen'/
    )
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

describe('page title', () => {
  const titleOf = (html) =>
    documentOf(html).querySelector('head title').textContent
  const { serviceName, govukSuffix, errorTitlePrefix } = sharedCopy.layout

  it('Should join the page name, the service name and GOV.UK with hyphens', () => {
    expect(titleOf(renderLayout({ isAuthenticated: true }))).toBe(
      `Create an import notification - ${serviceName} - ${govukSuffix}`
    )
  })

  it('Should keep the error prefix in front of the whole title', () => {
    const html = renderLayout(
      { isAuthenticated: true },
      { errorSummary: [{ text: 'Enter a country', href: '#country' }] }
    )

    expect(titleOf(html)).toBe(
      `${errorTitlePrefix}Create an import notification - ${serviceName} - ${govukSuffix}`
    )
  })

  it('Should not separate the title with a pipe', () => {
    expect(titleOf(renderLayout({ isAuthenticated: true }))).not.toContain('|')
  })
})

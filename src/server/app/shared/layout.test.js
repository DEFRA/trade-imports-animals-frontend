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
    breadcrumbs: false,
    getAssetPath: (asset) => `/assets/${asset}`,
    ...context
  })

describe('promoted live-animals signed-in chrome', () => {
  it('Should show the authenticated user and the existing auth sign-out route', () => {
    const html = renderLayout({
      isAuthenticated: true,
      displayName: 'Sam Example',
      email: 'sam@example.test'
    })

    expect(html).toContain('Sam Example')
    expect(html).toContain('href="/auth/sign-out"')
    expect(html).toContain('Sign out')
  })

  it('Should render cleanly without signed-in chrome when there is no user', () => {
    const html = renderLayout({ isAuthenticated: false })

    expect(html).toContain('Import notification service')
    expect(html).not.toContain('Prototype')
    expect(html).not.toContain('non-functional prototype')
    expect(html).not.toContain('app-service-header__user')
    expect(html).not.toContain('href="/auth/sign-out"')
    expect(html).not.toContain('Sign out')
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

  it('Should place the banner above the breadcrumbs and the back link', () => {
    const html = renderLayout(
      { isAuthenticated: true },
      { breadcrumbs: null, backLink: '/notifications' }
    )

    expect(html.indexOf(PHASE_BANNER)).toBeLessThan(html.indexOf(BREADCRUMBS))
    expect(html.indexOf(BREADCRUMBS)).toBeLessThan(
      html.indexOf('govuk-back-link')
    )
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

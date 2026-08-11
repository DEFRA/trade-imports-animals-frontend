import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'
import { base, SURFACES, surfaceClass } from './kit.js'
import { copy as sharedCopy } from './copy.en.js'

const environment = nunjucksConfig.options.compileOptions.environment

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

describe('content column width by surface', () => {
  // No form-surface case here on purpose: SURFACES.form is also the template's
  // fallback, so a layout that ignored contentColumnClass entirely would still
  // pass it. Only the display case can prove the value is read at all.
  it('Should render a display surface at full container width', () => {
    const html = renderLayout(
      { isAuthenticated: true },
      { contentColumnClass: SURFACES.display }
    )

    expect(html).toContain(SURFACES.display)
    expect(html).not.toContain(SURFACES.form)
  })

  // A template that extends this layout without going through kit.base supplies no
  // contentColumnClass. It must land on the reading measure rather than on an empty
  // class attribute, which would silently render at the container's full width.
  it('Should fall back to the reading measure when no surface is declared', () => {
    const html = renderLayout({ isAuthenticated: true })

    expect(html).toContain(SURFACES.form)
    expect(html).not.toContain('class=""')
  })
})

describe('kit surfaces', () => {
  it('Should give a form surface to a page that declares none', () => {
    expect(base('Any page').contentColumnClass).toBe(SURFACES.form)
  })

  it('Should give the full container to a declared display surface', () => {
    expect(
      base('Notifications', { surface: 'display' }).contentColumnClass
    ).toBe(SURFACES.display)
  })

  // Fail loudly rather than render class="" — a typo'd surface would otherwise be
  // indistinguishable from full width, which is exactly the silent regression this
  // whole ticket exists to undo.
  it('Should reject an unknown surface rather than render nothing', () => {
    expect(() => base('Any page', { surface: 'widescreen' })).toThrow(
      /Unknown surface 'widescreen'/
    )
  })

  // A plain-object lookup answers for everything on Object.prototype, so
  // 'constructor' would resolve to a function and sail past a truthiness check.
  it('Should reject an inherited Object property as a surface name', () => {
    expect(() => base('Any page', { surface: 'constructor' })).toThrow(
      /Unknown surface 'constructor'/
    )
  })

  it('Should validate the surface for display pages that cannot call base', () => {
    expect(surfaceClass('display')).toBe(SURFACES.display)
    expect(() => surfaceClass('widescreen')).toThrow(/Unknown surface/)
  })
})

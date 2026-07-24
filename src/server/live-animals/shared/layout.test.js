import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'
import { copy as sharedCopy } from './copy.en.js'

const environment = nunjucksConfig.options.compileOptions.environment

const renderLayout = (userSession) =>
  environment.render('live-animals/shared/layout.njk', {
    pageTitle: 'Create an import notification',
    sharedCopy,
    userSession,
    breadcrumbs: false,
    getAssetPath: (asset) => `/assets/${asset}`
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

    expect(html).toContain('Import notification service (standalone)')
    expect(html).not.toContain('app-service-header__user')
    expect(html).not.toContain('href="/auth/sign-out"')
    expect(html).not.toContain('Sign out')
  })
})

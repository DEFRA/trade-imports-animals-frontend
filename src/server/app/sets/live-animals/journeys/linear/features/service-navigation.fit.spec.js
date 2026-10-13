import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  BASE,
  signIn,
  startNotification
} from '../../../../../../../../fit/live-animals-journey.js'
import { copy as sharedCopy } from '../../../../../shared/copy.en.js'
import { copy as templatesCopy } from './templates/copy/copy.en.js'

const { serviceNavigation } = sharedCopy.layout
const ITEMS = [
  serviceNavigation.dashboard,
  serviceNavigation.templates,
  serviceNavigation.addressBook,
  serviceNavigation.manageAccount,
  serviceNavigation.logOut
]

const navigation = (page) =>
  page.getByRole('navigation', { name: serviceNavigation.menuButton })

const STUB_USER_EMAIL = 'stub.user@example.com'
const ARIA_CURRENT = 'aria-current'

test.describe('service navigation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('offers the five items on the dashboard', async ({ page }) => {
    await page.goto(BASE)

    await expect(navigation(page).getByRole('listitem')).toHaveText(ITEMS)
  })

  test('marks the dashboard as the current section', async ({ page }) => {
    await page.goto(BASE)

    await expect(
      navigation(page).getByRole('link', { name: serviceNavigation.dashboard })
    ).toHaveAttribute(ARIA_CURRENT, 'true')
  })

  test('marks Templates as the current section on Manage templates', async ({
    page
  }) => {
    await page.goto(`${BASE}/templates`)

    await expect(
      navigation(page).getByRole('link', { name: serviceNavigation.templates })
    ).toHaveAttribute(ARIA_CURRENT, 'true')
    await expect(
      navigation(page).getByRole('link', { name: serviceNavigation.dashboard })
    ).not.toHaveAttribute(ARIA_CURRENT)
    await expect(
      navigation(page).getByRole('link', {
        name: serviceNavigation.addressBook
      })
    ).not.toHaveAttribute(ARIA_CURRENT)
  })

  test('marks Templates as the current section while creating a template', async ({
    page
  }) => {
    await page.goto(`${BASE}/templates/new?type=live-animals`)

    await expect(
      navigation(page).getByRole('link', { name: serviceNavigation.templates })
    ).toHaveAttribute(ARIA_CURRENT, 'true')

    await page
      .getByRole('button', {
        name: sharedCopy.saveActions.saveAndContinue,
        exact: true
      })
      .click()

    await expect(page).toHaveURL(/\/templates\/[^/]+\/origin$/)
    await expect(
      navigation(page).getByRole('link', { name: serviceNavigation.templates })
    ).toHaveAttribute(ARIA_CURRENT, 'true')
    await expect(
      navigation(page).getByRole('link', { name: serviceNavigation.dashboard })
    ).not.toHaveAttribute(ARIA_CURRENT)
  })

  test('does not mark Templates on the dashboard', async ({ page }) => {
    await page.goto(BASE)

    await expect(
      navigation(page).getByRole('link', { name: serviceNavigation.templates })
    ).not.toHaveAttribute(ARIA_CURRENT)
    await expect(
      navigation(page).getByRole('link', { name: serviceNavigation.dashboard })
    ).toHaveAttribute(ARIA_CURRENT, 'true')
  })

  test('reaches Manage templates from the navigation', async ({ page }) => {
    await page.goto(BASE)

    const templates = navigation(page).getByRole('link', {
      name: serviceNavigation.templates
    })
    await expect(templates).toHaveAttribute('href', `${BASE}/templates`)

    await templates.click()

    await expect(
      page.getByRole('heading', { level: 1, name: templatesCopy.title })
    ).toBeVisible()
  })

  test('keeps the dashboard marked on a page inside a notification', async ({
    page
  }) => {
    await startNotification(page)

    await expect(
      navigation(page).getByRole('link', { name: serviceNavigation.dashboard })
    ).toHaveAttribute(ARIA_CURRENT, 'true')
  })

  test('reaches the dashboard from inside a notification', async ({ page }) => {
    await startNotification(page)

    // The href itself, before the click: a bare `/` would still land on BASE
    // through the root redirect, so following the link proves nothing on its
    // own about the link carrying this set's prefix.
    await expect(
      navigation(page).getByRole('link', { name: serviceNavigation.dashboard })
    ).toHaveAttribute('href', BASE)

    await navigation(page)
      .getByRole('link', { name: serviceNavigation.dashboard })
      .click()

    await expect(page).toHaveURL(BASE)
  })

  // Clicking through would leave the service for the OIDC provider's sign-out
  // endpoint, so this pins the destination rather than following it.
  test('offers sign-out from the navigation', async ({ page }) => {
    await page.goto(BASE)

    await expect(
      navigation(page).getByRole('link', { name: serviceNavigation.logOut })
    ).toHaveAttribute('href', '/auth/sign-out')
  })

  test('shows the signed-in user nowhere, as Design release 1 does not', async ({
    page
  }) => {
    await page.goto(BASE)

    await expect(page.getByText(STUB_USER_EMAIL)).toHaveCount(0)
    await expect(
      page.getByRole('link', { name: 'Sign out', exact: true })
    ).toHaveCount(0)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await page.goto(BASE)

    await expect(navigation(page).getByRole('listitem')).toHaveText(ITEMS)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )

    expect(
      seriousOrCritical,
      `Service navigation has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})

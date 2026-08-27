import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  signIn,
  startNotification
} from '../../../../../../../../fit/live-animals-journey.js'
import { copy as sharedCopy } from '../../../../../shared/copy.en.js'

const { serviceNavigation } = sharedCopy.layout
const ITEMS = [
  serviceNavigation.dashboard,
  serviceNavigation.addressBook,
  serviceNavigation.manageAccount,
  serviceNavigation.logOut
]

const navigation = (page) =>
  page.getByRole('navigation', { name: serviceNavigation.menuButton })

const STUB_USER_EMAIL = 'stub.user@example.com'

test.describe('service navigation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('offers the four items on the dashboard', async ({ page }) => {
    await page.goto('/')

    await expect(navigation(page).getByRole('listitem')).toHaveText(ITEMS)
  })

  test('marks the dashboard as the current section', async ({ page }) => {
    await page.goto('/')

    await expect(
      navigation(page).getByRole('link', { name: serviceNavigation.dashboard })
    ).toHaveAttribute('aria-current', 'true')
  })

  test('keeps the dashboard marked on a page inside a notification', async ({
    page
  }) => {
    await startNotification(page)

    await expect(
      navigation(page).getByRole('link', { name: serviceNavigation.dashboard })
    ).toHaveAttribute('aria-current', 'true')
  })

  test('reaches the dashboard from inside a notification', async ({ page }) => {
    await startNotification(page)

    await navigation(page)
      .getByRole('link', { name: serviceNavigation.dashboard })
      .click()

    await expect(page).toHaveURL('/')
  })

  // Clicking through would leave the service for the OIDC provider's sign-out
  // endpoint, so this pins the destination rather than following it.
  test('offers sign-out from the navigation', async ({ page }) => {
    await page.goto('/')

    await expect(
      navigation(page).getByRole('link', { name: serviceNavigation.logOut })
    ).toHaveAttribute('href', '/auth/sign-out')
  })

  test('shows the signed-in user nowhere, as Design release 1 does not', async ({
    page
  }) => {
    await page.goto('/')

    await expect(page.getByText(STUB_USER_EMAIL)).toHaveCount(0)
    await expect(
      page.getByRole('link', { name: 'Sign out', exact: true })
    ).toHaveCount(0)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await page.goto('/')

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

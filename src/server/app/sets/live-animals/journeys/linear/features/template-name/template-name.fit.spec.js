import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  BASE,
  signIn
} from '../../../../../../../../../fit/live-animals-journey.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'

const TEMPLATE_NAME = 'Weekly cattle'
const NEW_TEMPLATE_URL = `${BASE}/templates/new?type=live-animals`
const TYPE_QUESTION_PATH = '/notification-type/template'
const TEMPLATE_ORIGIN_PATTERN = /\/live-animals\/templates\/[^/]+\/origin$/
const ARIA_CURRENT = 'aria-current'

const main = (page) => page.getByRole('main')
const backLink = (page) => page.getByRole('link', { name: 'Back', exact: true })
const nameField = (page) =>
  page.getByRole('textbox', { name: copy.label, exact: true })
const saveAndContinue = (page) =>
  page.getByRole('button', {
    name: sharedCopy.saveActions.saveAndContinue,
    exact: true
  })

test.describe('template name page', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await page.goto(NEW_TEMPLATE_URL)
  })

  test('shows its title, caption and heading with no hint', async ({
    page
  }) => {
    await expect(page).toHaveTitle(
      `${copy.title} - ${sharedCopy.layout.serviceName} - ${sharedCopy.layout.govukSuffix}`
    )
    await expect(page.getByText(copy.caption, { exact: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: copy.title })
    ).toBeVisible()
    await expect(main(page).locator('.govuk-hint')).toHaveCount(0)
  })

  test('asks one question, labelled by the heading', async ({ page }) => {
    await expect(main(page).getByRole('textbox')).toHaveCount(1)
    await expect(nameField(page)).toBeVisible()
    await expect(nameField(page)).toHaveValue('')
  })

  test('offers Save and continue and a Cancel link to Manage templates', async ({
    page
  }) => {
    await expect(saveAndContinue(page)).toBeVisible()
    await expect(
      page.getByRole('link', { name: copy.cancel, exact: true })
    ).toHaveAttribute('href', `${BASE}/templates`)
  })

  test('goes Back to the type question with the type chosen', async ({
    page
  }) => {
    await expect(backLink(page)).toHaveAttribute(
      'href',
      new RegExp(`${TYPE_QUESTION_PATH}\\?type=live-animals$`)
    )
  })

  test('goes Back to Manage templates when opened with no type', async ({
    page
  }) => {
    await page.goto(`${BASE}/templates/new`)

    await expect(backLink(page)).toHaveAttribute('href', `${BASE}/templates`)
  })

  test('highlights Templates in the service navigation', async ({ page }) => {
    await expect(
      page.getByRole('link', {
        name: sharedCopy.layout.serviceNavigation.templates,
        exact: true
      })
    ).toHaveAttribute(ARIA_CURRENT, 'true')
  })

  test('moves a blank name on to Origin of the import with no error', async ({
    page
  }) => {
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(TEMPLATE_ORIGIN_PATTERN)
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('trims the name and shows it in the Template strip on the next page', async ({
    page
  }) => {
    await nameField(page).fill('  Weekly cattle  ')
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(TEMPLATE_ORIGIN_PATTERN)
    await expect(page.locator('.app-journey-strip')).toHaveText(
      /Template\s+Weekly cattle/
    )
  })

  test('shows the name again going Back from Origin of the import', async ({
    page
  }) => {
    await nameField(page).fill(TEMPLATE_NAME)
    await saveAndContinue(page).click()
    await expect(page).toHaveURL(TEMPLATE_ORIGIN_PATTERN)

    await backLink(page).click()

    await expect(nameField(page)).toHaveValue(TEMPLATE_NAME)
  })

  test('starts another new template with an empty name', async ({ page }) => {
    await nameField(page).fill(TEMPLATE_NAME)
    await saveAndContinue(page).click()
    await expect(page).toHaveURL(TEMPLATE_ORIGIN_PATTERN)

    await page.goto(NEW_TEMPLATE_URL)

    await expect(nameField(page)).toHaveValue('')
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await expect(
      page.getByRole('heading', { level: 1, name: copy.title })
    ).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )

    expect(
      seriousOrCritical,
      `Template name page has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})

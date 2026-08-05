import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import * as importReasonPurpose from '../../../../../../services/import-reason-purpose/index.js'
import { validatorDefaults } from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'

const SUBMIT_BUTTON_SELECTOR = 'form button[type="submit"]'
const PURPOSE_INPUT_SELECTOR = 'input[name="purposeInInternalMarket"]'

const startAtImportPurpose = async (page) => {
  await page.goto('/')
  await page
    .locator('form[action="/notifications"]')
    .getByRole('button')
    .click()
  await page.locator('input[name="importType"][value="live-animals"]').check()
  await page.locator('form').getByRole('button').click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/origin$/)

  await page.goto(page.url().replace(/\/origin$/, '/import-reason'))
  await page
    .locator('input[name="reasonForImport"][value="internalMarket"]')
    .check()
  await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()
  await page.goto(
    page
      .url()
      .replace(/\/notifications\/([^/]+)$/, '/notifications/$1/import-purpose')
  )
  await expect(page.getByRole('heading', { name: copy.legend })).toBeVisible()
}

const expectNoSeriousOrCriticalAxeViolations = async (page) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  const seriousOrCritical = results.violations.filter(({ impact }) =>
    ['serious', 'critical'].includes(impact)
  )

  expect(
    seriousOrCritical,
    `Import purpose has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

test.describe('import-purpose feature', () => {
  test.beforeEach(async ({ page }) => {
    await startAtImportPurpose(page)
  })

  test('renders the service-backed purposes and feature copy', async ({
    page
  }) => {
    const group = page.getByRole('group', { name: copy.legend })
    const renderedValues = await group
      .locator(PURPOSE_INPUT_SELECTOR)
      .evaluateAll((inputs) => inputs.map((input) => input.value))
    expect(renderedValues).toEqual(
      importReasonPurpose.purposes().map(({ value }) => value)
    )
    for (const option of importReasonPurpose.purposes()) {
      await expect(
        page.getByRole('radio', { name: option.text, exact: true })
      ).toBeVisible()
      await expect(group).toContainText(copy.purposeHints[option.value])
    }
  })

  test('purpose validation: when the submitted option is invalid, links to and focuses the group without preserving an invalid selection', async ({
    page
  }) => {
    await page
      .locator(PURPOSE_INPUT_SELECTOR)
      .first()
      .evaluate((input) => {
        input.value = 'not-a-real-purpose'
        input.checked = true
      })
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()

    const purposeError = page
      .getByRole('alert')
      .getByRole('link', { name: validatorDefaults.oneOf })
    await expect(purposeError).toBeVisible()
    await purposeError.click()
    await expect(page.locator(PURPOSE_INPUT_SELECTOR).first()).toBeFocused()
    await expect(page.locator(`${PURPOSE_INPUT_SELECTOR}:checked`)).toHaveCount(
      0
    )
  })

  test('saves a valid purpose, redirects and persists the answer', async ({
    page
  }) => {
    const purposeUrl = page.url()
    const selected = importReasonPurpose
      .purposes()
      .find(({ value }) => value === 'breeding')

    await page.getByRole('radio', { name: selected.text, exact: true }).check()
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()

    await expect(page).toHaveURL(/\/notifications\/[^/]+$/)
    await page.goto(purposeUrl)
    await expect(
      page.getByRole('radio', { name: selected.text, exact: true })
    ).toBeChecked()
  })

  test('back link returns to the notification hub', async ({ page }) => {
    const hubUrl = page.url().replace(/\/import-purpose$/, '')

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(hubUrl)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await expectNoSeriousOrCriticalAxeViolations(page)
  })
})

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { CONTACT_OPTIONS } from '../../services/address-book/stub/index.js'
import { copy } from './copy/copy.en.js'

const startAtContact = async (page) => {
  await page.goto('/')
  await page
    .locator('form[action="/notifications"]')
    .getByRole('button')
    .click()
  await page.locator('input[name="importType"][value="live-animals"]').check()
  await page.locator('form').getByRole('button').click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/origin$/)

  await page.goto(
    page.url().replace(/\/origin$/, '/consignment/contact/select')
  )
  await expect(page.getByRole('heading', { name: copy.legend })).toBeVisible()
}

const saveAndContinue = (page) =>
  page.locator('form button[type="submit"]').first().click()

const errorLink = (page, message) =>
  page.locator('.govuk-error-summary').getByRole('link', { name: message })

const addressSummary = (address) =>
  [
    address.addressLine1,
    address.addressLine2,
    address.addressLine3,
    address.country
  ]
    .filter((part) => part)
    .join(', ')

test.describe('contact feature', () => {
  test('renders the address-book contacts, feature copy, add link and working back link', async ({
    page
  }) => {
    await startAtContact(page)

    const group = page.getByRole('group', { name: copy.legend })
    await expect(group).toContainText(copy.hint)
    const renderedValues = await group
      .locator('input[name="contactAddress"]')
      .evaluateAll((inputs) => inputs.map((input) => input.value))
    expect(renderedValues).toEqual(CONTACT_OPTIONS.map(({ id }) => id))
    for (const option of CONTACT_OPTIONS) {
      await expect(
        page.getByRole('radio', { name: option.name, exact: true })
      ).toBeVisible()
      await expect(group).toContainText(addressSummary(option.address))
    }
    await expect(
      page.getByRole('link', { name: copy.addNewAddress })
    ).toHaveAttribute(
      'href',
      /\/notifications\/[^/]+\/addresses\/create\?for=contactAddress$/
    )

    const hubUrl = page.url().replace(/\/consignment\/contact\/select$/, '')
    await page.locator('.govuk-back-link').click()
    await expect(page).toHaveURL(hubUrl)
  })

  test('rejects the controller out-of-list case without committing it', async ({
    page
  }) => {
    await startAtContact(page)

    await page
      .locator('input[name="contactAddress"]')
      .first()
      .evaluate((input) => {
        input.value = 'not-a-real-contact'
        input.checked = true
      })
    await saveAndContinue(page)

    await expect(errorLink(page, copy.errors.contactRequired)).toBeVisible()
    await expect(
      page.locator('input[name="contactAddress"]:checked')
    ).toHaveCount(0)
  })

  test('copies a valid contact, redirects and persists the selection', async ({
    page
  }) => {
    await startAtContact(page)
    const contactUrl = page.url()
    const selected = CONTACT_OPTIONS[0]

    await page.getByRole('radio', { name: selected.name, exact: true }).check()
    await saveAndContinue(page)

    await expect(page).toHaveURL(/\/notifications\/[^/]+$/)
    await page.goto(contactUrl)
    await expect(
      page.getByRole('radio', { name: selected.name, exact: true })
    ).toBeChecked()
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await startAtContact(page)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )

    expect(
      seriousOrCritical,
      `Contact has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})

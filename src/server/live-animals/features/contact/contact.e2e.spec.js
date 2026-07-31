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
  test.beforeEach(async ({ page }) => {
    await startAtContact(page)
  })

  test('renders the address-book contacts, feature copy and add link', async ({
    page
  }) => {
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
  })

  test('contact validation: when the submitted option is invalid, links to and focuses the group without preserving an invalid selection', async ({
    page
  }) => {
    await page
      .locator('input[name="contactAddress"]')
      .first()
      .evaluate((input) => {
        input.value = 'not-a-real-contact'
        input.checked = true
      })
    await page.locator('form button[type="submit"]').first().click()

    const contactError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.contactRequired })
    await expect(contactError).toBeVisible()
    await contactError.click()
    await expect(
      page.locator('input[name="contactAddress"]').first()
    ).toBeFocused()
    await expect(
      page.locator('input[name="contactAddress"]:checked')
    ).toHaveCount(0)
  })

  test('copies a valid contact, redirects and persists the selection', async ({
    page
  }) => {
    const contactUrl = page.url()
    const selected = CONTACT_OPTIONS[0]

    await page.getByRole('radio', { name: selected.name, exact: true }).check()
    await page.locator('form button[type="submit"]').first().click()

    await expect(page).toHaveURL(/\/notifications\/[^/]+$/)
    await page.goto(contactUrl)
    await expect(
      page.getByRole('radio', { name: selected.name, exact: true })
    ).toBeChecked()
  })

  test('back link returns to the notification hub', async ({ page }) => {
    const hubUrl = page.url().replace(/\/consignment\/contact\/select$/, '')

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(hubUrl)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
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

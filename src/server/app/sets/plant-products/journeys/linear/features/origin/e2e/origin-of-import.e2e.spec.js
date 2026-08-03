import { expect, test } from '@playwright/test'

import { axeViolations as seriousOrCriticalViolations } from '../../axe.e2e-helper.js'
import { COUNTRIES } from '../../../../../services/reference/countries.js'
import { copy } from '../copy/copy.en.js'

const pageCopy = copy.originOfImport

const startAtOriginOfImport = async (page) => {
  await page.goto('/plant-products')
  await page.getByRole('button', { name: 'Create a new notification' }).click()
  await page
    .getByRole('radio', { name: 'Plants, plant products and other objects' })
    .check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel(copy.countryOfOrigin.country.label).selectOption('FR')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page).toHaveURL((url) =>
    /^\/plant-products\/notifications\/[^/]+\/origin-of-import$/.test(
      url.pathname
    )
  )
}

test.describe('plant-products origin of import', () => {
  test.beforeEach(async ({ page }) => {
    await startAtOriginOfImport(page)
  })

  test('renders the complete, accessibly named page without re-collecting origin', async ({
    page
  }) => {
    await expect(
      page.getByText(pageCopy.caption, { exact: true })
    ).toBeVisible()
    const heading = page.getByRole('heading', {
      level: 1,
      name: pageCopy.heading
    })
    await expect(heading).toBeVisible()
    expect((await page.title()).split('|')[0].trim()).toBe(pageCopy.pageTitle)

    const select = page.getByLabel(pageCopy.countryOfConsignment.label, {
      exact: true
    })
    await expect(select).toHaveAccessibleName(
      pageCopy.countryOfConsignment.label
    )
    await expect(select.locator('option').first()).toHaveText(
      pageCopy.countryOfConsignment.placeholder
    )
    await expect(select.locator('option')).toHaveCount(COUNTRIES.length + 1)
    await expect(select.locator('option[value="IE"]')).toHaveText(
      'Republic of Ireland'
    )
    const ukGroup = select.locator('optgroup')
    await expect(ukGroup).toHaveAttribute(
      'label',
      copy.countryOfOrigin.country.ukGroupLabel
    )
    expect(
      await ukGroup
        .locator('option')
        .evaluateAll((options) => options.map(({ value }) => value))
    ).toEqual(['GB-ENG', 'GB-SCT', 'GB-WLS', 'GB-NIR'])

    const reference = page.getByLabel(pageCopy.internalReference.label, {
      exact: true
    })
    await expect(reference).toHaveAccessibleName(
      pageCopy.internalReference.label
    )
    await expect(reference).toHaveAccessibleDescription(
      pageCopy.internalReference.hint
    )
    await expect(reference).toHaveAttribute('maxlength', '30')
    await expect(
      page.getByLabel(copy.countryOfOrigin.country.label, { exact: true })
    ).toHaveCount(0)
    await expect(page.getByText('Region code', { exact: true })).toHaveCount(0)
    await expect(
      page.getByText('Customs reference number', { exact: true })
    ).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Save and continue' })
    ).toHaveAccessibleName('Save and continue')
    await expect(
      page.getByRole('button', { name: 'Save and return to hub' })
    ).toHaveAccessibleName('Save and return to hub')
    await expect(
      page.getByRole('link', { name: 'Cancel and return to hub' })
    ).toHaveAccessibleName('Cancel and return to hub')
    await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      /^\/plant-products\/notifications\/[^/]+$/
    )
  })

  test('saves both values to the hub and reloads their persisted codes and text', async ({
    page
  }) => {
    const originOfImportUrl = page.url()
    await page
      .getByLabel(pageCopy.countryOfConsignment.label)
      .selectOption('IE')
    await page.getByLabel(pageCopy.internalReference.label).fill('REF-123')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+$/.test(url.pathname)
    )
    await page.goto(originOfImportUrl)
    await expect(
      page.getByLabel(pageCopy.countryOfConsignment.label)
    ).toHaveValue('IE')
    await expect(page.getByLabel(pageCopy.internalReference.label)).toHaveValue(
      'REF-123'
    )
  })

  test('requires a country, preserves the raw reference and focuses the select', async ({
    page
  }) => {
    await page.getByLabel(pageCopy.internalReference.label).fill('RAW-REF')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('alert')).toContainText('There is a problem')
    const summaryLink = page.getByRole('alert').getByRole('link', {
      name: pageCopy.errors.countryOfConsignmentRequired
    })
    await expect(summaryLink).toHaveAttribute('href', '#countryOfConsignment')
    await expect(page.locator('#countryOfConsignment-error')).toContainText(
      pageCopy.errors.countryOfConsignmentRequired
    )
    await expect(page.getByLabel(pageCopy.internalReference.label)).toHaveValue(
      'RAW-REF'
    )
    await summaryLink.click()
    await expect(
      page.getByLabel(pageCopy.countryOfConsignment.label)
    ).toBeFocused()
  })

  test('rejects a 31-character reference and focuses its control', async ({
    page
  }) => {
    await page
      .getByLabel(pageCopy.countryOfConsignment.label)
      .selectOption('FR')
    await page
      .getByLabel(pageCopy.internalReference.label)
      .evaluate((input) => {
        input.value = 'R'.repeat(31)
      })
    await page.getByRole('button', { name: 'Save and continue' }).click()

    const summaryLink = page
      .getByRole('alert')
      .getByRole('link', { name: pageCopy.errors.internalReferenceMaxLength })
    await expect(summaryLink).toHaveAttribute('href', '#internalReference')
    await expect(page.locator('#internalReference-error')).toContainText(
      pageCopy.errors.internalReferenceMaxLength
    )
    await summaryLink.click()
    await expect(
      page.getByLabel(pageCopy.internalReference.label)
    ).toBeFocused()
  })

  test('accepts a valid country when the optional reference is blank', async ({
    page
  }) => {
    await page
      .getByLabel(pageCopy.countryOfConsignment.label)
      .selectOption('IE')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+$/.test(url.pathname)
    )
  })

  test('keeps the origin row in progress until the consignment country is saved', async ({
    page
  }) => {
    await page.getByRole('link', { name: 'Back' }).click()
    const originRow = page.getByRole('listitem').filter({
      has: page.getByText(pageCopy.heading, { exact: true })
    })
    await expect(originRow).toContainText('In progress')
    await originRow.getByRole('link', { name: pageCopy.heading }).click()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page
      .getByLabel(pageCopy.countryOfConsignment.label)
      .selectOption('IE')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(originRow).toContainText('Completed')
  })

  test('initial page has no serious or critical axe violations', async ({
    page
  }) => {
    const { all, seriousOrCritical } = await seriousOrCriticalViolations(page)

    expect(
      seriousOrCritical,
      `Origin of import has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(all, null, 2)}`
    ).toEqual([])
  })

  test('error page has no serious or critical axe violations', async ({
    page
  }) => {
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    const { all, seriousOrCritical } = await seriousOrCriticalViolations(page)

    expect(
      seriousOrCritical,
      `Origin-of-import error state has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(all, null, 2)}`
    ).toEqual([])
  })
})

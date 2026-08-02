// Playwright coverage required by docs/add-a-set.md step 9.
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { copy } from './copy/copy.en.js'

const startAtHub = async (page) => {
  await page.goto('/plant-products')
  await page.getByRole('button', { name: 'Create a new notification' }).click()
  await page
    .getByRole('radio', { name: 'Plants, plant products and other objects' })
    .check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page).toHaveURL((url) =>
    /^\/plant-products\/notifications\/[^/]+\/country-of-origin$/.test(
      url.pathname
    )
  )
  await page.getByRole('link', { name: 'Back' }).click()
}

test.describe('plant-products hub', () => {
  test.beforeEach(async ({ page }) => {
    await startAtHub(page)
  })

  test('renders the reference and unavailable Review and submit entry', async ({
    page
  }) => {
    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+$/.test(url.pathname)
    )
    await expect(page.getByText(/^GBN-PP-/)).toBeVisible()
    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.groups.origin })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.groups.purpose })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.groups.commodities })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.groups.transport })
    ).toBeVisible()
    const origin = page.getByRole('listitem').filter({
      has: page.getByText(copy.rows.origin.title, { exact: true })
    })
    await expect(origin).toContainText(copy.statuses.notYetStarted)
    await expect(
      origin.getByRole('link', { name: copy.rows.origin.title })
    ).toHaveAttribute(
      'href',
      /^\/plant-products\/notifications\/[^/]+\/country-of-origin$/
    )
    const purpose = page.getByRole('listitem').filter({
      has: page.getByText(copy.rows.purpose.title, { exact: true })
    })
    await expect(purpose).toContainText(copy.rows.purpose.hint)
    await expect(purpose).toContainText(copy.statuses.cannotStartYet)
    await expect(
      purpose.getByRole('link', { name: copy.rows.purpose.title })
    ).toHaveCount(0)

    await origin.getByRole('link', { name: copy.rows.origin.title }).click()
    await page.getByLabel('Country of origin').selectOption('FR')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByRole('link', { name: 'Back' }).click()

    await expect(purpose).toContainText(copy.statuses.notYetStarted)
    await expect(
      purpose.getByRole('link', { name: copy.rows.purpose.title })
    ).toHaveAttribute(
      'href',
      /^\/plant-products\/notifications\/[^/]+\/about-the-consignment$/
    )
    const commodities = page.getByRole('listitem').filter({
      has: page.getByText(copy.rows.commodities.title, { exact: true })
    })
    await expect(commodities).toContainText(copy.rows.commodities.hint)
    await expect(commodities).toContainText(copy.statuses.notYetStarted)
    await expect(
      commodities.getByRole('link', { name: copy.rows.commodities.title })
    ).toHaveAttribute(
      'href',
      /^\/plant-products\/notifications\/[^/]+\/commodity-input-method$/
    )
    const transport = page.getByRole('listitem').filter({
      has: page.getByText(copy.rows.transport.title, { exact: true })
    })
    await expect(transport).toContainText(copy.rows.transport.hint)
    await expect(transport).toContainText(copy.statuses.notYetStarted)
    await expect(
      transport.getByRole('link', { name: copy.rows.transport.title })
    ).toHaveAttribute(
      'href',
      /^\/plant-products\/notifications\/[^/]+\/transport-before-bip$/
    )
    const review = page.getByRole('listitem').filter({
      has: page.getByText(copy.review.title, { exact: true })
    })
    await expect(review).toContainText(copy.statuses.cannotStartYet)
    await expect(
      review.getByRole('link', { name: copy.review.title })
    ).toHaveCount(0)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )

    expect(seriousOrCritical).toEqual([])
  })
})

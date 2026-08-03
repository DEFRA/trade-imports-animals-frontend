import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { copy } from './copy/copy.en.js'

const hubUrl = /^\/plant-products\/notifications\/[^/]+$/

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
  await page.getByRole('link', { name: 'Back', exact: true }).click()
  await expect(page).toHaveURL((url) => hubUrl.test(url.pathname))
}

const rowFor = (page, { title }) =>
  page.getByRole('listitem').filter({
    has: page.getByText(title, { exact: true })
  })

const expectRow = async (page, rowCopy, status, href) => {
  const row = rowFor(page, rowCopy)
  await expect(row).toContainText(rowCopy.hint)
  await expect(row).toContainText(status)
  const link = row.getByRole('link', { name: rowCopy.title, exact: true })
  if (href === null) {
    await expect(link).toHaveCount(0)
    return
  }
  await expect(link).toHaveAttribute('href', href)
  await expect(link).toHaveAccessibleName(rowCopy.title)
}

const saveCountryOfOrigin = async (page) => {
  await rowFor(page, copy.rows.origin)
    .getByRole('link', { name: copy.rows.origin.title, exact: true })
    .click()
  await page.getByLabel('Country of origin').selectOption('FR')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByRole('link', { name: 'Back', exact: true }).click()
  await expect(page).toHaveURL((url) => hubUrl.test(url.pathname))
}

test.describe('plant-products hub', () => {
  test.beforeEach(async ({ page }) => {
    await startAtHub(page)
  })

  test('renders the reference and unavailable Review and submit entry', async ({
    page
  }) => {
    await expect(page.getByText(/^GBN-PP-/)).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: copy.title, exact: true })
    ).toBeVisible()
    await expect(page.getByText(copy.intro, { exact: true })).toBeVisible()

    await expect(
      page.locator('main').getByRole('heading', { level: 2 })
    ).toHaveText(Object.values(copy.groups))
    await expect(page.locator('.govuk-task-list')).toHaveCount(7)
    await expect(page.locator('.govuk-task-list__status')).toHaveText([
      copy.statuses.notYetStarted,
      copy.statuses.cannotStartYet,
      copy.statuses.cannotStartYet,
      copy.statuses.cannotStartYet,
      copy.statuses.cannotStartYet,
      copy.statuses.cannotStartYet,
      copy.statuses.cannotStartYet
    ])

    await expectRow(
      page,
      copy.rows.origin,
      copy.statuses.notYetStarted,
      /^\/plant-products\/notifications\/[^/]+\/country-of-origin$/
    )
    await expectRow(page, copy.rows.purpose, copy.statuses.cannotStartYet, null)
    await expectRow(
      page,
      copy.rows.commodities,
      copy.statuses.cannotStartYet,
      null
    )
    await expectRow(
      page,
      copy.rows['additional-details'],
      copy.statuses.cannotStartYet,
      null
    )
    await expectRow(
      page,
      copy.rows.transport,
      copy.statuses.cannotStartYet,
      null
    )
    await expectRow(
      page,
      copy.rows.documents,
      copy.statuses.cannotStartYet,
      null
    )
    await expectRow(page, copy.rows.review, copy.statuses.cannotStartYet, null)
    await expect(page.getByText('To do', { exact: true })).toHaveCount(0)
  })

  test('preserves every row status and link as a notification becomes partly complete', async ({
    page
  }) => {
    const reference = await page.getByText(/^GBN-PP-/).textContent()
    await saveCountryOfOrigin(page)

    await expect(page.getByText(reference, { exact: true })).toBeVisible()
    await expect(page.locator('.govuk-task-list__status')).toHaveText([
      copy.statuses.inProgress,
      copy.statuses.notYetStarted,
      copy.statuses.notYetStarted,
      copy.statuses.cannotStartYet,
      copy.statuses.cannotStartYet,
      copy.statuses.cannotStartYet,
      copy.statuses.cannotStartYet
    ])
    await expectRow(
      page,
      copy.rows.origin,
      copy.statuses.inProgress,
      /^\/plant-products\/notifications\/[^/]+\/country-of-origin$/
    )
    await expectRow(
      page,
      copy.rows.purpose,
      copy.statuses.notYetStarted,
      /^\/plant-products\/notifications\/[^/]+\/about-the-consignment$/
    )
    await expectRow(
      page,
      copy.rows.commodities,
      copy.statuses.notYetStarted,
      /^\/plant-products\/notifications\/[^/]+\/commodity-input-method$/
    )
    await expectRow(
      page,
      copy.rows['additional-details'],
      copy.statuses.cannotStartYet,
      null
    )
    await expectRow(
      page,
      copy.rows.transport,
      copy.statuses.cannotStartYet,
      null
    )
    await expectRow(
      page,
      copy.rows.documents,
      copy.statuses.cannotStartYet,
      null
    )
    await expectRow(page, copy.rows.review, copy.statuses.cannotStartYet, null)
  })

  test('marks a completed purpose green while preserving the stable notification reference', async ({
    page
  }) => {
    const reference = await page.getByText(/^GBN-PP-/).textContent()
    await saveCountryOfOrigin(page)
    await rowFor(page, copy.rows.purpose)
      .getByRole('link', { name: copy.rows.purpose.title, exact: true })
      .click()
    await page.getByRole('radio', { name: 'Internal market' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page).toHaveURL((url) => hubUrl.test(url.pathname))
    await expect(page.getByText(reference, { exact: true })).toBeVisible()
    const purposeStatus = rowFor(page, copy.rows.purpose).locator(
      '.govuk-task-list__status'
    )
    await expect(purposeStatus).toHaveText(copy.statuses.completed)
    await expect(purposeStatus.locator('.govuk-tag')).toHaveClass(
      /govuk-tag--green/
    )

    const savedHubUrl = page.url()
    await rowFor(page, copy.rows.purpose)
      .getByRole('link', { name: copy.rows.purpose.title, exact: true })
      .click()
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    await expect(page).toHaveURL(savedHubUrl)
    await expect(page.getByText(reference, { exact: true })).toBeVisible()
  })

  test('unlocks commodity-dependent rows without changing their computed accessible names', async ({
    page
  }) => {
    await saveCountryOfOrigin(page)
    await rowFor(page, copy.rows.commodities)
      .getByRole('link', { name: copy.rows.commodities.title, exact: true })
      .click()
    await page.getByRole('radio', { name: 'Manual entry' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Enter commodity code').fill('06011010')
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page.locator('.govuk-task-list__status')).toHaveText([
      copy.statuses.inProgress,
      copy.statuses.notYetStarted,
      copy.statuses.inProgress,
      copy.statuses.notYetStarted,
      copy.statuses.notYetStarted,
      copy.statuses.notYetStarted,
      copy.statuses.cannotStartYet
    ])
    await expectRow(
      page,
      copy.rows['additional-details'],
      copy.statuses.notYetStarted,
      /^\/plant-products\/notifications\/[^/]+\/commodity-additional-details$/
    )
    await expectRow(
      page,
      copy.rows.transport,
      copy.statuses.notYetStarted,
      /^\/plant-products\/notifications\/[^/]+\/transport-before-bip$/
    )
    await expectRow(
      page,
      copy.rows.documents,
      copy.statuses.notYetStarted,
      /^\/plant-products\/notifications\/[^/]+\/accompanying-documents$/
    )
  })

  test('uses real dashboard links without duplicating breadcrumbs', async ({
    page
  }) => {
    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute('href', '/plant-products')
    await expect(
      page.getByRole('button', { name: copy.returnToDashboard, exact: true })
    ).toHaveAttribute('href', '/plant-products')
    await expect(page.locator('a[href="#"]')).toHaveCount(0)
    await expect(page.locator('.govuk-breadcrumbs')).toHaveCount(0)

    await page.getByRole('link', { name: 'Back', exact: true }).click()
    await expect(page).toHaveURL('/plant-products')
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
      `Hub has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})

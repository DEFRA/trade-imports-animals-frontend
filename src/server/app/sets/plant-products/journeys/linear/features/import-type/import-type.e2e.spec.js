import { expect, test } from '@playwright/test'

import { axeViolations as seriousOrCriticalViolations } from '../axe.e2e-helper.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

const expectedOptions = Object.entries(copy.importTypes).map(
  ([value, label]) => ({ value, label })
)

const startAtImportType = async (page) => {
  await page.goto('/plant-products')
  await page.getByRole('button', { name: 'Create a new notification' }).click()
  await expect(page).toHaveURL((url) =>
    /^\/plant-products\/notifications\/[^/]+\/import-type$/.test(url.pathname)
  )
}

test.describe('plant-products import type', () => {
  test.beforeEach(async ({ page }) => {
    await startAtImportType(page)
  })

  test('renders an accessibly named group with exactly four enabled, hint-free options', async ({
    page
  }) => {
    await expect(page.getByText(copy.caption, { exact: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: copy.legend })
    ).toBeVisible()

    const group = page.getByRole('group', { name: copy.legend })
    await expect(group).toHaveAccessibleName(`${copy.caption} ${copy.legend}`)
    const rendered = await group
      .locator('input[name="importType"]')
      .evaluateAll((inputs) =>
        inputs.map((input) => ({
          value: input.value,
          label: input.labels[0].textContent.trim()
        }))
      )
    expect(rendered).toEqual(expectedOptions)
    await expect(group.getByRole('radio')).toHaveCount(4)
    await expect(group.locator('input')).toHaveCount(4)
    await expect(group.locator('input[disabled]')).toHaveCount(0)
    await expect(group.locator('input[required]')).toHaveCount(0)
    await expect(group.locator('.govuk-hint')).toHaveCount(0)
    await expect(group).not.toContainText(/debt|debtor|overdue/i)
    await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      '/plant-products'
    )
  })

  test('refuses a cold prefixed deep link but never intercepts entry surfaces', async ({
    page
  }) => {
    const importTypeUrl = new URL(page.url())
    const journeyId = importTypeUrl.pathname.split('/')[3]
    const deepLink = `/plant-products/notifications/${journeyId}`

    const guarded = await page.request.get(deepLink, { maxRedirects: 0 })
    expect(guarded.status()).toBe(302)
    expect(guarded.headers().location).toBe(importTypeUrl.pathname)

    await page.goto(importTypeUrl.pathname)
    await expect(page).toHaveURL(importTypeUrl.pathname)
    await page.goto('/plant-products')
    await expect(page).toHaveURL('/plant-products')
  })

  test('saves plants to flow state, lands on country of origin and prefills on revisit', async ({
    page
  }) => {
    const importTypeUrl = page.url()
    await page.getByRole('radio', { name: copy.importTypes.plants }).check()
    await page.getByRole('button', { name: copy.continueButton }).click()

    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+\/country-of-origin$/.test(
        url.pathname
      )
    )
    await page.goto(importTypeUrl)
    await expect(
      page.getByRole('radio', { name: copy.importTypes.plants })
    ).toBeChecked()
  })

  test('keeps all plant session cookies isolated from live animals', async ({
    page
  }) => {
    await page.getByRole('radio', { name: copy.importTypes.plants }).check()
    await page.getByRole('button', { name: copy.continueButton }).click()
    const reference = await page.getByText(/^GBN-PP-/).textContent()
    const cookies = await page.context().cookies()
    const plantCookies = cookies.filter(({ name }) =>
      name.startsWith('plantProducts')
    )

    expect(
      plantCookies
        .map(({ name, path }) => ({ name, path }))
        .sort((a, b) => a.name.localeCompare(b.name))
    ).toEqual(
      [
        'plantProductsFlowOnlyAnswers',
        'plantProductsKnownJourneys',
        'plantProductsOpeningRun'
      ].map((name) => ({ name, path: '/plant-products' }))
    )
    expect(cookies.some(({ name }) => name.startsWith('liveAnimals'))).toBe(
      false
    )

    await page.goto('/live-animals')
    await expect(
      page.getByRole('heading', { name: 'Import notification service' })
    ).toBeVisible()
    await expect(page.getByText(reference)).toHaveCount(0)
    await page.goto('/')
    await expect(page).toHaveURL('/live-animals')
  })

  test('lists and resumes the same draft reference through the set', async ({
    page
  }) => {
    await page.getByRole('radio', { name: copy.importTypes.plants }).check()
    await page.getByRole('button', { name: copy.continueButton }).click()
    const hubUrl = page.url()
    const reference = await page.getByText(/^GBN-PP-/).textContent()

    await page.goto('/plant-products')
    const draftRow = page.getByRole('row').filter({ hasText: reference })
    await expect(draftRow).toContainText(dashboardCopy.statuses.draft)

    await page.goto(hubUrl)
    await expect(page.getByText(reference, { exact: true })).toBeVisible()
  })

  test('returns 400 and focuses the first radio from the empty-submit error summary', async ({
    page
  }) => {
    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' && response.url() === page.url()
    )
    await page.getByRole('button', { name: copy.continueButton }).click()
    const response = await responsePromise

    expect(response.status()).toBe(400)
    const summary = page.getByRole('alert')
    await expect(summary).toContainText('There is a problem')
    const link = summary.getByRole('link', {
      name: copy.errors.importTypeRequired
    })
    const group = page.getByRole('group', { name: copy.legend })
    await expect(group.locator('.govuk-error-message')).toContainText(
      copy.errors.importTypeRequired
    )
    await link.click()
    await expect(group.getByRole('radio').first()).toBeFocused()
    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+\/import-type$/.test(url.pathname)
    )
  })

  test('sends a non-plant answer to the holding page and preserves it on return', async ({
    page
  }) => {
    await page
      .getByRole('radio', { name: copy.importTypes['live-animals'] })
      .check()
    await page.getByRole('button', { name: copy.continueButton }).click()

    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+\/import-type\/not-available$/.test(
        url.pathname
      )
    )
    await expect(
      page.getByRole('heading', { name: copy.notAvailable.title })
    ).toBeVisible()
    await expect(page.getByText(copy.notAvailable.onlyCovers)).toBeVisible()
    await page
      .getByRole('link', { name: copy.notAvailable.changeAnswer })
      .click()

    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+\/import-type$/.test(url.pathname)
    )
    await expect(
      page.getByRole('radio', { name: copy.importTypes['live-animals'] })
    ).toBeChecked()
  })

  test('has no serious or critical axe violations on initial render', async ({
    page
  }) => {
    const { all, seriousOrCritical } = await seriousOrCriticalViolations(page)
    expect(
      seriousOrCritical,
      `Import type has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(all, null, 2)}`
    ).toEqual([])
  })

  test('has no serious or critical axe violations in the validation error state', async ({
    page
  }) => {
    await page.getByRole('button', { name: copy.continueButton }).click()
    const { all, seriousOrCritical } = await seriousOrCriticalViolations(page)
    expect(
      seriousOrCritical,
      `Import type error state has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(all, null, 2)}`
    ).toEqual([])
  })
})

// Playwright coverage required by docs/add-a-set.md step 9.
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { copy } from './copy/copy.en.js'

const startAtImportType = async (page) => {
  await page.goto('/plant-products')
  await page.getByRole('button', { name: 'Create a new notification' }).click()
  await expect(page).toHaveURL((url) =>
    /^\/plant-products\/notifications\/[^/]+\/import-type$/.test(url.pathname)
  )
}

const seriousOrCriticalViolations = async (page) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  return results.violations.filter(({ impact }) =>
    ['serious', 'critical'].includes(impact)
  )
}

test.describe('plant-products import type', () => {
  test.beforeEach(async ({ page }) => {
    await startAtImportType(page)
  })

  test('renders the caption, legend heading and four certificate types', async ({
    page
  }) => {
    await expect(page.getByText(copy.caption, { exact: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: copy.title })
    ).toBeVisible()
    await expect(page.getByRole('radio')).toHaveCount(4)
    await expect(
      page.getByRole('radio', { name: copy.importTypes.plantProducts })
    ).toBeVisible()
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

  test('saves the plant selection and exits the opening run to the plant hub', async ({
    page
  }) => {
    await page
      .getByRole('radio', { name: copy.importTypes.plantProducts })
      .check()
    await page.getByRole('button', { name: copy.continueButton }).click()

    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+$/.test(url.pathname)
    )
    await expect(
      page.getByText('Review and submit', { exact: true })
    ).toBeVisible()
    await expect(page.getByText(/^GBN-PP-/)).toBeVisible()
  })

  test('keeps all plant session cookies isolated from live animals', async ({
    page
  }) => {
    await page
      .getByRole('radio', { name: copy.importTypes.plantProducts })
      .check()
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
    await page
      .getByRole('radio', { name: copy.importTypes.plantProducts })
      .check()
    await page.getByRole('button', { name: copy.continueButton }).click()
    const hubUrl = page.url()
    const reference = await page.getByText(/^GBN-PP-/).textContent()

    await page.goto('/plant-products')
    const draftRow = page.getByRole('row').filter({ hasText: reference })
    await expect(draftRow).toContainText('draft')

    await page.goto(hubUrl)
    await expect(page.getByText(reference, { exact: true })).toBeVisible()
  })

  test('links the empty-submit error summary to the radio group', async ({
    page
  }) => {
    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' && response.url() === page.url()
    )
    await page.getByRole('button', { name: copy.continueButton }).click()
    const response = await responsePromise

    expect(response.status()).toBe(400)
    await expect(page.getByRole('alert')).toContainText('There is a problem')
    const link = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.importTypeRequired })
    await link.click()
    await expect(page.getByRole('radio').first()).toBeFocused()
    const heading = page.locator('fieldset legend h1')
    await expect(heading).toContainText(copy.title)
    await expect(heading.locator('.govuk-caption-l')).toHaveText(copy.caption)
  })

  test('sends a non-plant selection to the holding page', async ({ page }) => {
    await page
      .getByRole('radio', { name: copy.importTypes.liveAnimals })
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
  })

  test('has no serious or critical axe violations initially or after validation', async ({
    page
  }) => {
    expect(await seriousOrCriticalViolations(page)).toEqual([])

    await page.getByRole('button', { name: copy.continueButton }).click()
    expect(await seriousOrCriticalViolations(page)).toEqual([])
  })
})

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { COUNTRIES } from '../../../../../services/reference/countries.js'
import { copy } from '../copy/copy.en.js'

const pageCopy = copy.countryOfOrigin

const startAtCountryOfOrigin = async (page) => {
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
}

const seriousOrCriticalViolations = async (page) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  return {
    all: results.violations,
    seriousOrCritical: results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )
  }
}

test.describe('plant-products country of origin', () => {
  test.beforeEach(async ({ page }) => {
    await startAtCountryOfOrigin(page)
  })

  test('renders the complete, accessibly named country selector and page copy', async ({
    page
  }) => {
    await expect(
      page.getByText(pageCopy.caption, { exact: true })
    ).toBeVisible()
    const heading = page.getByRole('heading', {
      level: 1,
      name: pageCopy.title
    })
    await expect(heading).toBeVisible()
    expect((await page.title()).split('|')[0].trim()).toBe(
      await heading.textContent()
    )

    const select = page.getByLabel(pageCopy.country.label, { exact: true })
    await expect(select).toHaveAccessibleName(pageCopy.country.label)
    await expect(select).toHaveClass(/govuk-!-width-one-half/)
    await expect(select.locator('option').first()).toHaveText(
      pageCopy.country.placeholder
    )
    await expect(select.locator('option')).toHaveCount(COUNTRIES.length + 1)
    await expect(select.locator('option[value="IE"]')).toHaveText(
      'Republic of Ireland'
    )

    const ukGroup = select.locator('optgroup')
    await expect(ukGroup).toHaveCount(1)
    await expect(ukGroup).toHaveAttribute(
      'label',
      pageCopy.country.ukGroupLabel
    )
    expect(
      await ukGroup
        .locator('option')
        .evaluateAll((options) => options.map(({ value }) => value))
    ).toEqual(['GB-ENG', 'GB-SCT', 'GB-WLS', 'GB-NIR'])
    await expect(page.locator('form').getByRole('button')).toHaveCount(1)
    await expect(
      page.getByRole('button', { name: 'Save and continue' })
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      /^\/plant-products\/notifications\/[^/]+$/
    )
  })

  test('follows import type in the opening run without leaving plant-products', async ({
    page
  }) => {
    await expect(page).toHaveURL((url) =>
      url.pathname.startsWith('/plant-products/notifications/')
    )
    await expect(
      page.getByRole('heading', { level: 1, name: pageCopy.title })
    ).toBeVisible()
  })

  test('saves the country code, continues to origin-of-import and prefills on revisit', async ({
    page
  }) => {
    const countryUrl = page.url()
    await page.getByLabel(pageCopy.country.label).selectOption('FR')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+\/origin-of-import$/.test(
        url.pathname
      )
    )

    await page.goto(countryUrl)
    await expect(page.getByLabel(pageCopy.country.label)).toHaveValue('FR')
  })

  test('rejects an empty country and focuses the select from the summary link', async ({
    page
  }) => {
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('alert')).toContainText('There is a problem')
    const summaryLink = page
      .getByRole('alert')
      .getByRole('link', { name: pageCopy.errors.countryRequired })
    await expect(summaryLink).toHaveAttribute('href', '#countryOfOrigin')
    await expect(page.locator('#countryOfOrigin-error')).toContainText(
      pageCopy.errors.countryRequired
    )
    await summaryLink.click()
    await expect(page.getByLabel(pageCopy.country.label)).toBeFocused()
    await expect(page.getByLabel(pageCopy.country.label)).toHaveValue('')
  })

  test('initial page has no serious or critical axe violations', async ({
    page
  }) => {
    const { all, seriousOrCritical } = await seriousOrCriticalViolations(page)

    expect(
      seriousOrCritical,
      `Country of origin has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(all, null, 2)}`
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
      `Country-of-origin error state has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(all, null, 2)}`
    ).toEqual([])
  })
})

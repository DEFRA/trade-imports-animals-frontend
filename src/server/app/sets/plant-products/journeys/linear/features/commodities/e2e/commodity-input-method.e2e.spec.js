import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { copy as featureCopy } from '../copy/copy.en.js'

const copy = featureCopy.inputMethod

const startAtCommodityInputMethod = async (page) => {
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
  await page.getByLabel('Country of origin').selectOption('FR')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByRole('link', { name: 'Back' }).click()
  await page.getByRole('link', { name: 'Commodity', exact: true }).click()
  await expect(page).toHaveURL((url) =>
    /^\/plant-products\/notifications\/[^/]+\/commodity-input-method$/.test(
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

test.describe('plant-products commodity input method', () => {
  test.beforeEach(async ({ page }) => {
    await startAtCommodityInputMethod(page)
  })

  test('renders the canonical question, caption, bold radio labels and hints with an accessible group name', async ({
    page
  }) => {
    await expect(page.getByText(copy.caption, { exact: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: copy.heading })
    ).toBeVisible()

    const group = page.locator('fieldset')
    await expect(group).toHaveCount(1)
    await expect(group).toHaveAccessibleName(`${copy.caption} ${copy.heading}`)

    const radios = group.locator('input[name="commodityInputMethod"]')
    await expect(radios).toHaveCount(2)
    expect(
      await radios.evaluateAll((inputs) => inputs.map(({ value }) => value))
    ).toEqual(['MANUAL', 'CSV'])
    await expect(
      group.locator('input[name="commodityInputMethod"]:checked')
    ).toHaveCount(0)

    for (const value of ['MANUAL', 'CSV']) {
      const option = copy.options[value]
      const radio = group.locator(
        `input[name="commodityInputMethod"][value="${value}"]`
      )
      await expect(radio).toHaveAccessibleName(option.label)
      const describedBy = await radio.getAttribute('aria-describedby')
      expect(describedBy).toBeTruthy()
      await expect(page.locator(`#${describedBy}`)).toHaveText(option.hint)
      await expect(page.getByText(option.label, { exact: true })).toHaveClass(
        /govuk-!-font-weight-bold/
      )
    }
    await expect(
      page.getByRole('button', { name: 'Save and continue' })
    ).toBeVisible()
  })

  test('saves Manual entry, advances to commodity search and persists it on reload', async ({
    page
  }) => {
    const formUrl = page.url()
    await page
      .getByRole('radio', { name: copy.options.MANUAL.label, exact: true })
      .check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+\/commodity-search$/.test(
        url.pathname
      )
    )

    await page.goto(formUrl)
    await expect(
      page.getByRole('radio', {
        name: copy.options.MANUAL.label,
        exact: true
      })
    ).toBeChecked()
    await expect(
      page.locator('input[name="commodityInputMethod"]:checked')
    ).toHaveValue('MANUAL')
  })

  test('saves and persists the CSV input method through the same route', async ({
    page
  }) => {
    const formUrl = page.url()
    await page
      .getByRole('radio', { name: copy.options.CSV.label, exact: true })
      .check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+\/commodity-search$/.test(
        url.pathname
      )
    )
    await page.goto(formUrl)
    await expect(
      page.getByRole('radio', { name: copy.options.CSV.label, exact: true })
    ).toBeChecked()
    await expect(
      page.locator('input[name="commodityInputMethod"]:checked')
    ).toHaveValue('CSV')
  })

  test('shows the canonical linked errors, focuses the first radio and commits nothing', async ({
    page
  }) => {
    await page.getByRole('button', { name: 'Save and continue' }).click()

    const alert = page.getByRole('alert')
    await expect(alert).toContainText('There is a problem')
    const summaryLink = alert.getByRole('link', {
      name: copy.errors.required
    })
    await expect(summaryLink).toHaveAttribute('href', '#commodityInputMethod')
    await summaryLink.click()
    await expect(page.locator('#commodityInputMethod')).toBeFocused()

    const inlineError = page.locator('#commodityInputMethod-error')
    await expect(inlineError).toContainText(`Error: ${copy.errors.required}`)
    await expect(page.locator('fieldset')).toHaveAttribute(
      'aria-describedby',
      /commodityInputMethod-error/
    )

    await page.getByRole('link', { name: 'Back' }).click()
    const row = page.getByRole('listitem').filter({
      has: page.getByText('Commodity', { exact: true })
    })
    await expect(row).toContainText('Not yet started')
  })

  test('initial page has no serious or critical axe violations', async ({
    page
  }) => {
    const { all, seriousOrCritical } = await seriousOrCriticalViolations(page)

    expect(
      seriousOrCritical,
      `Commodity input method has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(all, null, 2)}`
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
      `Commodity input method error state has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(all, null, 2)}`
    ).toEqual([])
  })
})

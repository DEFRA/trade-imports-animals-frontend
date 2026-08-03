import { expect, test } from '@playwright/test'

import { axeViolations as seriousOrCriticalViolations } from '../../axe.e2e-helper.js'
import { copy as featureCopy } from '../copy/copy.en.js'

const copy = featureCopy.commoditySearch

const startAtCommoditySearch = async (page) => {
  await page.goto('/plant-products')
  await page.getByRole('button', { name: 'Create a new notification' }).click()
  await page
    .getByRole('radio', { name: 'Plants, plant products and other objects' })
    .check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Country of origin').selectOption('FR')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByRole('link', { name: 'Back' }).click()
  await page.getByRole('link', { name: 'Commodity', exact: true }).click()
  await page.getByRole('radio', { name: 'Manual entry' }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page).toHaveURL((url) =>
    /^\/plant-products\/notifications\/[^/]+\/commodity-search$/.test(
      url.pathname
    )
  )
}

const panels = (page) => ({
  code: page.locator('#commodity-code-search'),
  species: page.locator('#genus-and-species-search')
})

const expectLinkedError = async (page, field, message) => {
  const alert = page.getByRole('alert')
  await expect(alert).toContainText('There is a problem')
  const summaryLink = alert.getByRole('link', { name: message })
  await expect(summaryLink).toHaveAttribute('href', `#${field}`)
  await summaryLink.click()
  await expect(page.locator(`#${field}`)).toBeFocused()
  await expect(page.locator(`#${field}-error`)).toContainText(
    `Error: ${message}`
  )
}

test.describe('plant-products commodity search', () => {
  test.beforeEach(async ({ page }) => {
    await startAtCommoditySearch(page)
  })

  test('renders both named tab panels, wired hints and fixture tree without duplicate landmark names', async ({
    page
  }) => {
    await expect(page.getByText(copy.caption, { exact: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: copy.heading })
    ).toBeVisible()
    await expect(
      page.getByRole('tab', { name: copy.tabs.codeSearch })
    ).toBeVisible()
    await expect(
      page.getByRole('tab', { name: copy.tabs.speciesSearch })
    ).toBeVisible()
    await expect(panels(page).code).toHaveAccessibleName(copy.tabs.codeSearch)

    const codeInput = page.getByLabel(copy.codeSearch.label)
    await expect(codeInput).toHaveAttribute('inputmode', 'numeric')
    const codeHint = await codeInput.getAttribute('aria-describedby')
    expect(codeHint).toBeTruthy()
    await expect(page.locator(`#${codeHint}`)).toHaveText(copy.codeSearch.hint)

    const chapterLink = panels(page).code.getByRole('link', {
      name: /^06 LIVE TREES/
    })
    await expect(chapterLink).toHaveAttribute(
      'href',
      /^\/plant-products\/notifications\/[^/]+\/commodity-search\?parent=06$/
    )

    await page.getByRole('tab', { name: copy.tabs.speciesSearch }).click()
    await expect(panels(page).species).toHaveAccessibleName(
      copy.tabs.speciesSearch
    )
    const speciesInput = page.getByLabel(copy.speciesSearch.label)
    const speciesHint = await speciesInput.getAttribute('aria-describedby')
    expect(speciesHint).toBeTruthy()
    await expect(page.locator(`#${speciesHint}`)).toHaveText(
      copy.speciesSearch.hint
    )

    const landmarkNames = await page
      .getByRole('navigation')
      .evaluateAll((landmarks) =>
        landmarks.map(
          (landmark) =>
            landmark.getAttribute('aria-label') ??
            landmark.getAttribute('aria-labelledby') ??
            ''
        )
      )
    expect(landmarkNames.every(Boolean)).toBe(true)
    expect(new Set(landmarkNames).size).toBe(landmarkNames.length)
  })

  test('adds a valid commodity code and shows the persisted line in the hub status', async ({
    page
  }) => {
    await page.getByLabel(copy.codeSearch.label).fill('06011010')
    await panels(page).code.getByRole('button', { name: 'Search' }).click()
    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+\/commodity-basic-description$/.test(
        url.pathname
      )
    )
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    const row = page.getByRole('listitem').filter({
      has: page.getByText('Commodity', { exact: true })
    })
    await expect(row).toContainText('In progress')
    await expect(
      page.getByRole('link', { name: 'Transport to the BCP', exact: true })
    ).toBeVisible()
  })

  test('rejects a commodity code already persisted on the notification', async ({
    page
  }) => {
    const searchUrl = page.url()
    await page.getByLabel(copy.codeSearch.label).fill('06011010')
    await panels(page).code.getByRole('button', { name: 'Search' }).click()

    await page.goto(searchUrl)
    await page.getByLabel(copy.codeSearch.label).fill('06011010')
    await panels(page).code.getByRole('button', { name: 'Search' }).click()
    await expectLinkedError(
      page,
      'commoditySearchCode',
      copy.errors.codeDuplicate
    )
  })

  test('browses through a prefixed GET link and selects a leaf', async ({
    page
  }) => {
    await panels(page)
      .code.getByRole('link', { name: /^06 LIVE TREES/ })
      .click()
    await expect(page).toHaveURL(
      (url) =>
        /^\/plant-products\/notifications\/[^/]+\/commodity-search$/.test(
          url.pathname
        ) && url.searchParams.get('parent') === '06'
    )
    await expect(
      page.getByRole('link', { name: copy.tree.allCommodities })
    ).toHaveAttribute(
      'href',
      /^\/plant-products\/notifications\/[^/]+\/commodity-search$/
    )
    const row = page.getByRole('row').filter({ hasText: '06011010 Hyacinths' })
    await row.getByRole('button', { name: copy.tree.select }).click()
    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+\/commodity-basic-description$/.test(
        url.pathname
      )
    )
  })

  test('links and focuses the empty commodity-code error', async ({ page }) => {
    await panels(page).code.getByRole('button', { name: 'Search' }).click()
    await expectLinkedError(
      page,
      'commoditySearchCode',
      copy.errors.codeRequired
    )
  })

  test('rejects a non-numeric commodity code and preserves the raw value', async ({
    page
  }) => {
    await page.getByLabel(copy.codeSearch.label).fill('not-a-code')
    await panels(page).code.getByRole('button', { name: 'Search' }).click()
    await expectLinkedError(
      page,
      'commoditySearchCode',
      copy.errors.codeNumeric
    )
    await expect(page.getByLabel(copy.codeSearch.label)).toHaveValue(
      'not-a-code'
    )
  })

  test('renders explicit no results without an error summary and preserves the code', async ({
    page
  }) => {
    await page.getByLabel(copy.codeSearch.label).fill('99999999')
    await panels(page).code.getByRole('button', { name: 'Search' }).click()
    await expect(
      page.getByText(copy.codeSearch.noResults, { exact: true })
    ).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.getByLabel(copy.codeSearch.label)).toHaveValue('99999999')
  })

  test('links and focuses the empty genus-and-species error', async ({
    page
  }) => {
    await page.getByRole('tab', { name: copy.tabs.speciesSearch }).click()
    await panels(page).species.getByRole('button', { name: 'Search' }).click()
    await expectLinkedError(
      page,
      'speciesSearchTerm',
      copy.errors.speciesRequired
    )
  })

  test('searches species and adds its commodity with the EPPO-backed result', async ({
    page
  }) => {
    await page.getByRole('tab', { name: copy.tabs.speciesSearch }).click()
    await page.getByLabel(copy.speciesSearch.label).fill('Citrus')
    await panels(page).species.getByRole('button', { name: 'Search' }).click()
    const result = page.getByRole('listitem').filter({
      hasText: 'Citrus australasica — 08059000'
    })
    await result.getByRole('button', { name: copy.speciesSearch.add }).click()
    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+\/commodity-basic-description$/.test(
        url.pathname
      )
    )
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    const row = page.getByRole('listitem').filter({
      has: page.getByText('Commodity', { exact: true })
    })
    await expect(row).toContainText('In progress')
  })

  test('rejects a species result whose commodity code is already persisted', async ({
    page
  }) => {
    const searchUrl = page.url()
    await page.getByRole('tab', { name: copy.tabs.speciesSearch }).click()
    await page.getByLabel(copy.speciesSearch.label).fill('Citrus')
    await panels(page).species.getByRole('button', { name: 'Search' }).click()
    await page
      .getByRole('listitem')
      .filter({ hasText: 'Citrus australasica — 08059000' })
      .getByRole('button', { name: copy.speciesSearch.add })
      .click()

    await page.goto(searchUrl)
    await page.getByRole('tab', { name: copy.tabs.speciesSearch }).click()
    await page.getByLabel(copy.speciesSearch.label).fill('Citrus')
    await panels(page).species.getByRole('button', { name: 'Search' }).click()
    await page
      .getByRole('listitem')
      .filter({ hasText: 'Citrus australasica — 08059000' })
      .getByRole('button', { name: copy.speciesSearch.add })
      .click()
    await expectLinkedError(
      page,
      'speciesSearchTerm',
      copy.errors.codeDuplicate
    )
  })

  test('initial page has no serious or critical axe violations', async ({
    page
  }) => {
    const { all, seriousOrCritical } = await seriousOrCriticalViolations(page)
    expect(
      seriousOrCritical,
      `Commodity search has serious/critical accessibility violations.\n${JSON.stringify(all, null, 2)}`
    ).toEqual([])
  })

  test('validation-error page has no serious or critical axe violations', async ({
    page
  }) => {
    await panels(page).code.getByRole('button', { name: 'Search' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    const { all, seriousOrCritical } = await seriousOrCriticalViolations(page)
    expect(
      seriousOrCritical,
      `Commodity search error has serious/critical accessibility violations.\n${JSON.stringify(all, null, 2)}`
    ).toEqual([])
  })
})

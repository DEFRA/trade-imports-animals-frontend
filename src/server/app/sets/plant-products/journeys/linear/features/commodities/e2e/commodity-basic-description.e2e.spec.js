import { expect, test } from '@playwright/test'

import { axeViolations as seriousOrCriticalViolations } from '../../axe.e2e-helper.js'
import { copy as featureCopy } from '../copy/copy.en.js'

const copy = featureCopy.basicDescription
const commodityCode = '06042090'

const startAtBasicDescription = async (page) => {
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
  await page.getByLabel('Enter commodity code').fill(commodityCode)
  await page
    .locator('#commodity-code-search')
    .getByRole('button', { name: 'Search' })
    .click()
  await expect(page).toHaveURL((url) =>
    /^\/plant-products\/notifications\/[^/]+\/commodity-basic-description$/.test(
      url.pathname
    )
  )
}

const resultsTable = (page) =>
  page.getByRole('table', {
    name: `${copy.results.caption} ${commodityCode}`
  })

const addedTable = (page) =>
  page.getByRole('table', {
    name: `${copy.added.caption} ${commodityCode}`
  })

const addSpecies = async (page, genusAndSpecies) => {
  await resultsTable(page)
    .getByRole('button', {
      name: `${copy.results.addLabel} ${genusAndSpecies} ${copy.results.addHidden} ${commodityCode}`
    })
    .click()
}

const expectNoSeriousOrCriticalViolations = async (page, state) => {
  const { all, seriousOrCritical } = await seriousOrCriticalViolations(page)
  expect(
    seriousOrCritical,
    `Commodity basic description ${state} has serious/critical accessibility violations.\n${JSON.stringify(all, null, 2)}`
  ).toEqual([])
}

test.describe('plant-products commodity basic description', () => {
  test.beforeEach(async ({ page }) => {
    await startAtBasicDescription(page)
  })

  test('renders the commodity card, fixture candidates and named controls', async ({
    page
  }) => {
    await expect(page.getByText(copy.caption, { exact: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: copy.heading })
    ).toBeVisible()
    const card = page.getByRole('region', {
      name: `${copy.heading} ${commodityCode}`
    })
    await expect(card).toContainText('Other')
    await expect(card.getByText(copy.legend, { exact: true })).toBeVisible()
    await expect(card.getByText(copy.hint, { exact: true })).toBeVisible()
    await expect(card.getByLabel(copy.filter.genusLabel)).toBeVisible()
    await expect(card.getByLabel(copy.filter.eppoLabel)).toBeVisible()
    await expect(resultsTable(page)).toContainText(
      '+ Crataegomespilus dardarii'
    )
    await expect(resultsTable(page)).toContainText('Lens culinaris')
    await expect(resultsTable(page).getByText('CXQDA')).toBeVisible()
    await expect(resultsTable(page).getByText('LENCU')).toBeVisible()
  })

  test('filters by an EPPO-code substring and clears back to the full list', async ({
    page
  }) => {
    await page.getByLabel(copy.filter.eppoLabel).fill('enc')
    await page
      .getByRole('button', { name: copy.filter.searchLabel, exact: true })
      .click()

    await expect(resultsTable(page)).toContainText('Lens culinaris')
    await expect(resultsTable(page)).not.toContainText(
      '+ Crataegomespilus dardarii'
    )
    await page
      .getByRole('link', { name: `${copy.filter.clearLabel} ${commodityCode}` })
      .click()
    await expect(resultsTable(page)).toContainText(
      '+ Crataegomespilus dardarii'
    )
  })

  test('renders no search results inside the headed table without an error summary', async ({
    page
  }) => {
    await page.getByLabel(copy.filter.genusLabel).fill('nothing matches')
    await page
      .getByRole('button', { name: copy.filter.searchLabel, exact: true })
      .click()

    const table = resultsTable(page)
    await expect(table.getByText(copy.results.noResults)).toBeVisible()
    await expect(
      table.getByRole('columnheader', { name: copy.results.genusHeader })
    ).toBeVisible()
    await expect(
      table.getByRole('columnheader', { name: copy.results.eppoHeader })
    ).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('adds fixture-derived species, survives reload and excludes the duplicate candidate', async ({
    page
  }) => {
    await addSpecies(page, 'Lens culinaris')

    await expect(addedTable(page)).toContainText('Lens culinaris')
    await expect(addedTable(page)).toContainText('LENCU')
    await expect(resultsTable(page)).not.toContainText('Lens culinaris')
    await page.reload()
    await expect(addedTable(page)).toContainText('Lens culinaris')
    await expect(resultsTable(page)).not.toContainText('Lens culinaris')
  })

  test('gives every repeated Remove control a distinct line-identifying accessible name', async ({
    page
  }) => {
    await addSpecies(page, 'Lens culinaris')
    await addSpecies(page, '+ Crataegomespilus dardarii')

    const removeButtons = addedTable(page).getByRole('button')
    await expect(removeButtons).toHaveCount(2)
    await expect(removeButtons.nth(0)).toHaveAccessibleName(
      `${copy.added.removeLabel} Lens culinaris ${copy.added.removeHidden} ${commodityCode}`
    )
    await expect(removeButtons.nth(1)).toHaveAccessibleName(
      `${copy.added.removeLabel} + Crataegomespilus dardarii ${copy.added.removeHidden} ${commodityCode}`
    )
    const names = await removeButtons.evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute('aria-label'))
    )
    expect(names).toEqual([
      `${copy.added.removeLabel} Lens culinaris ${copy.added.removeHidden} ${commodityCode}`,
      `${copy.added.removeLabel} + Crataegomespilus dardarii ${copy.added.removeHidden} ${commodityCode}`
    ])
    expect(new Set(names).size).toBe(names.length)
  })

  test('removes the last species and returns it to the candidate list', async ({
    page
  }) => {
    await addSpecies(page, 'Lens culinaris')
    await addedTable(page)
      .getByRole('button', {
        name: `${copy.added.removeLabel} Lens culinaris ${copy.added.removeHidden} ${commodityCode}`
      })
      .click()

    await expect(addedTable(page)).toHaveCount(0)
    await expect(resultsTable(page)).toContainText('Lens culinaris')
  })

  test('links and focuses the zero-species error while preserving the commodity line', async ({
    page
  }) => {
    await page.getByRole('button', { name: 'Save and continue' }).click()

    const alert = page.getByRole('alert')
    await expect(alert).toContainText('There is a problem')
    const summaryLink = alert.getByRole('link', {
      name: copy.errors.selectAtLeastOne
    })
    await expect(summaryLink).toHaveAttribute('href', '#species-0')
    await summaryLink.click()
    await expect(page.locator('#species-0')).toBeFocused()
    await expect(page.locator('#species-0-error')).toContainText(
      copy.errors.selectAtLeastOne
    )
    await expect(
      page.getByText(commodityCode, { exact: true }).first()
    ).toBeVisible()
  })

  test('continues to bulk details and leaves the incomplete commodity row in progress', async ({
    page
  }) => {
    await addSpecies(page, 'Lens culinaris')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+\/commodity-summary$/.test(
        url.pathname
      )
    )
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+\/commodity-bulk-details$/.test(
        url.pathname
      )
    )
    await page.getByRole('link', { name: 'Cancel and return to hub' }).click()
    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+$/.test(url.pathname)
    )
    const commodityRow = page.getByRole('listitem').filter({
      has: page.getByText('Commodity', { exact: true })
    })
    await expect(commodityRow).toContainText('In progress')
  })

  test('has no serious or critical axe violations before add, after add or on validation error', async ({
    page
  }) => {
    await expectNoSeriousOrCriticalViolations(page, 'before add')
    await addSpecies(page, 'Lens culinaris')
    await expectNoSeriousOrCriticalViolations(page, 'after add')
    await addedTable(page)
      .getByRole('button', {
        name: `${copy.added.removeLabel} Lens culinaris ${copy.added.removeHidden} ${commodityCode}`
      })
      .click()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expectNoSeriousOrCriticalViolations(page, 'with validation error')
  })
})

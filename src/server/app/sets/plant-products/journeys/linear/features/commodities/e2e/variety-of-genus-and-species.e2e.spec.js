import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { copy as featureCopy } from '../copy/copy.en.js'

const copy = featureCopy.varietyOfGenusAndSpecies
const searchCopy = featureCopy.commoditySearch
const basicCopy = featureCopy.basicDescription
const heading = 'CIDAC - Citrus australasica'
const context = `for commodity line 1, species 1: ${heading}`
const fields = {
  variety: `Variety ${context}`,
  other: `Other variety name ${context}`,
  class: `Class ${context}`
}
const addName = `Add another variety ${context}`
const hasPath = (pattern) => (url) => pattern.test(url.pathname)
const varietyUrl = hasPath(
  /^\/plant-products\/notifications\/[^/]+\/variety-of-genus-and-species$/
)
const hubUrl = hasPath(/^\/plant-products\/notifications\/[^/]+$/)

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

  const purposeRow = page.getByRole('listitem').filter({
    has: page.getByText('Purpose', { exact: true })
  })
  const commodityRow = page.getByRole('listitem').filter({
    has: page.getByText('Commodity', { exact: true })
  })
  const transportRow = page.getByRole('listitem').filter({
    has: page.getByText('Transport to the BCP', { exact: true })
  })
  await expect(purposeRow).toContainText('Not yet started')
  await expect(commodityRow).toContainText('Not yet started')
  await expect(transportRow).toContainText('Cannot start yet')

  await commodityRow.getByRole('link', { name: 'Commodity' }).click()
  await page.getByRole('radio', { name: 'Manual entry' }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
}

const startAtVarietyPage = async (page) => {
  await startAtCommoditySearch(page)
  await page.getByRole('tab', { name: searchCopy.tabs.speciesSearch }).click()
  await page.getByLabel(searchCopy.speciesSearch.label).fill('Citrus')
  await page
    .locator('#genus-and-species-search')
    .getByRole('button', { name: searchCopy.speciesSearch.button })
    .click()
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Citrus australasica — 08059000' })
    .getByRole('button', { name: searchCopy.speciesSearch.add })
    .click()
  await expect(page).toHaveURL((url) =>
    /^\/plant-products\/notifications\/[^/]+\/commodity-basic-description$/.test(
      url.pathname
    )
  )
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page).toHaveURL(varietyUrl)
}

const choosePair = async (
  page,
  { variety = 'NONE', other = '', varietyClass = 'CLASS_I' } = {}
) => {
  await page.getByLabel(fields.variety, { exact: true }).selectOption(variety)
  if (other) {
    await page.getByLabel(fields.other, { exact: true }).fill(other)
  }
  await page
    .getByLabel(fields.class, { exact: true })
    .selectOption(varietyClass)
}

const addPair = async (page, values) => {
  await choosePair(page, values)
  await page.getByRole('button', { name: addName, exact: true }).click()
}

const table = (page) =>
  page.getByRole('table', {
    name: `${copy.table.caption} ${context}`
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

test.describe('plant-products variety of genus and species', () => {
  test.beforeEach(async ({ page }) => {
    await startAtVarietyPage(page)
  })

  test('renders fixture options, real contextual labels and the add-species link', async ({
    page
  }) => {
    await expect(page.getByText(copy.caption, { exact: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: copy.heading })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 2, name: heading })
    ).toBeVisible()

    const variety = page.getByLabel(fields.variety, { exact: true })
    const other = page.getByLabel(fields.other, { exact: true })
    const varietyClass = page.getByLabel(fields.class, { exact: true })
    await expect(variety).toBeVisible()
    await expect(variety).toHaveAccessibleName(fields.variety)
    await expect(variety.locator('option')).toHaveText([
      copy.varietyPlaceholder,
      'None',
      copy.otherOption
    ])
    await expect(other).toBeVisible()
    await expect(other).toHaveAccessibleName(fields.other)
    await expect(other).toHaveAttribute(
      'aria-describedby',
      'otherVariety-0-0-hint'
    )
    await expect(page.locator('#otherVariety-0-0-hint')).toHaveText(
      copy.otherVarietyHint
    )
    await expect(varietyClass).toHaveAccessibleName(fields.class)
    await expect(varietyClass.locator('option')).toHaveText([
      copy.classPlaceholder,
      copy.classOptions.CLASS_I,
      copy.classOptions.CLASS_II,
      copy.classOptions.EXTRA_CLASS
    ])
    await expect(
      page.getByRole('button', { name: addName, exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: copy.addAnotherSpecies })
    ).toHaveAttribute(
      'href',
      /^\/plant-products\/notifications\/[^/]+\/commodity-basic-description$/
    )
  })

  test('adds a pair, reloads it and saves to the unchanged hub states', async ({
    page
  }) => {
    await addPair(page)
    const saved = table(page)
    await expect(saved).toContainText('None')
    await expect(saved).toContainText(copy.classOptions.CLASS_I)
    await page.reload()
    await expect(saved).toContainText('None')

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page).toHaveURL(hubUrl)
    const purposeRow = page.getByRole('listitem').filter({
      has: page.getByText('Purpose', { exact: true })
    })
    const commodityRow = page.getByRole('listitem').filter({
      has: page.getByText('Commodity', { exact: true })
    })
    const transportRow = page.getByRole('listitem').filter({
      has: page.getByText('Transport to the BCP', { exact: true })
    })
    await expect(purposeRow).toContainText('Not yet started')
    await expect(commodityRow).toContainText('In progress')
    await expect(transportRow).toContainText('Not yet started')
  })

  test('round-trips Other as its cleaned free text', async ({ page }) => {
    await addPair(page, {
      variety: '__OTHER__',
      other: 'Tahiti Lime',
      varietyClass: 'CLASS_II'
    })

    await expect(table(page)).toContainText('Tahiti Lime')
    await expect(table(page)).toContainText(copy.classOptions.CLASS_II)
    await page.reload()
    await expect(table(page)).toContainText('Tahiti Lime')
    await expect(page.getByText('__OTHER__')).toHaveCount(0)
  })

  test('pins every repeated Remove name and proves the set is distinct', async ({
    page
  }) => {
    await addPair(page)
    await addPair(page, {
      variety: '__OTHER__',
      other: 'Tahiti Lime',
      varietyClass: 'CLASS_II'
    })

    const buttons = table(page).getByRole('button')
    const expected = [
      `Remove None, Class I from commodity line 1, species 1: ${heading}`,
      `Remove Tahiti Lime, Class II from commodity line 1, species 1: ${heading}`
    ]
    await expect(buttons).toHaveCount(2)
    await expect(buttons.nth(0)).toHaveAccessibleName(expected[0])
    await expect(buttons.nth(1)).toHaveAccessibleName(expected[1])
    const names = await buttons.evaluateAll((controls) =>
      controls.map((control) =>
        (control.textContent ?? '').trim().replace(/\s+/g, ' ')
      )
    )
    expect(names).toEqual(expected)
    expect(new Set(names).size).toBe(names.length)
  })

  test('removes only the addressed pair', async ({ page }) => {
    await addPair(page)
    await addPair(page, {
      variety: '__OTHER__',
      other: 'Tahiti Lime',
      varietyClass: 'CLASS_II'
    })

    await table(page)
      .getByRole('button', {
        name: `Remove None, Class I from commodity line 1, species 1: ${heading}`
      })
      .click()
    await expect(table(page)).not.toContainText('None')
    await expect(table(page)).toContainText('Tahiti Lime')
    await expect(table(page)).toContainText(copy.classOptions.CLASS_II)
  })

  test('removing a species through basic description also removes its varieties', async ({
    page
  }) => {
    await addPair(page)
    await page.getByRole('link', { name: copy.addAnotherSpecies }).click()

    const addedSpecies = page.getByRole('table', {
      name: `${basicCopy.added.caption} 08059000`
    })
    await addedSpecies
      .getByRole('button', {
        name: `${basicCopy.added.removeLabel} Citrus australasica ${basicCopy.added.removeHidden} 08059000`
      })
      .click()
    await expect(addedSpecies).toHaveCount(0)

    const results = page.getByRole('table', {
      name: `${basicCopy.results.caption} 08059000`
    })
    await results
      .getByRole('button', {
        name: `${basicCopy.results.addLabel} Citrus australasica ${basicCopy.results.addHidden} 08059000`
      })
      .click()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page).toHaveURL(varietyUrl)
    await expect(table(page)).toHaveCount(0)
  })

  test('links and focuses the variety-required error while preserving class', async ({
    page
  }) => {
    await page.getByLabel(fields.class, { exact: true }).selectOption('CLASS_I')
    await page.getByRole('button', { name: addName, exact: true }).click()

    await expectLinkedError(
      page,
      'varietySelect-0-0',
      copy.errors.varietyRequired
    )
    await expect(page.getByLabel(fields.class, { exact: true })).toHaveValue(
      'CLASS_I'
    )
  })

  test('links and focuses the class-required error while preserving variety', async ({
    page
  }) => {
    await page.getByLabel(fields.variety, { exact: true }).selectOption('NONE')
    await page.getByRole('button', { name: addName, exact: true }).click()

    await expectLinkedError(page, 'varietyClass-0-0', copy.errors.classRequired)
    await expect(page.getByLabel(fields.variety, { exact: true })).toHaveValue(
      'NONE'
    )
  })

  test('links and focuses the at-least-one error', async ({ page }) => {
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expectLinkedError(
      page,
      'varietySelect-0-0',
      copy.errors.atLeastOneVariety
    )
  })

  test('links and focuses the duplicate-pair error', async ({ page }) => {
    await addPair(page)
    await choosePair(page)
    await page.getByRole('button', { name: addName, exact: true }).click()
    await expectLinkedError(
      page,
      'varietySelect-0-0',
      copy.errors.duplicatePair
    )
    await expect(table(page).getByRole('row')).toHaveCount(2)
  })

  test('links and focuses the Other-required error while preserving selections', async ({
    page
  }) => {
    await choosePair(page, {
      variety: '__OTHER__',
      varietyClass: 'CLASS_I'
    })
    await page.getByRole('button', { name: addName, exact: true }).click()

    await expectLinkedError(
      page,
      'otherVariety-0-0',
      copy.errors.otherVarietyRequired
    )
    await expect(page.getByLabel(fields.variety, { exact: true })).toHaveValue(
      '__OTHER__'
    )
    await expect(page.getByLabel(fields.class, { exact: true })).toHaveValue(
      'CLASS_I'
    )
  })

  test('links and focuses the Other-length error while preserving raw text', async ({
    page
  }) => {
    const raw = 'A'.repeat(33)
    await choosePair(page, {
      variety: '__OTHER__',
      other: raw,
      varietyClass: 'CLASS_I'
    })
    await page.getByRole('button', { name: addName, exact: true }).click()

    await expectLinkedError(
      page,
      'otherVariety-0-0',
      copy.errors.otherVarietyLength
    )
    await expect(page.getByLabel(fields.other, { exact: true })).toHaveValue(
      raw
    )
  })

  test('has no serious or critical axe violations on initial render', async ({
    page
  }) => {
    const { all, seriousOrCritical } = await seriousOrCriticalViolations(page)
    expect(
      seriousOrCritical,
      `Variety page has serious/critical accessibility violations.\n${JSON.stringify(all, null, 2)}`
    ).toEqual([])
  })

  test('has no serious or critical axe violations on the error state', async ({
    page
  }) => {
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    const { all, seriousOrCritical } = await seriousOrCriticalViolations(page)
    expect(
      seriousOrCritical,
      `Variety page error has serious/critical accessibility violations.\n${JSON.stringify(all, null, 2)}`
    ).toEqual([])
  })
})

test('skips the page when the selected species has no variety-and-class pair', async ({
  page
}) => {
  await startAtCommoditySearch(page)
  await page.getByLabel(searchCopy.codeSearch.label).fill('06042090')
  await page
    .locator('#commodity-code-search')
    .getByRole('button', { name: searchCopy.codeSearch.button })
    .click()
  const results = page.getByRole('table', {
    name: `${basicCopy.results.caption} 06042090`
  })
  await results
    .getByRole('button', {
      name: `${basicCopy.results.addLabel} Lens culinaris ${basicCopy.results.addHidden} 06042090`
    })
    .click()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page).toHaveURL(hubUrl)
  await expect(page.getByRole('heading', { name: copy.heading })).toHaveCount(0)
})

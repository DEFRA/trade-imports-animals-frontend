import { expect, test } from '@playwright/test'

import { axeViolations as seriousOrCriticalViolations } from '../../axe.e2e-helper.js'
import { copy as featureCopy } from '../copy/copy.en.js'

const copy = featureCopy.commoditySummary
const basicCopy = featureCopy.basicDescription
const searchCopy = featureCopy.commoditySearch
const commodityCode = '06042090'
const crataegomespilus = '+ Crataegomespilus dardarii'
const lens = 'Lens culinaris'
const appleVarietyId = '03107EFA-9BCD-1089-565E-B28F73994DEC'
const SAVE_AND_CONTINUE = 'Save and continue'
const NOT_YET_STARTED = 'Not yet started'
const MALUS_DOMESTICA = 'Malus domestica'
const summaryUrl = (url) =>
  /^\/plant-products\/notifications\/[^/]+\/commodity-summary$/.test(
    url.pathname
  )
const hubUrl = (url) =>
  /^\/plant-products\/notifications\/[^/]+$/.test(url.pathname)

const rowByTitle = (page, title) =>
  page.getByRole('listitem').filter({
    has: page.getByText(title, { exact: true })
  })

const startAtCommoditySearch = async (page) => {
  await page.goto('/plant-products')
  await page.getByRole('button', { name: 'Create a new notification' }).click()
  await page
    .getByRole('radio', { name: 'Plants, plant products and other objects' })
    .check()
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await page.getByLabel('Country of origin').selectOption('FR')
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await page.getByRole('link', { name: 'Back' }).click()

  await expect(rowByTitle(page, 'Purpose')).toContainText(NOT_YET_STARTED)
  await expect(rowByTitle(page, 'Commodity')).toContainText(NOT_YET_STARTED)
  await expect(rowByTitle(page, 'Transport to the BCP')).toContainText(
    'Cannot start yet'
  )

  await rowByTitle(page, 'Commodity')
    .getByRole('link', { name: 'Commodity' })
    .click()
  await page.getByRole('radio', { name: 'Manual entry' }).check()
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
}

const searchForCode = async (page, code) => {
  await page.getByLabel(searchCopy.codeSearch.label).fill(code)
  await page
    .locator('#commodity-code-search')
    .getByRole('button', { name: searchCopy.codeSearch.button })
    .click()
}

const speciesTable = (page, code, kind) =>
  page.getByRole('table', {
    name: `${basicCopy[kind].caption} ${code}`
  })

const addSpecies = async (page, code, genusAndSpecies) => {
  await speciesTable(page, code, 'results')
    .getByRole('button', {
      name: `${basicCopy.results.addLabel} ${genusAndSpecies} ${basicCopy.results.addHidden} ${code}`
    })
    .click()
}

const startAtSummary = async (page, species) => {
  await startAtCommoditySearch(page)
  await searchForCode(page, commodityCode)
  for (const genusAndSpecies of species) {
    await addSpecies(page, commodityCode, genusAndSpecies)
  }
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await expect(page).toHaveURL(summaryUrl)
}

const startAtAppleSummary = async (page) => {
  await startAtCommoditySearch(page)
  await page.getByRole('tab', { name: searchCopy.tabs.speciesSearch }).click()
  await page.getByLabel(searchCopy.speciesSearch.label).fill(MALUS_DOMESTICA)
  await page
    .locator('#genus-and-species-search')
    .getByRole('button', { name: searchCopy.speciesSearch.button })
    .click()
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Malus domestica — 0808108090' })
    .getByRole('button', { name: searchCopy.speciesSearch.add })
    .click()
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await page
    .getByLabel(
      'Variety for commodity line 1, species 1: MABSD - Malus domestica'
    )
    .selectOption(appleVarietyId)
  await page
    .getByLabel(
      'Class for commodity line 1, species 1: MABSD - Malus domestica'
    )
    .selectOption('CLASS_I')
  await page
    .getByRole('button', {
      name: 'Add another variety for commodity line 1, species 1: MABSD - Malus domestica'
    })
    .click()
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await expect(page).toHaveURL(summaryUrl)
}

const summaryTable = (page, index = 0) =>
  page.getByRole('table', { name: copy.tableCaption }).nth(index)

const normalisedCellText = async (row) =>
  (await row.getByRole('cell').allTextContents()).map((text) =>
    text.trim().replace(/\s+/g, ' ')
  )

const removeNames = async (table) =>
  table
    .getByRole('button')
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute('aria-label'))
    )

const expectNoSeriousOrCriticalViolations = async (page, state) => {
  const { all, seriousOrCritical } = await seriousOrCriticalViolations(page)
  expect(
    seriousOrCritical,
    `Commodity summary ${state} has serious/critical accessibility violations.\n${JSON.stringify(all, null, 2)}`
  ).toEqual([])
}

const renderingTests = () => {
  test('renders the exact toolbox table and blank variety and class cells', async ({
    page
  }) => {
    await startAtSummary(page, [crataegomespilus, lens])

    await expect(page.getByText(copy.caption, { exact: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: copy.heading })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 2, name: 'Other' })
    ).toBeVisible()
    const table = summaryTable(page)
    await expect(table.getByRole('columnheader')).toHaveText([
      copy.columns.commodityCode,
      copy.columns.genusAndSpecies,
      copy.columns.eppoCode,
      copy.columns.variety,
      copy.columns.class,
      copy.columns.actions
    ])
    const rows = table.locator('tbody tr')
    await expect(rows).toHaveCount(2)
    expect(await normalisedCellText(rows.nth(0))).toEqual([
      commodityCode,
      crataegomespilus,
      'CXQDA',
      '',
      '',
      copy.remove
    ])
    expect(await normalisedCellText(rows.nth(1))).toEqual([
      commodityCode,
      lens,
      'LENCU',
      '',
      '',
      copy.remove
    ])
  })

  test('resolves stored variety and class fixture ids to labels', async ({
    page
  }) => {
    await startAtAppleSummary(page)

    expect(
      await normalisedCellText(summaryTable(page).locator('tbody tr'))
    ).toEqual([
      '0808108090',
      MALUS_DOMESTICA,
      'MABSD',
      'McIntosh Red',
      'Class I',
      ''
    ])
  })
}

const removalTests = () => {
  test('pins distinct names, removes one species, persists it and exposes renumbered indices', async ({
    page
  }) => {
    await startAtSummary(page, [crataegomespilus, lens])
    const table = summaryTable(page)
    const expectedBefore = [
      `Remove ${crataegomespilus} from commodity line 1, species 1: ${commodityCode}`,
      `Remove ${lens} from commodity line 1, species 2: ${commodityCode}`
    ]
    const buttons = table.getByRole('button')
    await expect(buttons).toHaveCount(2)
    await expect(buttons.nth(0)).toHaveAccessibleName(expectedBefore[0])
    await expect(buttons.nth(1)).toHaveAccessibleName(expectedBefore[1])
    expect(await removeNames(table)).toEqual(expectedBefore)
    expect(new Set(await removeNames(table)).size).toBe(expectedBefore.length)

    await buttons.nth(0).click()
    await expect(table.locator('tbody tr')).toHaveCount(1)
    await expect(table).toContainText(lens)
    await expect(table).not.toContainText(crataegomespilus)
    await expect(table.getByRole('button')).toHaveCount(0)
    await page.reload()
    await expect(table.locator('tbody tr')).toHaveCount(1)
    await expect(table).toContainText(lens)

    await page
      .getByRole('link', { name: copy.addAnotherSpecies, exact: true })
      .click()
    await addSpecies(page, commodityCode, crataegomespilus)
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await expect(page).toHaveURL(summaryUrl)

    const expectedAfter = [
      `Remove ${lens} from commodity line 1, species 1: ${commodityCode}`,
      `Remove ${crataegomespilus} from commodity line 1, species 2: ${commodityCode}`
    ]
    const renumberedButtons = summaryTable(page).getByRole('button')
    await expect(renumberedButtons.nth(0)).toHaveAccessibleName(
      expectedAfter[0]
    )
    await expect(renumberedButtons.nth(1)).toHaveAccessibleName(
      expectedAfter[1]
    )
    const names = await removeNames(summaryTable(page))
    expect(names).toEqual(expectedAfter)
    expect(new Set(names).size).toBe(names.length)
  })

  test('removes the non-zero species target and persists the correct survivor', async ({
    page
  }) => {
    await startAtSummary(page, [crataegomespilus, lens])
    const table = summaryTable(page)
    const rows = table.locator('tbody tr')
    await expect(rows).toHaveCount(2)
    expect(await normalisedCellText(rows.nth(0))).toEqual([
      commodityCode,
      crataegomespilus,
      'CXQDA',
      '',
      '',
      copy.remove
    ])
    expect(await normalisedCellText(rows.nth(1))).toEqual([
      commodityCode,
      lens,
      'LENCU',
      '',
      '',
      copy.remove
    ])

    const removeSecondSpecies = table.getByRole('button', {
      name: `Remove ${lens} from commodity line 1, species 2: ${commodityCode}`
    })
    await expect(removeSecondSpecies).toHaveAccessibleName(
      `Remove ${lens} from commodity line 1, species 2: ${commodityCode}`
    )
    await removeSecondSpecies.click()

    await expect(rows).toHaveCount(1)
    expect(await normalisedCellText(rows)).toEqual([
      commodityCode,
      crataegomespilus,
      'CXQDA',
      '',
      '',
      ''
    ])
    await expect(table).not.toContainText(lens)
    await expect(table.getByRole('button')).toHaveCount(0)

    await page.reload()
    await expect(rows).toHaveCount(1)
    expect(await normalisedCellText(rows)).toEqual([
      commodityCode,
      crataegomespilus,
      'CXQDA',
      '',
      '',
      ''
    ])
    await expect(table).not.toContainText(lens)
    await expect(table.getByRole('button')).toHaveCount(0)
  })

  test('suppresses Remove when the commodity line has one species', async ({
    page
  }) => {
    await startAtSummary(page, [lens])

    await expect(summaryTable(page).locator('tbody tr')).toHaveCount(1)
    await expect(summaryTable(page).getByRole('button')).toHaveCount(0)
  })
}

const navigationTests = () => {
  test('routes both add-another controls to real pages and preserves entered lines', async ({
    page
  }) => {
    await startAtSummary(page, [lens])

    await page
      .getByRole('link', { name: copy.addAnotherSpecies, exact: true })
      .click()
    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+\/commodity-basic-description\?line=0$/.test(
        `${url.pathname}${url.search}`
      )
    )
    await expect(speciesTable(page, commodityCode, 'added')).toContainText(lens)
    await page.goBack()
    await expect(page).toHaveURL(summaryUrl)

    await page.getByRole('button', { name: copy.addAnotherCommodity }).click()
    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+\/commodity-search$/.test(
        url.pathname
      )
    )
    await searchForCode(page, '0808108090')
    await addSpecies(page, '0808108090', MALUS_DOMESTICA)
    await expect(speciesTable(page, commodityCode, 'added')).toContainText(lens)
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await page
      .getByLabel(
        'Variety for commodity line 2, species 1: MABSD - Malus domestica'
      )
      .selectOption(appleVarietyId)
    await page
      .getByLabel(
        'Class for commodity line 2, species 1: MABSD - Malus domestica'
      )
      .selectOption('CLASS_I')
    await page
      .getByRole('button', {
        name: 'Add another variety for commodity line 2, species 1: MABSD - Malus domestica'
      })
      .click()
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await expect(page).toHaveURL(summaryUrl)
    await expect(
      page.getByRole('table', { name: copy.tableCaption })
    ).toHaveCount(2)
    await expect(summaryTable(page, 0)).toContainText(lens)
    await expect(summaryTable(page, 1)).toContainText(MALUS_DOMESTICA)
  })

  test('save and continue advances to bulk details and preserves the hub row states', async ({
    page
  }) => {
    await startAtSummary(page, [lens])
    await page.getByRole('button', { name: copy.continue }).click()

    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+\/commodity-bulk-details$/.test(
        url.pathname
      )
    )
    await page.getByRole('link', { name: 'Cancel and return to hub' }).click()
    await expect(page).toHaveURL(hubUrl)
    await expect(rowByTitle(page, 'Purpose')).toContainText(NOT_YET_STARTED)
    await expect(rowByTitle(page, 'Commodity')).toContainText('In progress')
    await expect(rowByTitle(page, 'Transport to the BCP')).toContainText(
      NOT_YET_STARTED
    )
    await rowByTitle(page, 'Commodity')
      .getByRole('link', { name: 'Commodity' })
      .click()
    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+\/commodity-input-method$/.test(
        url.pathname
      )
    )
    await page.goBack()
    await expect(rowByTitle(page, 'Commodity')).toContainText('In progress')
  })
}

const accessibilityTests = () => {
  test('has no serious or critical axe violations in multi-row and single-row states', async ({
    page
  }) => {
    await startAtSummary(page, [crataegomespilus, lens])
    await expectNoSeriousOrCriticalViolations(page, 'multi-row state')

    await summaryTable(page)
      .getByRole('button', {
        name: `Remove ${crataegomespilus} from commodity line 1, species 1: ${commodityCode}`
      })
      .click()
    await expect(summaryTable(page).getByRole('button')).toHaveCount(0)
    await expectNoSeriousOrCriticalViolations(page, 'single-row state')
  })
}

test.describe('plant-products commodity summary', () => {
  renderingTests()
  removalTests()
  navigationTests()
  accessibilityTests()
})

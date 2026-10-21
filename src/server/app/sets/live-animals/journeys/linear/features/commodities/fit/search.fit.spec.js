import { expect, test } from '@playwright/test'
import {
  answerCountryOfOrigin,
  expectNoSeriousOrCriticalViolations,
  searchCommodities,
  selectSpecies,
  signIn,
  startNotification
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'

const BISON_BISON = 'Bison bison'
const BOS_TAURUS = 'Bos taurus'
const FELIS_CATUS = 'Felis catus'
const BISON_BISON_LABEL = 'American bison (Bison bison)'
const BOS_SPP_LABEL = 'Cattle (Bos spp.)'
const BOS_TAURUS_LABEL = 'Domestic cattle (Bos taurus)'
const FELIS_CATUS_LABEL = 'Cat (Felis catus)'
const CANIS_LUPUS_LABEL = 'Dog (Canis lupus familiaris)'
const COW_LEGEND = 'Cow (0102)'
const SAVE_AND_CONTINUE = 'Save and continue'
const BACK_LINK = '.govuk-back-link'
const SEARCH_BOX_DESCRIPTION_WITH_ERROR = `${copy.search.searchHint} Error: ${copy.search.errors.selectCommodity}`

const canonicalSelectionOrder = [BISON_BISON, BOS_TAURUS, FELIS_CATUS]
const canonicalSelectionLabels = [
  BISON_BISON_LABEL,
  BOS_TAURUS_LABEL,
  FELIS_CATUS_LABEL
]

const openSelection = async (page) => {
  await startNotification(page)
  await answerCountryOfOrigin(page)
  await page.getByRole('link', { name: 'What are you importing?' }).click()
  await expect(
    page.getByRole('heading', { name: copy.search.title })
  ).toBeVisible()
}

const errorLink = (page, message) =>
  page.locator('.govuk-error-summary').getByRole('link', { name: message })

const searchBox = (page) => page.getByLabel(copy.search.searchLabel)

const selectedSummary = (page) => page.locator('#commodity-selection')

const expectSelectedHeading = (page, count) =>
  expect(selectedSummary(page)).toContainText(
    copy.search.selected.heading(count)
  )

const reopenSelection = async (page) => {
  await page.getByRole('link', { name: 'What are you importing?' }).click()
  await expect(
    page.getByRole('heading', { name: copy.search.title })
  ).toBeVisible()
}

test.describe('commodity search', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openSelection(page)
  })

  test('offers a search box and lists nothing until it is used', async ({
    page
  }) => {
    await expect(page.getByText(copy.search.inset)).toBeVisible()
    await expect(page.getByLabel(copy.search.searchLabel)).toBeVisible()
    await expect(page.getByText(copy.search.searchHint)).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(0)
    await expect(selectedSummary(page)).toHaveCount(0)
    await expect(
      page.getByText(copy.search.help.summary, { exact: true })
    ).toBeVisible()
  })

  test('explains commodity codes and links out to the Trade Tariff tool', async ({
    page
  }) => {
    await page.getByText(copy.search.help.summary, { exact: true }).click()
    await expect(page.getByText(copy.search.help.reference)).toBeVisible()
    await expect(page.getByText(copy.search.help.describes)).toBeVisible()
    await expect(page.getByText(copy.search.help.lookupPrefix)).toBeVisible()
    const tradeTariff = page.getByRole('link', {
      name: `${copy.search.help.lookupLink} ${copy.search.help.lookupNewTab}`,
      exact: true
    })
    await expect(tradeTariff).toBeVisible()
    await expect(page.getByText(copy.search.help.lookupNewTab)).toBeVisible()
    await expect(tradeTariff).toHaveAttribute(
      'href',
      copy.search.help.lookupHref
    )
    await expect(tradeTariff).toHaveAttribute('target', '_blank')
    await expect(tradeTariff).toHaveAttribute('rel', 'noreferrer noopener')
  })

  test('lists nothing for a query shorter than three characters', async ({
    page
  }) => {
    await searchCommodities(page, 'Bo')
    await expect(page.getByRole('checkbox')).toHaveCount(0)
    await expect(page.getByText(copy.search.noResults)).toHaveCount(0)
  })

  test('groups the matching species under their commodity heading', async ({
    page
  }) => {
    await searchCommodities(page, 'Bos')
    const group = page.getByRole('group', { name: COW_LEGEND })
    await expect(group).toBeVisible()
    await expect(group.getByRole('checkbox')).toHaveCount(2)
    await expect(
      group.getByRole('checkbox', { name: BOS_TAURUS_LABEL, exact: true })
    ).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(2)
  })

  test('offers each species as its common name with the scientific name after it', async ({
    page
  }) => {
    await searchCommodities(page, 'Bos')
    await expect(page.locator('.govuk-checkboxes__label')).toHaveText([
      BOS_SPP_LABEL,
      BOS_TAURUS_LABEL
    ])
  })

  test('finds a species by its common name', async ({ page }) => {
    await searchCommodities(page, 'cattle')
    const group = page.getByRole('group', { name: COW_LEGEND })
    await expect(
      group.getByRole('checkbox', { name: BOS_SPP_LABEL, exact: true })
    ).toBeVisible()
    await expect(
      group.getByRole('checkbox', { name: BOS_TAURUS_LABEL, exact: true })
    ).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(2)
  })

  test('renders a separate group per matching commodity', async ({ page }) => {
    await searchCommodities(page, '0106')
    const cats = page.getByRole('group', { name: 'Cat (01061900)' })
    const dogs = page.getByRole('group', { name: 'Dog (01061900)' })
    await expect(cats).toBeVisible()
    await expect(dogs).toBeVisible()
    await expect(
      cats.getByRole('checkbox', { name: FELIS_CATUS_LABEL, exact: true })
    ).toBeVisible()
    await expect(
      dogs.getByRole('checkbox', { name: CANIS_LUPUS_LABEL, exact: true })
    ).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(2)
  })

  test('says so when nothing matches', async ({ page }) => {
    await searchCommodities(page, 'zzz')
    await expect(page.getByText(copy.search.noResults)).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(0)
  })

  test('counts and lists what has been chosen, and clears it on request', async ({
    page
  }) => {
    await selectSpecies(page, [BOS_TAURUS, FELIS_CATUS])
    await searchCommodities(page, 'Salmo')

    await expectSelectedHeading(page, 2)
    await expect(selectedSummary(page)).toContainText(BOS_TAURUS_LABEL)
    await expect(selectedSummary(page)).toContainText(FELIS_CATUS_LABEL)

    await page
      .getByRole('button', { name: copy.search.selected.clearAll })
      .click()
    await expect(selectedSummary(page)).toHaveCount(0)
  })

  test('back link returns to the overview', async ({ page }) => {
    await page.locator(BACK_LINK).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  test('validation: no commodity links to and focuses the search box', async ({
    page
  }) => {
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    const link = errorLink(page, copy.search.errors.selectCommodity)
    await expect(link).toBeVisible()
    await expect(searchBox(page)).toHaveAccessibleDescription(
      SEARCH_BOX_DESCRIPTION_WITH_ERROR
    )
    await link.click()
    await expect(searchBox(page)).toBeFocused()
    await expect(selectedSummary(page)).toHaveCount(0)
  })

  test('validation: with results listed, the error stays on the search box', async ({
    page
  }) => {
    await searchCommodities(page, 'Bos')
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await expect(
      page.locator('.govuk-error-summary').getByRole('link')
    ).toHaveText([copy.search.errors.selectCommodity])
    await expect(searchBox(page)).toHaveAccessibleDescription(
      SEARCH_BOX_DESCRIPTION_WITH_ERROR
    )
    await errorLink(page, copy.search.errors.selectCommodity).click()
    await expect(searchBox(page)).toBeFocused()
  })

  test('saves pairs found under different queries, in canonical order', async ({
    page
  }) => {
    await selectSpecies(page, [FELIS_CATUS, BOS_TAURUS, BISON_BISON])
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await page
      .getByRole('link', { name: copy.consignmentDetails.title, exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: copy.consignmentDetails.title })
    ).toBeVisible()
    const speciesHeadings = await page
      .getByRole('heading', { level: 3 })
      .allTextContents()
    expect(speciesHeadings).toEqual(canonicalSelectionOrder)

    await page.locator(BACK_LINK).click()
    await reopenSelection(page)
    await expectSelectedHeading(page, 3)
    for (const label of canonicalSelectionLabels) {
      await expect(selectedSummary(page)).toContainText(label)
    }
    await expect(selectedSummary(page)).not.toContainText(
      'Canis lupus familiaris'
    )
  })

  test('ticks a result that is already on the notification', async ({
    page
  }) => {
    await selectSpecies(page, [BOS_TAURUS])
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await reopenSelection(page)
    await searchCommodities(page, 'Bos')
    await expect(
      page.getByRole('checkbox', { name: BOS_TAURUS_LABEL, exact: true })
    ).toBeChecked()
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await expectNoSeriousOrCriticalViolations(page, 'Commodity search')

    await selectSpecies(page, [BOS_TAURUS])
    await searchCommodities(page, '0106')
    await page.getByText(copy.search.help.summary, { exact: true }).click()
    await expectNoSeriousOrCriticalViolations(
      page,
      'Commodity search with results'
    )

    await page
      .getByRole('button', { name: copy.search.selected.clearAll })
      .click()
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await expect(
      errorLink(page, copy.search.errors.selectCommodity)
    ).toBeVisible()
    await expectNoSeriousOrCriticalViolations(
      page,
      'Commodity search with error'
    )
  })
})

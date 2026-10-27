import { expect, test } from '@playwright/test'
import {
  BISON_BISON,
  BOS_TAURUS,
  FELIS_CATUS,
  answerOriginEntry,
  saveAndContinue,
  expectNoSeriousOrCriticalViolations,
  expectThreeSaveControls,
  openCommoditySearch,
  searchCommodities,
  selectSpecies,
  signIn,
  startNotificationAtOrigin
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'
import {
  CATTLE_CODE,
  OTHER_LIVE_MAMMALS_CODE
} from '../../../../../services/commodities/rules.js'

const SEARCH_BOX_DESCRIPTION_WITH_ERROR = `${copy.search.searchHint} Error: ${copy.search.errors.selectCommodity}`

const canonicalSelectionOrder = [
  BISON_BISON.speciesLatinName,
  BOS_TAURUS.speciesLatinName,
  FELIS_CATUS.speciesLatinName
]

const backLink = (page) => page.getByRole('link', { name: 'Back', exact: true })

const errorLink = (page, message) =>
  page.getByRole('alert').getByRole('link', { name: message })

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

const signInAndOpenSelection = async ({ page }) => {
  await signIn(page)
  await openCommoditySearch(page)
}

test.describe('commodity search', () => {
  test.beforeEach(signInAndOpenSelection)

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

  test('groups the matching species under their commodity code', async ({
    page
  }) => {
    await searchCommodities(page, 'buffalo')
    const group = page.getByRole('group', { name: CATTLE_CODE })
    await expect(group).toBeVisible()
    await expect(group.getByRole('checkbox')).toHaveCount(3)
    await expect(
      group.getByRole('checkbox', { name: 'Bubalus bubalis', exact: true })
    ).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(3)
  })

  test('offers each species by its scientific name', async ({ page }) => {
    await searchCommodities(page, 'buffalo')
    const scientificNames = ['Bubalus', 'Bubalus bubalis', 'Syncerus']
    const checkboxes = page.getByRole('checkbox')
    await expect(checkboxes).toHaveCount(scientificNames.length)
    for (const [index, name] of scientificNames.entries()) {
      await expect(checkboxes.nth(index)).toHaveAccessibleName(name)
    }
  })

  test('finds a species by its common name', async ({ page }) => {
    await searchCommodities(page, 'ferret')
    const group = page.getByRole('group', { name: OTHER_LIVE_MAMMALS_CODE })
    await expect(
      group.getByRole('checkbox', {
        name: 'Mustela putorius furo',
        exact: true
      })
    ).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(1)
  })

  test('finds cattle by their common name', async ({ page }) => {
    await searchCommodities(page, 'cattle')
    const cattle = page.getByRole('group', { name: CATTLE_CODE })
    for (const name of [
      'Bos',
      BOS_TAURUS.speciesLatinName,
      'Bibos spp.',
      'Novibos spp.'
    ]) {
      await expect(
        cattle.getByRole('checkbox', { name, exact: true })
      ).toBeVisible()
    }
    await expect(cattle.getByRole('checkbox')).toHaveCount(5)
  })

  test('renders a separate group per matching commodity code', async ({
    page
  }) => {
    await searchCommodities(page, 'taurus')
    const cattle = page.getByRole('group', { name: CATTLE_CODE })
    const otherMammals = page.getByRole('group', {
      name: OTHER_LIVE_MAMMALS_CODE
    })
    await expect(
      cattle.getByRole('checkbox', {
        name: BOS_TAURUS.speciesLatinName,
        exact: true
      })
    ).toBeVisible()
    await expect(
      otherMammals.getByRole('checkbox', {
        name: BOS_TAURUS.speciesLatinName,
        exact: true
      })
    ).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(2)
  })

  test('says so when nothing matches', async ({ page }) => {
    await searchCommodities(page, 'zzz')
    await expect(page.getByText(copy.search.noResults)).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(0)
  })
})

test.describe('commodity search — choosing and saving species', () => {
  test.beforeEach(signInAndOpenSelection)

  test('counts and lists what has been chosen, and clears it on request', async ({
    page
  }) => {
    await selectSpecies(page, [BOS_TAURUS, FELIS_CATUS])
    await searchCommodities(page, 'Struthio')

    await expectSelectedHeading(page, 2)
    await expect(selectedSummary(page)).toContainText(
      `${CATTLE_CODE}: ${BOS_TAURUS.speciesLatinName}`
    )
    await expect(selectedSummary(page)).toContainText(
      `${OTHER_LIVE_MAMMALS_CODE}: ${FELIS_CATUS.speciesLatinName}`
    )

    await page
      .getByRole('button', { name: copy.search.selected.clearAll })
      .click()
    await expect(selectedSummary(page)).toHaveCount(0)
  })

  test('back link returns to the overview', async ({ page }) => {
    await backLink(page).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  test('validation: no commodity links to and focuses the search box', async ({
    page
  }) => {
    await saveAndContinue(page).click()

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
    await saveAndContinue(page).click()

    await expect(page.getByRole('alert').getByRole('link')).toHaveText([
      copy.search.errors.selectCommodity
    ])
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
    await saveAndContinue(page).click()

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

    await backLink(page).click()
    await reopenSelection(page)
    await expectSelectedHeading(page, 3)
    await expect(selectedSummary(page).getByRole('listitem')).toHaveText([
      `${CATTLE_CODE}: ${BISON_BISON.speciesLatinName}, ${BOS_TAURUS.speciesLatinName}`,
      `${OTHER_LIVE_MAMMALS_CODE}: ${FELIS_CATUS.speciesLatinName}`
    ])
  })

  test('ticks a result that is already on the notification', async ({
    page
  }) => {
    await selectSpecies(page, [BOS_TAURUS])
    await saveAndContinue(page).click()
    await reopenSelection(page)
    await searchCommodities(page, 'taurus')
    await expect(
      page.getByRole('group', { name: CATTLE_CODE }).getByRole('checkbox', {
        name: BOS_TAURUS.speciesLatinName,
        exact: true
      })
    ).toBeChecked()
  })

  test('leaves the same species under another code unticked', async ({
    page
  }) => {
    await selectSpecies(page, [BOS_TAURUS])
    await saveAndContinue(page).click()
    await reopenSelection(page)
    await searchCommodities(page, 'taurus')
    await expect(
      page
        .getByRole('group', { name: OTHER_LIVE_MAMMALS_CODE })
        .getByRole('checkbox', {
          name: BOS_TAURUS.speciesLatinName,
          exact: true
        })
    ).not.toBeChecked()
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
    await saveAndContinue(page).click()
    await expect(
      errorLink(page, copy.search.errors.selectCommodity)
    ).toBeVisible()
    await expectNoSeriousOrCriticalViolations(
      page,
      'Commodity search with error'
    )
  })
})

test.describe('commodity search by code', () => {
  test.beforeEach(signInAndOpenSelection)

  test('shows Bison bison among 15 species under a searched 0102 code', async ({
    page
  }) => {
    await searchCommodities(page, CATTLE_CODE)
    const cattle = page.getByRole('group', { name: CATTLE_CODE })
    await expect(
      cattle.getByRole('checkbox', {
        name: BISON_BISON.speciesLatinName,
        exact: true
      })
    ).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(15)
  })

  test('lists no more than a hundred species for one search', async ({
    page
  }) => {
    await searchCommodities(page, OTHER_LIVE_MAMMALS_CODE)
    await expect(page.getByRole('checkbox')).toHaveCount(100)
  })
})

test.describe('commodity search reached through the opening sequence', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotificationAtOrigin(page)
    await answerOriginEntry(page)
    await expect(
      page.getByRole('heading', { name: copy.search.title })
    ).toBeVisible()
  })

  test('offers Save and continue, then Save and return to overview, then Cancel and return to overview', async ({
    page
  }) => {
    await expectThreeSaveControls(page)
  })
})

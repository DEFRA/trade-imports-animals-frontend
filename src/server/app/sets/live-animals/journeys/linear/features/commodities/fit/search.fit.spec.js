import { expect, test } from '@playwright/test'
import {
  BISON_BISON_ROW,
  BOS_TAURUS_ROW,
  BUBALUS_BUBALIS_ROW,
  FELIS_CATUS_ROW,
  GALLUS_GALLUS_ROW,
  answerOriginEntry,
  saveAndContinue,
  saveAndReturnToHub,
  errorSummaryLinks,
  expectNoSeriousOrCriticalViolations,
  expectSpeciesSelected,
  expectThreeSaveControls,
  openCommoditySearch,
  openOverview,
  pressSpeciesRemove,
  searchCommodities,
  selectSpecies,
  selectedSummary,
  signIn,
  startNotificationAtOrigin,
  backLink
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'
import { labelFor } from '../search/test-support.js'
import {
  CATTLE_CODE,
  OTHER_LIVE_MAMMALS_CODE
} from '../../../../../services/commodities/rules.js'

const SEARCH_BOX_DESCRIPTION_WITH_ERROR = `${copy.search.searchHint} Error: ${copy.search.errors.selectCommodity}`

const canonicalSelectionOrder = [
  labelFor(BISON_BISON_ROW.speciesLatinName),
  labelFor(BOS_TAURUS_ROW.speciesLatinName),
  labelFor(FELIS_CATUS_ROW.speciesLatinName)
]

const searchBox = (page) => page.getByLabel(copy.search.searchLabel)

const expectSelectedHeading = (page, count) =>
  expect(selectedSummary(page)).toContainText(
    copy.search.selected.heading(count)
  )

const reopenSelection = async (page) => {
  await openOverview(page)
  await page.getByRole('link', { name: 'What are you importing?' }).click()
  await expect(
    page.getByRole('heading', { name: copy.search.title })
  ).toBeVisible()
}

const signInAndOpenSelection = async ({ page }) => {
  await signIn(page)
  await openCommoditySearch(page)
}

const saveGallusGallusUnderItsFirstCodeThenSearchGallus = async (page) => {
  await selectSpecies(page, [GALLUS_GALLUS_ROW])
  await saveAndContinue(page).click()
  await reopenSelection(page)
  await searchCommodities(page, 'gallus')
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
      group.getByRole('checkbox', {
        name: labelFor(BUBALUS_BUBALIS_ROW.speciesLatinName),
        exact: true
      })
    ).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(3)
  })

  test('offers each species by its label', async ({ page }) => {
    await searchCommodities(page, 'buffalo')
    const labels = [
      'Bubalus (Water Buffaloes)',
      labelFor(BUBALUS_BUBALIS_ROW.speciesLatinName),
      'Syncerus (African Buffaloes)'
    ]
    const checkboxes = page.getByRole('checkbox')
    await expect(checkboxes).toHaveCount(labels.length)
    for (const [index, name] of labels.entries()) {
      await expect(checkboxes.nth(index)).toHaveAccessibleName(name)
    }
  })

  test('finds a species by its common name', async ({ page }) => {
    await searchCommodities(page, 'ferret')
    const group = page.getByRole('group', { name: OTHER_LIVE_MAMMALS_CODE })
    await expect(
      group.getByRole('checkbox', {
        name: 'Mustela putorius furo (Ferret)',
        exact: true
      })
    ).toBeVisible()
    await expect(
      group.getByRole('checkbox', {
        name: 'Mustela spp. (Weasels (including ermines, polecats, ferrets, and related species))',
        exact: true
      })
    ).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(2)
  })

  test('finds cattle by their common name', async ({ page }) => {
    await searchCommodities(page, 'cattle')
    const cattle = page.getByRole('group', { name: CATTLE_CODE })
    for (const name of [
      'Bos sp. (Cattle)',
      labelFor(BOS_TAURUS_ROW.speciesLatinName)
    ]) {
      await expect(
        cattle.getByRole('checkbox', { name, exact: true })
      ).toBeVisible()
    }
    await expect(cattle.getByRole('checkbox')).toHaveCount(2)
  })

  test('renders a separate group per matching commodity code', async ({
    page
  }) => {
    await searchCommodities(page, 'gallus')
    const firstCode = page.getByRole('group', { name: '01051111' })
    const secondCode = page.getByRole('group', { name: '01059400' })
    await expect(
      firstCode.getByRole('checkbox', {
        name: labelFor(GALLUS_GALLUS_ROW.speciesLatinName),
        exact: true
      })
    ).toBeVisible()
    await expect(
      secondCode.getByRole('checkbox', {
        name: labelFor(GALLUS_GALLUS_ROW.speciesLatinName),
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
    await selectSpecies(page, [BOS_TAURUS_ROW, FELIS_CATUS_ROW])
    await searchCommodities(page, 'Struthio')

    await expectSelectedHeading(page, 2)
    await expectSpeciesSelected(page, BOS_TAURUS_ROW)
    await expectSpeciesSelected(page, FELIS_CATUS_ROW)

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

    const link = errorSummaryLinks(page, copy.search.errors.selectCommodity)
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

    await expect(errorSummaryLinks(page)).toHaveText([
      copy.search.errors.selectCommodity
    ])
    await expect(searchBox(page)).toHaveAccessibleDescription(
      SEARCH_BOX_DESCRIPTION_WITH_ERROR
    )
    await errorSummaryLinks(page, copy.search.errors.selectCommodity).click()
    await expect(searchBox(page)).toBeFocused()
  })

  test('saves pairs found under different queries, in canonical order', async ({
    page
  }) => {
    await selectSpecies(page, [
      FELIS_CATUS_ROW,
      BOS_TAURUS_ROW,
      BISON_BISON_ROW
    ])
    await saveAndReturnToHub(page).click()

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
    await expectSpeciesSelected(page, BISON_BISON_ROW)
    await expectSpeciesSelected(page, BOS_TAURUS_ROW)
    await expectSpeciesSelected(page, FELIS_CATUS_ROW)
  })

  test('ticks a result that is already on the notification', async ({
    page
  }) => {
    await saveGallusGallusUnderItsFirstCodeThenSearchGallus(page)
    await expect(
      page
        .getByRole('group', { name: GALLUS_GALLUS_ROW.commodityCode })
        .getByRole('checkbox', {
          name: labelFor(GALLUS_GALLUS_ROW.speciesLatinName),
          exact: true
        })
    ).toBeChecked()
  })

  test('leaves the same species under another code unticked', async ({
    page
  }) => {
    await saveGallusGallusUnderItsFirstCodeThenSearchGallus(page)
    await expect(
      page.getByRole('group', { name: '01059400' }).getByRole('checkbox', {
        name: labelFor(GALLUS_GALLUS_ROW.speciesLatinName),
        exact: true
      })
    ).not.toBeChecked()
  })

  test('shows a Remove control named for each chosen species', async ({
    page
  }) => {
    await selectSpecies(page, [BOS_TAURUS_ROW, FELIS_CATUS_ROW])
    await searchCommodities(page, 'Struthio')
    await expectSpeciesSelected(page, BOS_TAURUS_ROW)
    await expectSpeciesSelected(page, FELIS_CATUS_ROW)
    await expect(
      selectedSummary(page).getByRole('button', {
        name: `Remove ${labelFor(BOS_TAURUS_ROW.speciesLatinName)}`,
        exact: true
      })
    ).toBeVisible()
    await expect(
      selectedSummary(page).getByRole('button', {
        name: `Remove ${labelFor(FELIS_CATUS_ROW.speciesLatinName)}`,
        exact: true
      })
    ).toBeVisible()
  })

  test('removes one chosen species and leaves the other chosen and ticked on screen', async ({
    page
  }) => {
    await selectSpecies(page, [BOS_TAURUS_ROW, FELIS_CATUS_ROW])
    await searchCommodities(page, 'felis')
    await pressSpeciesRemove(page, BOS_TAURUS_ROW)

    await expectSelectedHeading(page, 1)
    await expectSpeciesSelected(page, FELIS_CATUS_ROW)
    await expect(
      page.getByRole('checkbox', {
        name: labelFor(FELIS_CATUS_ROW.speciesLatinName),
        exact: true
      })
    ).toBeChecked()
  })

  test('unticking a shown species then pressing its Remove leaves it unchosen and the other chosen', async ({
    page
  }) => {
    await selectSpecies(page, [BOS_TAURUS_ROW, FELIS_CATUS_ROW])
    await searchCommodities(page, BOS_TAURUS_ROW.speciesLatinName)
    await page
      .getByRole('group', { name: CATTLE_CODE })
      .getByRole('checkbox', {
        name: labelFor(BOS_TAURUS_ROW.speciesLatinName),
        exact: true
      })
      .uncheck()
    await pressSpeciesRemove(page, BOS_TAURUS_ROW)

    await expect(
      page.getByRole('heading', { name: copy.search.title })
    ).toBeVisible()
    await expect(page.getByRole('group', { name: CATTLE_CODE })).toBeVisible()
    await expectSelectedHeading(page, 1)
    await expectSpeciesSelected(page, FELIS_CATUS_ROW)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await expectNoSeriousOrCriticalViolations(page, 'Commodity search')

    await selectSpecies(page, [BOS_TAURUS_ROW, FELIS_CATUS_ROW])
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
      errorSummaryLinks(page, copy.search.errors.selectCommodity)
    ).toBeVisible()
    await expectNoSeriousOrCriticalViolations(
      page,
      'Commodity search with error'
    )
  })
})

test.describe('commodity search by code', () => {
  test.beforeEach(signInAndOpenSelection)

  test('shows Bison bison among 7 species under a searched 0102 code', async ({
    page
  }) => {
    await searchCommodities(page, CATTLE_CODE)
    const cattle = page.getByRole('group', { name: CATTLE_CODE })
    await expect(
      cattle.getByRole('checkbox', {
        name: labelFor(BISON_BISON_ROW.speciesLatinName),
        exact: true
      })
    ).toBeVisible()
    await expect(cattle.getByRole('checkbox')).toHaveCount(7)
  })

  test('lists no more than a hundred species for one search', async ({
    page
  }) => {
    await searchCommodities(page, '0106')
    await expect(page.getByRole('checkbox')).toHaveCount(100)
  })

  test('lists 0102 species in species-label order', async ({ page }) => {
    await searchCommodities(page, CATTLE_CODE)
    const expectedOrder = [
      'Bison (Bison)',
      labelFor(BISON_BISON_ROW.speciesLatinName),
      'Bos sp. (Cattle)',
      labelFor(BOS_TAURUS_ROW.speciesLatinName),
      'Bubalus (Water Buffaloes)',
      labelFor(BUBALUS_BUBALIS_ROW.speciesLatinName),
      'Syncerus (African Buffaloes)'
    ]
    const checkboxes = page
      .getByRole('group', { name: CATTLE_CODE })
      .getByRole('checkbox')
    await expect(checkboxes).toHaveCount(expectedOrder.length)
    for (const [index, name] of expectedOrder.entries()) {
      await expect(checkboxes.nth(index)).toHaveAccessibleName(name)
    }
  })
})

test.describe('commodity search — emphasis', () => {
  test.beforeEach(signInAndOpenSelection)

  test('bolds the matched text in the commodity heading and in a species label', async ({
    page
  }) => {
    await searchCommodities(page, CATTLE_CODE)
    await expect(
      page.getByRole('group', { name: CATTLE_CODE }).locator('legend strong')
    ).toHaveText(CATTLE_CODE)

    await searchCommodities(page, 'taurus')
    await expect(
      page.getByRole('group', { name: CATTLE_CODE }).locator('label strong')
    ).toHaveText('taurus')
  })

  test('bolds the matched text inside the common name when a search matches it', async ({
    page
  }) => {
    await searchCommodities(page, 'dog')
    await expect(
      page
        .getByRole('group', { name: OTHER_LIVE_MAMMALS_CODE })
        .locator('label strong')
    ).toHaveText(['Dog', 'Dog'])
  })
})

test.describe('commodity search reached by Save and continue from origin', () => {
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

test.describe('commodity search without JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test.beforeEach(signInAndOpenSelection)

  test('Search, one species Remove and Clear all all work', async ({
    page
  }) => {
    await searchCommodities(page, 'buffalo')
    const group = page.getByRole('group', { name: CATTLE_CODE })
    await expect(group.getByRole('checkbox')).toHaveCount(3)

    await selectSpecies(page, [BOS_TAURUS_ROW, FELIS_CATUS_ROW])
    await pressSpeciesRemove(page, BOS_TAURUS_ROW)
    await expectSelectedHeading(page, 1)
    await expectSpeciesSelected(page, FELIS_CATUS_ROW)

    await page
      .getByRole('button', { name: copy.search.selected.clearAll })
      .click()
    await expect(selectedSummary(page)).toHaveCount(0)
  })
})

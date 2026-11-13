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
  expectNoSeriousOrCriticalViolations,
  LANDINGS,
  expectSpeciesSelected,
  expectStyle,
  expectThreeSaveControls,
  openCommoditySearch,
  openOverview,
  pressClearAll,
  pressSpeciesRemove,
  saveAndExpectLanding,
  searchCommodities,
  selectSpecies,
  selectedSummary,
  signIn,
  startNotificationAtOrigin,
  tickSpecies,
  typeAndTickSpecies
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'
import { CATTLE_HEADING, labelFor } from '../search/test-support.js'
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

const GALLUS_GALLUS_SECOND_CODE_ROW = {
  ...GALLUS_GALLUS_ROW,
  commodityCode: '01059400'
}

const backLink = (page) => page.getByRole('link', { name: 'Back', exact: true })

const errorLink = (page, message) =>
  page.getByRole('alert').getByRole('link', { name: message })

const searchBox = (page) => page.getByLabel(copy.search.searchLabel)

const updateSelectedButton = (page) =>
  page.getByRole('button', { name: copy.search.updateSelected })

const resultsDropdown = (page) =>
  page.locator('[data-multi-select-search-dropdown]')

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
  await saveAndExpectLanding(page, LANDINGS.importReason)
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

  test('offers a species the reference data holds no common name for as its Latin name alone', async ({
    page
  }) => {
    await searchCommodities(page, 'Catreus')
    const group = page.getByRole('group', { name: '01063980' })
    await expect(
      group.getByRole('checkbox', { name: 'Catreus', exact: true })
    ).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(1)
  })

  test('finds cattle by their common name', async ({ page }) => {
    await searchCommodities(page, 'cattle')
    const cattle = page.getByRole('group', { name: CATTLE_CODE })
    for (const name of [
      'Bos (Cattle)',
      labelFor(BOS_TAURUS_ROW.speciesLatinName),
      'Bibos spp. (Cattle)',
      'Novibos spp. (Cattle)'
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
    await searchCommodities(page, 'gallus')
    const firstCode = page.getByRole('group', { name: '01051111' })
    const secondCode = page.getByRole('group', {
      name: GALLUS_GALLUS_SECOND_CODE_ROW.commodityCode
    })
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
    await expect(
      resultsDropdown(page).getByText(copy.search.noResults, { exact: true })
    ).toBeVisible()
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

    await pressClearAll(page)
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
      page
        .getByRole('group', {
          name: GALLUS_GALLUS_SECOND_CODE_ROW.commodityCode
        })
        .getByRole('checkbox', {
          name: labelFor(GALLUS_GALLUS_ROW.speciesLatinName),
          exact: true
        })
    ).not.toBeChecked()
  })

  test('shows each chosen species as a chip of its Latin name with a Remove control naming the species and its commodity', async ({
    page
  }) => {
    await selectSpecies(page, [BOS_TAURUS_ROW, FELIS_CATUS_ROW])
    await searchCommodities(page, 'Struthio')
    await expectSpeciesSelected(page, BOS_TAURUS_ROW)
    await expectSpeciesSelected(page, FELIS_CATUS_ROW)
    await expect(
      selectedSummary(page).getByRole('button', {
        name: `Remove ${BOS_TAURUS_ROW.speciesLatinName} from ${CATTLE_HEADING}`,
        exact: true
      })
    ).toBeVisible()
    await expect(
      selectedSummary(page).getByRole('button', {
        name: `Remove ${FELIS_CATUS_ROW.speciesLatinName} from ${FELIS_CATUS_ROW.commodityCode}`,
        exact: true
      })
    ).toBeVisible()
  })

  test('names the Remove control for one Latin name chosen under two codes by each code, and removes only that line', async ({
    page
  }) => {
    await selectSpecies(page, [
      GALLUS_GALLUS_ROW,
      GALLUS_GALLUS_SECOND_CODE_ROW
    ])
    const removeUnderFirstCode = selectedSummary(page).getByRole('button', {
      name: `Remove ${GALLUS_GALLUS_ROW.speciesLatinName} from ${GALLUS_GALLUS_ROW.commodityCode}`,
      exact: true
    })
    const removeUnderSecondCode = selectedSummary(page).getByRole('button', {
      name: `Remove ${GALLUS_GALLUS_ROW.speciesLatinName} from ${GALLUS_GALLUS_SECOND_CODE_ROW.commodityCode}`,
      exact: true
    })
    await expect(removeUnderFirstCode).toHaveCount(1)
    await expect(removeUnderSecondCode).toHaveCount(1)

    await pressSpeciesRemove(page, GALLUS_GALLUS_SECOND_CODE_ROW)

    await expectSelectedHeading(page, 1)
    await expectSpeciesSelected(page, GALLUS_GALLUS_ROW)
    await expect(removeUnderSecondCode).toHaveCount(0)
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

  test('has no serious or critical axe violations', async ({ page }) => {
    await expectNoSeriousOrCriticalViolations(page, 'Commodity search')

    await selectSpecies(page, [BOS_TAURUS_ROW, FELIS_CATUS_ROW])
    await searchCommodities(page, '0106')
    await page.getByText(copy.search.help.summary, { exact: true }).click()
    await expectNoSeriousOrCriticalViolations(
      page,
      'Commodity search with results'
    )

    await pressClearAll(page)
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
        name: labelFor(BISON_BISON_ROW.speciesLatinName),
        exact: true
      })
    ).toBeVisible()
    await expect(cattle.getByRole('checkbox')).toHaveCount(15)
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
      'Bibos spp. (Cattle)',
      'Bison (Bison)',
      labelFor(BISON_BISON_ROW.speciesLatinName),
      'Bison bonasus (European Bison)',
      'Bos (Cattle)',
      'Bos sp. (Cattle)',
      labelFor(BOS_TAURUS_ROW.speciesLatinName),
      'Bubalus (Water Buffaloes)',
      labelFor(BUBALUS_BUBALIS_ROW.speciesLatinName),
      'Elephas maximus (Asian Elephant)',
      'Loxodonta africana (African elephant)',
      'Novibos spp. (Cattle)',
      'Ovibos (Muskoxen)',
      'Poephagus spp. (Animals)',
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
    ).toHaveText('Dog')
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

test.describe('commodity search as the trader types', () => {
  test.beforeEach(signInAndOpenSelection)

  const resultsStatus = (page) => page.getByRole('status')

  const chooseCatThenSlowTheResults = async (page) => {
    await typeAndTickSpecies(page, FELIS_CATUS_ROW)
    await expectSelectedHeading(page, 1)
    await page.route('**/commodities/results', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500))
      await route.continue()
    })
  }

  test('lists the matching species without pressing Search or leaving the page', async ({
    page
  }) => {
    await page.evaluate(() => {
      window.stillOnThePage = true
    })
    await searchBox(page).fill('buffalo')

    const group = page.getByRole('group', { name: CATTLE_CODE })
    await expect(
      group.getByRole('checkbox', {
        name: labelFor(BUBALUS_BUBALIS_ROW.speciesLatinName),
        exact: true
      })
    ).toBeVisible()
    await expect(group.getByRole('strong').first()).toHaveText(/buffalo/i)
    await expect
      .poll(() => page.evaluate(() => window.stillOnThePage))
      .toBe(true)
  })

  test('announces how many species a typed search lists, and when it lists none', async ({
    page
  }) => {
    await searchBox(page).fill('buffalo')
    await expect(resultsStatus(page)).toHaveText(
      copy.search.resultsAvailable(3)
    )

    await searchBox(page).fill('zzzzzz')
    await expect(resultsStatus(page)).toHaveText(copy.search.noResults)
  })

  test('keeps species ticked under two typed searches and saves both', async ({
    page
  }) => {
    await typeAndTickSpecies(page, FELIS_CATUS_ROW)
    await expectSelectedHeading(page, 1)

    await typeAndTickSpecies(page, BOS_TAURUS_ROW)
    await expectSelectedHeading(page, 2)
    await expectSpeciesSelected(page, FELIS_CATUS_ROW)
    await expectSpeciesSelected(page, BOS_TAURUS_ROW)

    await saveAndExpectLanding(page, LANDINGS.importReason)
    await reopenSelection(page)
    await expectSelectedHeading(page, 2)
  })

  test('hides the results on Escape, keeping the term, and shows them again when the search box is clicked', async ({
    page
  }) => {
    await searchBox(page).fill('buffalo')
    const group = page.getByRole('group', { name: CATTLE_CODE })
    await expect(group).toBeVisible()

    await searchBox(page).press('Escape')
    await expect(group).toBeHidden()
    await expect(searchBox(page)).toHaveValue('buffalo')

    await searchBox(page).click()
    await expect(group).toBeVisible()
  })

  test('hides the results on a click outside the search, keeping what is chosen', async ({
    page
  }) => {
    await typeAndTickSpecies(page, BOS_TAURUS_ROW)
    await expectSelectedHeading(page, 1)

    await page.getByRole('heading', { name: copy.search.title }).click()

    await expect(page.getByRole('group', { name: CATTLE_CODE })).toBeHidden()
    await expectSpeciesSelected(page, BOS_TAURUS_ROW)
  })

  test('drops an unticked species from what is chosen, keeping focus on its tick box', async ({
    page
  }) => {
    await typeAndTickSpecies(page, BOS_TAURUS_ROW)
    await expectSelectedHeading(page, 1)

    const box = page
      .getByRole('group', { name: CATTLE_CODE })
      .getByRole('checkbox', {
        name: labelFor(BOS_TAURUS_ROW.speciesLatinName),
        exact: true
      })
    await box.uncheck()
    await expect(selectedSummary(page)).toHaveCount(0)
    await expect(box).toBeFocused()
  })

  test('removes one species and clears the rest in place, returning focus to the search box', async ({
    page
  }) => {
    await typeAndTickSpecies(page, FELIS_CATUS_ROW)
    await typeAndTickSpecies(page, BOS_TAURUS_ROW)
    await expectSelectedHeading(page, 2)

    await pressSpeciesRemove(page, BOS_TAURUS_ROW)
    await expectSelectedHeading(page, 1)
    await expectSpeciesSelected(page, FELIS_CATUS_ROW)
    await expect(searchBox(page)).toBeFocused()
    await expect(searchBox(page)).toHaveValue(BOS_TAURUS_ROW.speciesLatinName)

    await pressClearAll(page)
    await expect(selectedSummary(page)).toHaveCount(0)
    await expect(searchBox(page)).toBeFocused()
  })

  test('a save pressed straight after Clear all saves nothing chosen and refuses', async ({
    page
  }) => {
    await chooseCatThenSlowTheResults(page)

    await pressClearAll(page)
    await saveAndContinue(page).click()

    await expect(
      errorLink(page, copy.search.errors.selectCommodity)
    ).toBeVisible()
    await expect(selectedSummary(page)).toHaveCount(0)
  })

  test('a search pressed straight after Clear all keeps the selection cleared', async ({
    page
  }) => {
    await chooseCatThenSlowTheResults(page)

    await pressClearAll(page)
    await searchCommodities(page, BOS_TAURUS_ROW.speciesLatinName)
    await tickSpecies(page, BOS_TAURUS_ROW)
    await saveAndExpectLanding(page, LANDINGS.importReason)

    await reopenSelection(page)
    await expectSelectedHeading(page, 1)
    await expectSpeciesSelected(page, BOS_TAURUS_ROW)
  })

  test('falls back to submitting the page when the results cannot be fetched', async ({
    page
  }) => {
    const refusedResultsRequests = []
    await page.route('**/commodities/results', (route) => {
      refusedResultsRequests.push(route.request().url())
      return route.abort()
    })

    await searchCommodities(page, 'buffalo')

    expect(refusedResultsRequests.length).toBeGreaterThan(0)
    await expect(
      page.getByRole('group', { name: CATTLE_CODE }).getByRole('checkbox')
    ).toHaveCount(3)
    await expect(resultsStatus(page)).toHaveText('')
  })
})

test.describe('commodity search results list', () => {
  test.beforeEach(async ({ page }) => {
    await signInAndOpenSelection({ page })
    await searchBox(page).fill(CATTLE_CODE)
    await expect(speciesRows(page)).toHaveCount(15)
  })

  const speciesRows = (page) =>
    page
      .getByRole('group', { name: CATTLE_HEADING, exact: true })
      .getByRole('checkbox')
      .locator('..')

  test('is a scrolling box joined to the bottom of the search box', async ({
    page
  }) => {
    const dropdown = resultsDropdown(page)
    await expectStyle(dropdown, {
      'max-height': '270px',
      'overflow-y': 'auto',
      'border-top-width': '0px'
    })
    const box = await searchBox(page).boundingBox()
    const list = await dropdown.boundingBox()
    expect(list.y).toBe(box.y + box.height)
  })

  test('heads each commodity with its name and code, and rules each species row the full width of the list', async ({
    page
  }) => {
    await expect(
      page.getByRole('group', { name: CATTLE_HEADING, exact: true })
    ).toBeVisible()

    const heading = await resultsDropdown(page)
      .locator('legend')
      .first()
      .boundingBox()
    const row = await speciesRows(page).first().boundingBox()
    expect(row.x).toBe(heading.x)

    const listInnerWidth = await resultsDropdown(page).evaluate(
      (dropdown) => dropdown.clientWidth
    )
    const rowRules = await speciesRows(page).evaluateAll((rows) =>
      rows.map((speciesRow) => ({
        width: speciesRow.offsetWidth,
        ruleWidth: getComputedStyle(speciesRow).borderBottomWidth
      }))
    )
    expect(rowRules).toEqual(
      rowRules.map(() => ({ width: listInnerWidth, ruleWidth: '1px' }))
    )
  })

  test('shades the first species row under each heading, then every other row', async ({
    page
  }) => {
    const transparent = 'rgba(0, 0, 0, 0)'
    const backgrounds = await speciesRows(page).evaluateAll((rows) =>
      rows.slice(0, 3).map((row) => getComputedStyle(row).backgroundColor)
    )
    expect(backgrounds.map((background) => background !== transparent)).toEqual(
      [true, false, true]
    )

    await searchBox(page).fill('gallus')
    const headings = resultsDropdown(page).getByRole('group')
    await expect(headings).toHaveCount(2)
    for (const heading of await headings.all()) {
      const firstRow = heading.getByRole('checkbox').first().locator('..')
      const firstRowBackground = await firstRow.evaluate(
        (row) => getComputedStyle(row).backgroundColor
      )
      expect(firstRowBackground).not.toBe(transparent)
    }
  })

  test('offers no Update selected button with JavaScript on', async ({
    page
  }) => {
    await expect(updateSelectedButton(page)).toBeHidden()
  })

  test('draws no ring round a hovered tick box', async ({ page }) => {
    const tickBox = speciesRows(page).nth(1).getByRole('checkbox')
    await tickBox.hover()
    expect(
      await tickBox.evaluate(
        (input) =>
          getComputedStyle(input.nextElementSibling, '::before').boxShadow
      )
    ).toBe('none')
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

    await pressClearAll(page)
    await expect(selectedSummary(page)).toHaveCount(0)
  })

  test('updates what is chosen when Update selected is pressed, keeping the search and its results', async ({
    page
  }) => {
    await searchCommodities(page, 'buffalo')
    await tickSpecies(page, BUBALUS_BUBALIS_ROW)
    await expect(selectedSummary(page)).toHaveCount(0)

    await updateSelectedButton(page).click()

    await expectSelectedHeading(page, 1)
    await expectSpeciesSelected(page, BUBALUS_BUBALIS_ROW)
    await expect(searchBox(page)).toHaveValue('buffalo')
    await expect(
      page.getByRole('group', { name: CATTLE_CODE }).getByRole('checkbox')
    ).toHaveCount(3)
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
})

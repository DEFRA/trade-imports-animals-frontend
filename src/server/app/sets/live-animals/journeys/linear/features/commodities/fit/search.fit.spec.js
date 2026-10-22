import { expect, test } from '@playwright/test'
import {
  answerCountryOfOrigin,
  searchCommodities,
  selectSpecies,
  signIn,
  startNotification,
  typeCommoditySearch
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { expectNoSeriousOrCriticalViolations } from './axe.js'
import { copy } from '../copy/copy.en.js'

const BISON_BISON = 'Bison bison'
const BOS_TAURUS = 'Bos taurus'
const FELIS_CATUS = 'Felis catus'
// Every option is offered as its common name with the scientific name in
// brackets, so the trader who does not read Latin can tell the tick boxes apart.
const BISON_BISON_LABEL = 'American bison (Bison bison)'
const BOS_SPP_LABEL = 'Cattle (Bos spp.)'
const BOS_TAURUS_LABEL = 'Domestic cattle (Bos taurus)'
const FELIS_CATUS_LABEL = 'Cat (Felis catus)'
const CANIS_LUPUS_LABEL = 'Dog (Canis lupus familiaris)'
const COW_LEGEND = 'Cow (0102)'
const SAVE_AND_CONTINUE = 'Save and continue'
const BACK_LINK = '.govuk-back-link'

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

const selectionPanel = (page) => page.locator('#commodity-selection')

const reopenSelection = async (page) => {
  await page.getByRole('link', { name: 'What are you importing?' }).click()
  await expect(
    page.getByRole('heading', { name: copy.search.title })
  ).toBeVisible()
}

for (const javaScriptEnabled of [true, false]) {
  test.describe(`commodity search with JavaScript ${javaScriptEnabled ? 'on' : 'off'}`, () => {
    test.use({ javaScriptEnabled })

    test.beforeEach(async ({ page }) => {
      await signIn(page)
      await openSelection(page)
    })

    test('puts a search button with a magnifying-glass icon inside the search field', async ({
      page
    }) => {
      const searchField = page
        .locator('.govuk-input__wrapper')
        .filter({ has: page.getByLabel(copy.search.searchLabel) })
      const button = searchField.getByRole('button', {
        name: copy.search.searchButton,
        exact: true
      })
      await expect(button).toBeVisible()
      await expect(button.locator('svg')).toBeVisible()
    })

    test('offers a search box and lists nothing until it is used', async ({
      page
    }) => {
      await expect(page.getByText(copy.search.inset)).toBeVisible()
      await expect(page.getByLabel(copy.search.searchLabel)).toBeVisible()
      await expect(page.getByText(copy.search.searchHint)).toBeVisible()
      await expect(page.getByRole('checkbox')).toHaveCount(0)
      await expect(selectionPanel(page)).toHaveCount(0)
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
        name: copy.search.help.lookupLink
      })
      await expect(tradeTariff).toBeVisible()
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

    test('renders a separate group per matching commodity', async ({
      page
    }) => {
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
      const panel = selectionPanel(page)

      await expect(panel).toContainText(copy.search.selected.heading(2))
      await expect(panel).toContainText(BOS_TAURUS_LABEL)
      await expect(panel).toContainText(FELIS_CATUS_LABEL)

      await page
        .getByRole('button', { name: copy.search.selected.clearAll })
        .click()
      await expect(selectionPanel(page)).toHaveCount(0)
    })

    test('back link returns to the overview', async ({ page }) => {
      await page.locator(BACK_LINK).click()
      await expect(
        page.getByRole('heading', { name: 'Overview' })
      ).toBeVisible()
    })

    test('validation: no commodity links to and focuses the search box', async ({
      page
    }) => {
      await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

      const link = errorLink(page, copy.search.errors.selectCommodity)
      await expect(link).toBeVisible()
      await link.click()
      await expect(page.getByLabel(copy.search.searchLabel)).toBeFocused()
      await expect(selectionPanel(page)).toHaveCount(0)
    })

    test('saves pairs found under different queries, in canonical order', async ({
      page
    }) => {
      await selectSpecies(page, [FELIS_CATUS, BOS_TAURUS, BISON_BISON])
      await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

      await expect(
        page.getByRole('heading', { name: 'Overview' })
      ).toBeVisible()
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
      const panel = selectionPanel(page)
      await expect(panel).toContainText(copy.search.selected.heading(3))
      for (const label of canonicalSelectionLabels) {
        await expect(panel).toContainText(label)
      }
      await expect(panel).not.toContainText('Canis lupus familiaris')
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
  })
}

test.describe('commodity search enhanced by JavaScript', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openSelection(page)
  })

  test('lists the grouped matches without loading a new page', async ({
    page
  }) => {
    await page.evaluate(() => {
      globalThis.loadedBeforeTyping = true
    })
    await typeCommoditySearch(page, 'Bos')

    const group = page.getByRole('group', { name: COW_LEGEND })
    await expect(group.getByRole('checkbox')).toHaveCount(2)
    await expect(
      group.getByRole('checkbox', { name: BOS_TAURUS_LABEL, exact: true })
    ).toBeVisible()
    expect(await page.evaluate(() => globalThis.loadedBeforeTyping)).toBe(true)
  })

  test('emphasises the text the query matched', async ({ page }) => {
    await typeCommoditySearch(page, 'cattle')
    await expect(page.locator('#commodity-search-results strong')).toHaveText([
      'Cattle',
      'cattle'
    ])

    await typeCommoditySearch(page, '0106')
    await expect(page.locator('#commodity-search-results strong')).toHaveText([
      '0106',
      '0106'
    ])
  })

  test('announces how many results the query found', async ({ page }) => {
    const status = page.getByRole('status')
    await typeCommoditySearch(page, 'Bos')
    await expect(status).toHaveText(copy.search.resultCount(2))

    await typeCommoditySearch(page, 'Salmo')
    await expect(status).toHaveText(copy.search.resultCount(1))

    await typeCommoditySearch(page, 'zzz')
    await expect(status).toHaveText(copy.search.noResults)
  })

  test('keeps a species ticked under one search when the next search replaces the results, and saves both', async ({
    page
  }) => {
    await typeCommoditySearch(page, 'Felis')
    await page.getByRole('checkbox', { name: FELIS_CATUS_LABEL }).check()
    await typeCommoditySearch(page, 'Bos taurus')
    await page.getByRole('checkbox', { name: BOS_TAURUS_LABEL }).check()

    const panel = selectionPanel(page)
    await expect(panel).toContainText(copy.search.selected.heading(2))
    await expect(panel).toContainText(FELIS_CATUS_LABEL)

    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await page
      .getByRole('link', { name: copy.consignmentDetails.title, exact: true })
      .click()
    await expect(page.getByRole('heading', { level: 3 })).toHaveText([
      BOS_TAURUS,
      FELIS_CATUS
    ])
  })

  test('updates the selection panel as a result is ticked, leaving focus on the tick box', async ({
    page
  }) => {
    await typeCommoditySearch(page, 'Bos')
    const bosTaurus = page.getByRole('checkbox', {
      name: BOS_TAURUS_LABEL,
      exact: true
    })
    await bosTaurus.check()

    await expect(selectionPanel(page)).toContainText(
      copy.search.selected.heading(1)
    )
    await expect(bosTaurus).toBeFocused()
    await expect(bosTaurus).toBeChecked()
  })

  test('clears the selection on request', async ({ page }) => {
    await typeCommoditySearch(page, 'Bos')
    await page
      .getByRole('checkbox', { name: BOS_TAURUS_LABEL, exact: true })
      .check()
    await expect(selectionPanel(page)).toContainText(
      copy.search.selected.heading(1)
    )

    await page
      .getByRole('button', { name: copy.search.selected.clearAll })
      .click()
    await expect(selectionPanel(page)).toHaveCount(0)
  })

  test('still searches with the search button when the results cannot be fetched', async ({
    page
  }) => {
    await page.route(
      (url) => url.pathname.endsWith('/commodities/results'),
      (route) => route.abort()
    )
    const failed = page.waitForEvent('requestfailed')
    await page.getByLabel(copy.search.searchLabel).fill('Bos')
    await failed
    await expect(page.getByRole('checkbox')).toHaveCount(0)

    await page
      .getByRole('button', { name: copy.search.searchButton, exact: true })
      .click()
    await expect(
      page
        .getByRole('group', { name: COW_LEGEND })
        .getByRole('checkbox', { name: BOS_TAURUS_LABEL, exact: true })
    ).toBeVisible()
  })

  test('has no serious or critical axe violations after a submitted search', async ({
    page
  }) => {
    await selectSpecies(page, [BOS_TAURUS])
    await searchCommodities(page, '0106')
    // Open the help details so its paragraphs and outbound link are scanned.
    await page.getByText(copy.search.help.summary, { exact: true }).click()
    await expectNoSeriousOrCriticalViolations(page, 'Commodity search')
  })

  test('has no serious or critical axe violations with live results and a selection', async ({
    page
  }) => {
    await typeCommoditySearch(page, 'Bos')
    await page
      .getByRole('checkbox', { name: BOS_TAURUS_LABEL, exact: true })
      .check()
    await expect(selectionPanel(page)).toContainText(
      copy.search.selected.heading(1)
    )
    await expectNoSeriousOrCriticalViolations(page, 'Commodity live search')
  })
})

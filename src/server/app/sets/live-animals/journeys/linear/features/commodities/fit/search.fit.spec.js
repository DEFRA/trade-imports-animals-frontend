import { expect, test } from '@playwright/test'
import {
  answerCountryOfOrigin,
  searchCommodities,
  selectSpecies,
  signIn,
  startNotification
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { expectNoSeriousOrCriticalViolations } from './axe.js'
import { copy } from '../copy/copy.en.js'

const BISON_BISON = 'Bison bison'
const BOS_TAURUS = 'Bos taurus'
const FELIS_CATUS = 'Felis catus'
const CATTLE_CODE = '0102'
const OTHER_MAMMALS_CODE = '01061900'
const SAVE_AND_CONTINUE = 'Save and continue'
const BACK_LINK = '.govuk-back-link'

const canonicalSelectionOrder = [BISON_BISON, BOS_TAURUS, FELIS_CATUS]

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

const signInAndOpenSelection = async ({ page }) => {
  await signIn(page)
  await openSelection(page)
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
    const group = page.getByRole('group', { name: OTHER_MAMMALS_CODE })
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
    for (const name of ['Bos', BOS_TAURUS, 'Bibos spp.', 'Novibos spp.']) {
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
    const otherMammals = page.getByRole('group', { name: OTHER_MAMMALS_CODE })
    await expect(
      cattle.getByRole('checkbox', { name: BOS_TAURUS, exact: true })
    ).toBeVisible()
    await expect(
      otherMammals.getByRole('checkbox', { name: BOS_TAURUS, exact: true })
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
    await searchCommodities(page, 'Struthio')
    const panel = selectionPanel(page)

    await expect(panel).toContainText(copy.search.selected.heading(2))
    await expect(panel).toContainText(`${CATTLE_CODE}: ${BOS_TAURUS}`)
    await expect(panel).toContainText(`${OTHER_MAMMALS_CODE}: ${FELIS_CATUS}`)

    await page
      .getByRole('button', { name: copy.search.selected.clearAll })
      .click()
    await expect(selectionPanel(page)).toHaveCount(0)
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
    await link.click()
    await expect(page.getByLabel(copy.search.searchLabel)).toBeFocused()
    await expect(selectionPanel(page)).toHaveCount(0)
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
    const panel = selectionPanel(page)
    await expect(panel).toContainText(copy.search.selected.heading(3))
    await expect(panel).toContainText(
      `${CATTLE_CODE}: ${BISON_BISON}, ${BOS_TAURUS}`
    )
    await expect(panel).toContainText(`${OTHER_MAMMALS_CODE}: ${FELIS_CATUS}`)
    await expect(panel).not.toContainText('Canis familiaris')
  })

  test('ticks a result that is already on the notification', async ({
    page
  }) => {
    await selectSpecies(page, [BOS_TAURUS])
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await reopenSelection(page)
    await searchCommodities(page, 'taurus')
    await expect(
      page
        .getByRole('group', { name: CATTLE_CODE })
        .getByRole('checkbox', { name: BOS_TAURUS, exact: true })
    ).toBeChecked()
  })

  test('leaves the same species under another code unticked', async ({
    page
  }) => {
    await selectSpecies(page, [BOS_TAURUS])
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await reopenSelection(page)
    await searchCommodities(page, 'taurus')
    await expect(
      page
        .getByRole('group', { name: OTHER_MAMMALS_CODE })
        .getByRole('checkbox', { name: BOS_TAURUS, exact: true })
    ).not.toBeChecked()
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await selectSpecies(page, [BOS_TAURUS])
    await searchCommodities(page, '0106')
    // Open the help details so its paragraphs and outbound link are scanned.
    await page.getByText(copy.search.help.summary, { exact: true }).click()
    await expectNoSeriousOrCriticalViolations(page, 'Commodity search')
  })
})

test.describe('commodity search by code', () => {
  test.beforeEach(signInAndOpenSelection)

  test('lists every species under a code searched for', async ({ page }) => {
    await searchCommodities(page, CATTLE_CODE)
    const cattle = page.getByRole('group', { name: CATTLE_CODE })
    await expect(
      cattle.getByRole('checkbox', { name: BISON_BISON, exact: true })
    ).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(15)
  })

  test('lists no more than a hundred species for one search', async ({
    page
  }) => {
    await searchCommodities(page, OTHER_MAMMALS_CODE)
    await expect(page.getByRole('checkbox')).toHaveCount(100)
  })
})

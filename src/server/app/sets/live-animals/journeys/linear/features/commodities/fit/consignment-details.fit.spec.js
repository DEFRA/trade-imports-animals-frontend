import { expect, test } from '@playwright/test'
import {
  BISON_BISON,
  BOS_TAURUS,
  CANIS_FAMILIARIS,
  FELIS_CATUS,
  saveAndContinue,
  animalsQuantityInputUnder,
  PHONE_VIEWPORT,
  expectNoHorizontalOverflow,
  expectNoSeriousOrCriticalViolations,
  expectThreeSaveControls,
  expectSpeciesSelected,
  journeyUrl,
  openCommodityDetails,
  selectSpecies,
  signIn
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'
import { copy as sharedCopy } from '../../../../../../../shared/copy.en.js'
import { copy as sectionCaptionsCopy } from '../../../flow/section-captions/copy/copy.en.js'

const FIRST_ANIMALS_QUANTITY_FIELD = 'numberOfAnimalsQuantity-0'
const FIRST_ANIMALS_QUANTITY_INPUT = `#${FIRST_ANIMALS_QUANTITY_FIELD}`
const SECOND_ANIMALS_QUANTITY_FIELD = 'numberOfAnimalsQuantity-1'
const SECOND_ANIMALS_QUANTITY_INPUT = `#${SECOND_ANIMALS_QUANTITY_FIELD}`
const FIRST_PACKAGES_FIELD = 'numberOfPackages-0'
const FIRST_PACKAGES_INPUT = `#${FIRST_PACKAGES_FIELD}`
const CONSIGNMENT_DETAILS_PATH = 'consignment-details'
const REMOVE_BOS_TAURUS = `Remove ${BOS_TAURUS.commodityCode} ${BOS_TAURUS.speciesLatinName}`
const REMOVE_FELIS_CATUS = `Remove ${FELIS_CATUS.commodityCode} ${FELIS_CATUS.speciesLatinName}`

const selectedCommoditiesTable = (page) =>
  page.getByRole('table', { name: copy.selectedCommodities.caption })

const openDetails = (page) =>
  openCommodityDetails(page, [BOS_TAURUS, FELIS_CATUS])

const validQuantities = ['25', '5', '2', '1']
const quantityFields = [
  ['number of animals for Bos taurus', FIRST_ANIMALS_QUANTITY_FIELD, '2.5'],
  ['number of packages for Bos taurus', FIRST_PACKAGES_FIELD, 'boxes'],
  ['number of animals for Felis catus', SECOND_ANIMALS_QUANTITY_FIELD, '0'],
  ['number of packages for Felis catus', 'numberOfPackages-1', '-1']
]

const fillValidQuantities = async (page) => {
  for (const [index, field] of [
    FIRST_ANIMALS_QUANTITY_FIELD,
    FIRST_PACKAGES_FIELD,
    SECOND_ANIMALS_QUANTITY_FIELD,
    'numberOfPackages-1'
  ].entries()) {
    await page.locator(`#${field}`).fill(validQuantities[index])
  }
}

const errorFor = (field) =>
  field.startsWith('numberOfAnimals')
    ? copy.consignmentDetails.errors.animalsWholeNumber
    : copy.consignmentDetails.errors.packagesWholeNumber

test.describe('commodity consignment details — rendering and validation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openDetails(page)
  })

  test('renders grouped species quantities and collection table', async ({
    page
  }) => {
    const table = selectedCommoditiesTable(page)
    await expect(table.getByRole('columnheader')).toHaveText([
      copy.selectedCommodities.commodityCode,
      copy.selectedCommodities.species,
      copy.selectedCommodities.actionsHidden
    ])
    await expect(
      table.getByRole('row', { name: new RegExp(BOS_TAURUS.commodityCode) })
    ).toContainText(BOS_TAURUS.speciesLatinName)
    await expect(
      table.getByRole('row', { name: new RegExp(FELIS_CATUS.commodityCode) })
    ).toContainText(FELIS_CATUS.speciesLatinName)
    await expect(
      page.getByRole('heading', { name: BOS_TAURUS.speciesLatinName })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: FELIS_CATUS.speciesLatinName })
    ).toBeVisible()
    await expect(
      page.locator(FIRST_ANIMALS_QUANTITY_INPUT)
    ).toHaveAccessibleName(copy.consignmentDetails.animals.label)
    await expect(
      page.locator(FIRST_ANIMALS_QUANTITY_INPUT)
    ).toHaveAccessibleDescription('')
    await expect(page.locator(FIRST_PACKAGES_INPUT)).toHaveAccessibleName(
      copy.consignmentDetails.packages.label
    )
    await expect(
      page.locator(FIRST_PACKAGES_INPUT)
    ).toHaveAccessibleDescription(copy.consignmentDetails.packages.hint)
  })

  test('steps the type down from commodity heading to species heading to quantity labels', async ({
    page
  }) => {
    await expect(
      page.getByRole('heading', {
        name: BOS_TAURUS.commodityCode,
        exact: true
      })
    ).toHaveClass(/govuk-heading-l/)
    await expect(
      page.getByRole('heading', { name: BOS_TAURUS.speciesLatinName })
    ).toHaveClass(/govuk-heading-m/)
    await expect(
      page.locator(`label[for="${FIRST_ANIMALS_QUANTITY_FIELD}"]`)
    ).toHaveClass(/govuk-label--s/)
    await expect(
      page.locator(`label[for="${FIRST_PACKAGES_FIELD}"]`)
    ).toHaveClass(/govuk-label--s/)
  })

  test('keeps the code-level remove for 0102 Bos taurus and gives each species on code 01061900 its own remove', async ({
    page
  }) => {
    const table = selectedCommoditiesTable(page)
    await expect(
      table.getByRole('button', { name: REMOVE_BOS_TAURUS })
    ).toHaveAttribute('value', 'remove:0')
    await expect(
      table.getByRole('button', { name: REMOVE_FELIS_CATUS })
    ).toHaveAttribute('value', 'remove-species:1')
  })

  test('back link returns to the overview the hub task came from', async ({
    page
  }) => {
    await page.locator('.govuk-back-link').click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  for (const [name, field, invalid] of quantityFields) {
    test(`validation: invalid ${name} links to and focuses the preserved value`, async ({
      page
    }) => {
      await fillValidQuantities(page)
      await page.locator(`#${field}`).fill(invalid)
      await saveAndContinue(page).click()

      const link = page
        .getByRole('alert')
        .getByRole('link', { name: errorFor(field) })
      await expect(link).toBeVisible()
      await link.click()
      await expect(page.locator(`#${field}`)).toBeFocused()
      await expect(page.locator(`#${field}`)).toHaveValue(invalid)
      await expect(page.locator(FIRST_ANIMALS_QUANTITY_INPUT)).toHaveValue(
        field === FIRST_ANIMALS_QUANTITY_FIELD ? invalid : validQuantities[0]
      )
    })
  }

  test('validation: when every animal count is blank, holds the page and names each species', async ({
    page
  }) => {
    await saveAndContinue(page).click()

    await expect(
      page.getByRole('heading', { name: copy.consignmentDetails.title })
    ).toBeVisible()
    const links = page.getByRole('alert').getByRole('link', {
      name: copy.consignmentDetails.errors.animalsRequired
    })
    await expect(links).toHaveCount(2)
    await expect(
      page.locator(`${FIRST_ANIMALS_QUANTITY_INPUT}-error`)
    ).toContainText(copy.consignmentDetails.errors.animalsRequired)
    await expect(
      page.locator(`${SECOND_ANIMALS_QUANTITY_INPUT}-error`)
    ).toContainText(copy.consignmentDetails.errors.animalsRequired)

    await links.first().click()
    await expect(page.locator(FIRST_ANIMALS_QUANTITY_INPUT)).toBeFocused()
  })

  test('captions the page with the description-of-the-goods section', async ({
    page
  }) => {
    await expect(
      page.locator('span.govuk-caption-l + h1.govuk-heading-l')
    ).toHaveText(copy.consignmentDetails.title)
    await expect(page.locator('span.govuk-caption-l')).toHaveText(
      sectionCaptionsCopy.sections.descriptionOfTheGoods
    )
  })

  test('puts one rule between the two commodities and none above the save buttons', async ({
    page
  }) => {
    const rules = page.getByRole('main').getByRole('separator')
    await expect(rules).toHaveCount(1)
    const rule = await rules.boundingBox()
    const firstCommodityLastField = await page
      .locator(FIRST_PACKAGES_INPUT)
      .boundingBox()
    const secondCommodityHeading = await page
      .getByRole('heading', { name: FELIS_CATUS.commodityCode, exact: true })
      .boundingBox()
    expect(rule.y).toBeGreaterThan(firstCommodityLastField.y)
    expect(rule.y).toBeLessThan(secondCommodityHeading.y)
  })

  test('lists every Latin name chosen under a commodity in its Species cell', async ({
    page
  }) => {
    await page
      .getByRole('link', { name: copy.consignmentDetails.addAnother })
      .click()
    await selectSpecies(page, [BISON_BISON])
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('heading', { name: copy.consignmentDetails.title })
    ).toBeVisible()

    const codeRow = selectedCommoditiesTable(page)
      .getByRole('row')
      .filter({ has: page.getByRole('cell', { name: '0102', exact: true }) })
    const speciesCell = codeRow.getByRole('cell').nth(1)
    expect(await speciesCell.evaluate((el) => el.innerText)).toBe(
      `${BISON_BISON.speciesLatinName},\n${BOS_TAURUS.speciesLatinName}`
    )
  })

  test('validation: lists every number of animals error before any number of packages error', async ({
    page
  }) => {
    await page.locator(FIRST_PACKAGES_INPUT).fill('abc')
    await page.locator('#numberOfPackages-1').fill('abc')
    await saveAndContinue(page).click()

    await expect(page.getByRole('alert').getByRole('link')).toHaveText([
      copy.consignmentDetails.errors.animalsRequired,
      copy.consignmentDetails.errors.animalsRequired,
      copy.consignmentDetails.errors.packagesWholeNumber,
      copy.consignmentDetails.errors.packagesWholeNumber
    ])
  })

  test('validation: when one animal count is filled, only the blank species is named', async ({
    page
  }) => {
    await page.locator(FIRST_ANIMALS_QUANTITY_INPUT).fill('25')
    await saveAndContinue(page).click()

    const links = page.getByRole('alert').getByRole('link', {
      name: copy.consignmentDetails.errors.animalsRequired
    })
    await expect(links).toHaveCount(1)
    await links.click()
    await expect(page.locator(SECOND_ANIMALS_QUANTITY_INPUT)).toBeFocused()
    await expect(page.locator(FIRST_ANIMALS_QUANTITY_INPUT)).toHaveValue('25')
  })
})

test.describe('commodity consignment details — persistence and accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openDetails(page)
  })

  test('saves and persists per-species counts', async ({ page }) => {
    await fillValidQuantities(page)
    await saveAndContinue(page).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await page.goto(journeyUrl(page, CONSIGNMENT_DETAILS_PATH))
    await expect(page.locator(FIRST_ANIMALS_QUANTITY_INPUT)).toHaveValue('25')
    await expect(page.locator(FIRST_PACKAGES_INPUT)).toHaveValue('5')
    await expect(page.locator(SECOND_ANIMALS_QUANTITY_INPUT)).toHaveValue('2')
    await expect(page.locator('#numberOfPackages-1')).toHaveValue('1')
  })

  test('removes one species row without changing another quantity', async ({
    page
  }) => {
    await fillValidQuantities(page)
    await saveAndContinue(page).click()
    await page.goto(journeyUrl(page, CONSIGNMENT_DETAILS_PATH))
    await page.getByRole('button', { name: REMOVE_FELIS_CATUS }).click()

    await expect(selectedCommoditiesTable(page)).not.toContainText(
      FELIS_CATUS.speciesLatinName
    )
    await expect(page.locator(FIRST_ANIMALS_QUANTITY_INPUT)).toHaveValue('25')
  })

  test('removes one commodity group without changing another quantity', async ({
    page
  }) => {
    await fillValidQuantities(page)
    await saveAndContinue(page).click()
    await page.goto(journeyUrl(page, CONSIGNMENT_DETAILS_PATH))
    await page.getByRole('button', { name: REMOVE_BOS_TAURUS }).click()

    const table = selectedCommoditiesTable(page)
    await expect(table).not.toContainText(BOS_TAURUS.speciesLatinName)
    await expect(table).toContainText(FELIS_CATUS.speciesLatinName)
    await expect(page.locator(FIRST_ANIMALS_QUANTITY_INPUT)).toHaveValue('2')
  })

  test('removing the last commodity returns to the commodity question, as does reopening the page with nothing selected', async ({
    page
  }) => {
    await page.getByRole('button', { name: REMOVE_BOS_TAURUS }).click()
    await page.getByRole('button', { name: REMOVE_FELIS_CATUS }).click()

    await expect(
      page.getByRole('heading', { name: copy.search.title })
    ).toBeVisible()
    await expect(page.getByLabel(copy.search.searchLabel)).toBeVisible()

    await page.goto(journeyUrl(page, CONSIGNMENT_DETAILS_PATH))
    await expect(
      page.getByRole('heading', { name: copy.search.title })
    ).toBeVisible()
  })

  test('adds another species while preserving existing quantities', async ({
    page
  }) => {
    await fillValidQuantities(page)
    await saveAndContinue(page).click()
    await page.goto(journeyUrl(page, CONSIGNMENT_DETAILS_PATH))
    await page
      .getByRole('link', { name: copy.consignmentDetails.addAnother })
      .click()
    await expectSpeciesSelected(page, BOS_TAURUS)
    await selectSpecies(page, [CANIS_FAMILIARIS])
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('heading', { name: copy.consignmentDetails.title })
    ).toBeVisible()
    await expect(selectedCommoditiesTable(page)).toContainText(
      CANIS_FAMILIARIS.speciesLatinName
    )
    await expect(animalsQuantityInputUnder(page, BOS_TAURUS)).toHaveValue('25')
    await expect(animalsQuantityInputUnder(page, CANIS_FAMILIARIS)).toHaveValue(
      ''
    )
    await expect(animalsQuantityInputUnder(page, FELIS_CATUS)).toHaveValue('2')
  })

  test('ends with Save and continue and Save and return to overview in the button group, then Cancel and return to overview', async ({
    page
  }) => {
    await expectThreeSaveControls(page)
  })

  test('save and return to overview stores the counts and marks the row Completed', async ({
    page
  }) => {
    await fillValidQuantities(page)
    await page
      .getByRole('button', { name: sharedCopy.saveActions.saveAndReturnToHub })
      .click()

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await page.goto(journeyUrl(page, CONSIGNMENT_DETAILS_PATH))
    await expect(page.locator(FIRST_ANIMALS_QUANTITY_INPUT)).toHaveValue('25')
    await expect(page.locator(FIRST_PACKAGES_INPUT)).toHaveValue('5')
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await expectNoSeriousOrCriticalViolations(page, 'Commodity details')

    await saveAndContinue(page).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expectNoSeriousOrCriticalViolations(
      page,
      'Commodity details with errors'
    )
  })
})

test.describe('commodity consignment details on a phone', () => {
  test.use({ viewport: PHONE_VIEWPORT })

  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openDetails(page)
  })

  test('keeps the selected commodities table inside the screen width', async ({
    page
  }) => {
    await expectNoHorizontalOverflow(
      selectedCommoditiesTable(page),
      'Selected commodities table'
    )
  })
})

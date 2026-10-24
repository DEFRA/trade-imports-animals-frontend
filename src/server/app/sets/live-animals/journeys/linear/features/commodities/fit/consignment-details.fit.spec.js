import { expect, test } from '@playwright/test'
import {
  BOS_TAURUS,
  CANIS_FAMILIARIS,
  FELIS_CATUS,
  SAVE_AND_CONTINUE,
  animalsQuantityInputUnder,
  expectSpeciesSelected,
  journeyUrl,
  openCommodityDetails,
  selectSpecies,
  signIn
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { expectNoSeriousOrCriticalViolations } from './axe.js'
import { copy } from '../copy/copy.en.js'
import { copy as sharedCopy } from '../../../../../../../shared/copy.en.js'

const FIRST_ANIMALS_QUANTITY_FIELD = 'numberOfAnimalsQuantity-0'
const FIRST_ANIMALS_QUANTITY_INPUT = `#${FIRST_ANIMALS_QUANTITY_FIELD}`
const SECOND_ANIMALS_QUANTITY_FIELD = 'numberOfAnimalsQuantity-1'
const SECOND_ANIMALS_QUANTITY_INPUT = `#${SECOND_ANIMALS_QUANTITY_FIELD}`
const FIRST_PACKAGES_FIELD = 'numberOfPackages-0'
const FIRST_PACKAGES_INPUT = `#${FIRST_PACKAGES_FIELD}`
const CONSIGNMENT_DETAILS_PATH = 'consignment-details'
const REMOVE_COW = `Remove ${BOS_TAURUS.latinName}`
const REMOVE_CAT = `Remove ${FELIS_CATUS.latinName}`

const selectedCommoditiesTable = (page) =>
  page.getByRole('table', { name: copy.consignmentDetails.table.caption })

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
    await expect(table).toContainText(
      copy.consignmentDetails.table.commodityCode
    )
    await expect(table).toContainText(BOS_TAURUS.latinName)
    await expect(table).toContainText(BOS_TAURUS.commodityCode)
    await expect(table).toContainText(FELIS_CATUS.latinName)
    await expect(table).toContainText(FELIS_CATUS.commodityCode)
    await expect(
      page.getByRole('heading', { name: BOS_TAURUS.latinName })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: FELIS_CATUS.latinName })
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
      page.getByRole('heading', { name: BOS_TAURUS.latinName })
    ).toHaveClass(/govuk-heading-m/)
    await expect(
      page.locator(`label[for="${FIRST_ANIMALS_QUANTITY_FIELD}"]`)
    ).toHaveClass(/govuk-label--s/)
    await expect(
      page.locator(`label[for="${FIRST_PACKAGES_FIELD}"]`)
    ).toHaveClass(/govuk-label--s/)
  })

  test('lists a commodity on code 01061900 as a species row whose remove drops that species alone', async ({
    page
  }) => {
    const table = selectedCommoditiesTable(page)
    await table.getByRole('button', { name: REMOVE_CAT }).click()

    await expect(table).not.toContainText(FELIS_CATUS.latinName)
    await expect(table).toContainText(BOS_TAURUS.latinName)
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
      await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

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
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

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

  test('validation: when one animal count is filled, only the blank species is named', async ({
    page
  }) => {
    await page.locator(FIRST_ANIMALS_QUANTITY_INPUT).fill('25')
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

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
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
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
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await page.goto(journeyUrl(page, CONSIGNMENT_DETAILS_PATH))
    await page.getByRole('button', { name: REMOVE_CAT }).click()

    await expect(selectedCommoditiesTable(page)).not.toContainText(
      FELIS_CATUS.latinName
    )
    await expect(page.locator(FIRST_ANIMALS_QUANTITY_INPUT)).toHaveValue('25')
  })

  test('removes one commodity group without changing another quantity', async ({
    page
  }) => {
    await fillValidQuantities(page)
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await page.goto(journeyUrl(page, CONSIGNMENT_DETAILS_PATH))
    await page.getByRole('button', { name: REMOVE_COW }).click()

    const table = selectedCommoditiesTable(page)
    await expect(table).not.toContainText(BOS_TAURUS.latinName)
    await expect(table).toContainText(FELIS_CATUS.latinName)
    await expect(page.locator(FIRST_ANIMALS_QUANTITY_INPUT)).toHaveValue('2')
  })

  test('removing the last commodity returns to the commodity question', async ({
    page
  }) => {
    await page.getByRole('button', { name: REMOVE_COW }).click()
    await page.getByRole('button', { name: REMOVE_CAT }).click()

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
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await page.goto(journeyUrl(page, CONSIGNMENT_DETAILS_PATH))
    await page
      .getByRole('link', { name: copy.consignmentDetails.addAnother })
      .click()
    await expectSpeciesSelected(page, BOS_TAURUS.latinName)
    await selectSpecies(page, [CANIS_FAMILIARIS])
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await page
      .getByRole('link', { name: copy.consignmentDetails.title, exact: true })
      .click()
    await expect(selectedCommoditiesTable(page)).toContainText(
      CANIS_FAMILIARIS.latinName
    )
    await expect(animalsQuantityInputUnder(page, BOS_TAURUS)).toHaveValue('25')
    await expect(animalsQuantityInputUnder(page, CANIS_FAMILIARIS)).toHaveValue(
      ''
    )
    await expect(animalsQuantityInputUnder(page, FELIS_CATUS)).toHaveValue('2')
  })

  test('ends with all three controls now the hub links straight here', async ({
    page
  }) => {
    const group = page.locator('.govuk-button-group')

    await expect(
      group.getByRole('button', { name: SAVE_AND_CONTINUE })
    ).toBeVisible()
    await expect(
      group.getByRole('button', {
        name: sharedCopy.saveActions.saveAndReturnToHub
      })
    ).toBeVisible()
    await expect(
      group.getByRole('link', {
        name: sharedCopy.saveActions.cancelAndReturnToHub
      })
    ).toHaveCount(0)
    await expect(
      page.getByRole('link', {
        name: sharedCopy.saveActions.cancelAndReturnToHub
      })
    ).toBeVisible()
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
  })
})

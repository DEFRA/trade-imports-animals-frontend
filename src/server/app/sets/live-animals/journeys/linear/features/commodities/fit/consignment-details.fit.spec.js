import { expect, test } from '@playwright/test'
import {
  BISON_BISON_ROW,
  BOS_TAURUS_ROW,
  FELIS_CATUS_ROW,
  MUSTELA_PUTORIUS_FURO_ROW,
  STRUTHIO_ROW,
  saveAndContinue,
  saveAndReturnToHub,
  numberOfAnimalsFor,
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
import { labelFor } from '../search/test-support.js'

const FIRST_ANIMALS_QUANTITY_FIELD = 'numberOfAnimalsQuantity-0'
const FIRST_ANIMALS_QUANTITY_INPUT = `#${FIRST_ANIMALS_QUANTITY_FIELD}`
const SECOND_ANIMALS_QUANTITY_FIELD = 'numberOfAnimalsQuantity-1'
const SECOND_ANIMALS_QUANTITY_INPUT = `#${SECOND_ANIMALS_QUANTITY_FIELD}`
const FIRST_PACKAGES_FIELD = 'numberOfPackages-0'
const FIRST_PACKAGES_INPUT = `#${FIRST_PACKAGES_FIELD}`
const SECOND_PACKAGES_FIELD = 'numberOfPackages-1'
const QUANTITY_FIELDS = [
  FIRST_ANIMALS_QUANTITY_FIELD,
  FIRST_PACKAGES_FIELD,
  SECOND_ANIMALS_QUANTITY_FIELD,
  SECOND_PACKAGES_FIELD
]
const CONSIGNMENT_DETAILS_PATH = 'consignment-details'
const REMOVE_BOS_TAURUS = `Remove ${BOS_TAURUS_ROW.commodityCode} ${labelFor(BOS_TAURUS_ROW.speciesLatinName)}`
const REMOVE_FELIS_CATUS = `Remove ${FELIS_CATUS_ROW.commodityCode} ${labelFor(FELIS_CATUS_ROW.speciesLatinName)}`

const selectedCommoditiesTable = (page) =>
  page.getByRole('table', { name: copy.selectedCommodities.caption })

const openDetails = (page) =>
  openCommodityDetails(page, [BOS_TAURUS_ROW, FELIS_CATUS_ROW])

const validQuantities = ['25', '5', '2', '1']
const quantityFields = [
  ['number of animals for Bos taurus', FIRST_ANIMALS_QUANTITY_FIELD, '2.5'],
  ['number of packages for Bos taurus', FIRST_PACKAGES_FIELD, 'boxes'],
  ['number of animals for Felis catus', SECOND_ANIMALS_QUANTITY_FIELD, '0'],
  ['number of packages for Felis catus', SECOND_PACKAGES_FIELD, '-1']
]

const fillValidQuantities = async (page) => {
  for (const [index, field] of QUANTITY_FIELDS.entries()) {
    await page.locator(`#${field}`).fill(validQuantities[index])
  }
}

const expectEveryQuantityEmpty = async (page) => {
  for (const field of QUANTITY_FIELDS) {
    await expect(page.locator(`#${field}`)).toHaveValue('')
  }
}

const errorFor = (field) =>
  field.startsWith('numberOfAnimals')
    ? copy.consignmentDetails.errors.animalsWholeNumber
    : copy.consignmentDetails.errors.packagesWholeNumber

const removeBosTaurusLeavingOnlyFelisCatus = async (page) => {
  await page.getByRole('button', { name: REMOVE_BOS_TAURUS }).click()

  const table = selectedCommoditiesTable(page)
  await expect(table.getByRole('row')).toHaveCount(2)
  await expect(
    table.getByRole('cell', {
      name: FELIS_CATUS_ROW.commodityCode,
      exact: true
    })
  ).toBeVisible()
}

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
      table.getByRole('row', { name: new RegExp(BOS_TAURUS_ROW.commodityCode) })
    ).toContainText(labelFor(BOS_TAURUS_ROW.speciesLatinName))
    await expect(
      table.getByRole('row', {
        name: new RegExp(FELIS_CATUS_ROW.commodityCode)
      })
    ).toContainText(labelFor(FELIS_CATUS_ROW.speciesLatinName))
    await expect(
      page.getByRole('heading', {
        name: labelFor(BOS_TAURUS_ROW.speciesLatinName)
      })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', {
        name: labelFor(FELIS_CATUS_ROW.speciesLatinName)
      })
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
    await expectEveryQuantityEmpty(page)
  })

  test('steps the type down from commodity heading to species heading to quantity labels', async ({
    page
  }) => {
    await expect(
      page.getByRole('heading', {
        name: BOS_TAURUS_ROW.commodityCode,
        exact: true
      })
    ).toHaveClass(/govuk-heading-l/)
    await expect(
      page.getByRole('heading', {
        name: labelFor(BOS_TAURUS_ROW.speciesLatinName)
      })
    ).toHaveClass(/govuk-heading-m/)
    await expect(
      page.locator(`label[for="${FIRST_ANIMALS_QUANTITY_FIELD}"]`)
    ).toHaveClass(/govuk-label--s/)
    await expect(
      page.locator(`label[for="${FIRST_PACKAGES_FIELD}"]`)
    ).toHaveClass(/govuk-label--s/)
  })

  test('keeps the code-level remove for 0102 Bos taurus and gives each species on code 01061900 its own remove, each naming the entry it removes', async ({
    page
  }) => {
    const table = selectedCommoditiesTable(page)
    await expect(
      table.getByRole('button', { name: REMOVE_BOS_TAURUS })
    ).toHaveAttribute('value', `remove:${BOS_TAURUS_ROW.commodityCode}`)
    await expect(
      table.getByRole('button', { name: REMOVE_FELIS_CATUS })
    ).toHaveAttribute(
      'value',
      `remove-species:${FELIS_CATUS_ROW.commodityCode}|${FELIS_CATUS_ROW.speciesLatinName}`
    )
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
      .getByRole('heading', {
        name: FELIS_CATUS_ROW.commodityCode,
        exact: true
      })
      .boundingBox()
    expect(rule.y).toBeGreaterThan(firstCommodityLastField.y)
    expect(rule.y).toBeLessThan(secondCommodityHeading.y)
  })

  test('lists every species label chosen under a commodity in its Species cell', async ({
    page
  }) => {
    await page
      .getByRole('link', { name: copy.consignmentDetails.addAnother })
      .click()
    await selectSpecies(page, [BISON_BISON_ROW])
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('heading', { name: copy.consignmentDetails.title })
    ).toBeVisible()

    const codeRow = selectedCommoditiesTable(page)
      .getByRole('row')
      .filter({ has: page.getByRole('cell', { name: '0102', exact: true }) })
    const speciesCell = codeRow.getByRole('cell').nth(1)
    expect(await speciesCell.evaluate((el) => el.innerText)).toBe(
      `${labelFor(BISON_BISON_ROW.speciesLatinName)},\n${labelFor(BOS_TAURUS_ROW.speciesLatinName)}`
    )
  })

  test('validation: lists every number of animals error before any number of packages error', async ({
    page
  }) => {
    await page.locator(FIRST_PACKAGES_INPUT).fill('abc')
    await page.locator(`#${SECOND_PACKAGES_FIELD}`).fill('abc')
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

test.describe('commodity consignment details — the number-of-animals cap', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openDetails(page)
  })

  test('validation: a number of animals above the largest the service stores holds the page with one error against that species, keeping both fields exactly as typed', async ({
    page
  }) => {
    const atMax = '2147483647'
    const aboveMax = '2147483648'
    await page.locator(FIRST_ANIMALS_QUANTITY_INPUT).fill(atMax)
    await page.locator(SECOND_ANIMALS_QUANTITY_INPUT).fill(aboveMax)
    await saveAndContinue(page).click()

    const links = page.getByRole('alert').getByRole('link')
    await expect(links).toHaveCount(1)
    await expect(links).toHaveText(
      copy.consignmentDetails.errors.animalsAboveMax(2147483647)
    )
    await links.click()
    await expect(page.locator(SECOND_ANIMALS_QUANTITY_INPUT)).toBeFocused()
    await expect(page.locator(FIRST_ANIMALS_QUANTITY_INPUT)).toHaveValue(atMax)
    await expect(page.locator(SECOND_ANIMALS_QUANTITY_INPUT)).toHaveValue(
      aboveMax
    )
  })
})

test.describe('commodity consignment details — package-count scope', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openCommodityDetails(page, [BOS_TAURUS_ROW, STRUTHIO_ROW])
  })

  test('asks the listed species for a number of animals and a number of packages, and the served unlisted species for a number of animals alone', async ({
    page
  }) => {
    await expect(page.getByRole('heading', { level: 3 })).toHaveText([
      labelFor(BOS_TAURUS_ROW.speciesLatinName),
      labelFor(STRUTHIO_ROW.speciesLatinName)
    ])
    await expect(
      page.locator(
        'label[for^="numberOfAnimalsQuantity"], label[for^="numberOfPackages"]'
      )
    ).toHaveText([
      copy.consignmentDetails.animals.label,
      copy.consignmentDetails.packages.label,
      copy.consignmentDetails.animals.label
    ])
  })
})

test.describe('commodity consignment details — persistence and accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openDetails(page)
  })

  test('saves and persists per-species counts', async ({ page }) => {
    await fillValidQuantities(page)
    await saveAndReturnToHub(page).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await page.goto(journeyUrl(page, CONSIGNMENT_DETAILS_PATH))
    await expect(page.locator(FIRST_ANIMALS_QUANTITY_INPUT)).toHaveValue('25')
    await expect(page.locator(FIRST_PACKAGES_INPUT)).toHaveValue('5')
    await expect(page.locator(SECOND_ANIMALS_QUANTITY_INPUT)).toHaveValue('2')
    await expect(page.locator(`#${SECOND_PACKAGES_FIELD}`)).toHaveValue('1')
  })

  test('removes one species row without changing another quantity', async ({
    page
  }) => {
    await fillValidQuantities(page)
    await saveAndContinue(page).click()
    await page.goto(journeyUrl(page, CONSIGNMENT_DETAILS_PATH))
    await page.getByRole('button', { name: REMOVE_FELIS_CATUS }).click()

    const table = selectedCommoditiesTable(page)
    await expect(table.getByRole('row')).toHaveCount(2)
    await expect(
      table.getByRole('cell', { name: '0102', exact: true })
    ).toBeVisible()
    await expect(
      table.getByRole('cell', {
        name: labelFor(BOS_TAURUS_ROW.speciesLatinName),
        exact: true
      })
    ).toBeVisible()
    await expect(page.locator(FIRST_ANIMALS_QUANTITY_INPUT)).toHaveValue('25')
  })

  test('removes one commodity group without changing another quantity', async ({
    page
  }) => {
    await fillValidQuantities(page)
    await saveAndContinue(page).click()
    await page.goto(journeyUrl(page, CONSIGNMENT_DETAILS_PATH))
    await removeBosTaurusLeavingOnlyFelisCatus(page)

    await expect(
      selectedCommoditiesTable(page).getByRole('cell', {
        name: labelFor(FELIS_CATUS_ROW.speciesLatinName),
        exact: true
      })
    ).toBeVisible()
    await expect(page.locator(FIRST_ANIMALS_QUANTITY_INPUT)).toHaveValue('2')
  })

  test('keeps numbers typed but not yet saved in the remaining line after removing another commodity', async ({
    page
  }) => {
    await page.locator(FIRST_ANIMALS_QUANTITY_INPUT).fill('11')
    await page.locator(SECOND_ANIMALS_QUANTITY_INPUT).fill('22')
    await removeBosTaurusLeavingOnlyFelisCatus(page)

    await expect(await numberOfAnimalsFor(page, FELIS_CATUS_ROW)).toHaveValue(
      '22'
    )
  })

  test('saves the page rather than removing a commodity when Enter is pressed in a quantity field', async ({
    page
  }) => {
    await fillValidQuantities(page)
    await page.locator(FIRST_ANIMALS_QUANTITY_INPUT).press('Enter')

    await expect(
      page.getByRole('heading', { name: 'Identification details', exact: true })
    ).toBeVisible()
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
    await expectSpeciesSelected(page, BOS_TAURUS_ROW)
    await selectSpecies(page, [MUSTELA_PUTORIUS_FURO_ROW])
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('heading', { name: copy.consignmentDetails.title })
    ).toBeVisible()
    await expect(selectedCommoditiesTable(page)).toContainText(
      labelFor(MUSTELA_PUTORIUS_FURO_ROW.speciesLatinName)
    )
    await expect(await numberOfAnimalsFor(page, BOS_TAURUS_ROW)).toHaveValue(
      '25'
    )
    await expect(
      await numberOfAnimalsFor(page, MUSTELA_PUTORIUS_FURO_ROW)
    ).toHaveValue('')
    await expect(await numberOfAnimalsFor(page, FELIS_CATUS_ROW)).toHaveValue(
      '2'
    )
    await expect(page.locator(FIRST_PACKAGES_INPUT)).toHaveValue('5')
  })

  test('ends with Save and continue and Save and return to overview in the button group, then Cancel and return to overview', async ({
    page
  }) => {
    await expectThreeSaveControls(page)
  })

  test('save and return to overview stores the counts', async ({ page }) => {
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

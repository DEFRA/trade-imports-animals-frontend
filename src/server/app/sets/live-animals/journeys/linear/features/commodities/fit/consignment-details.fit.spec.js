import { expect, test } from '@playwright/test'
import {
  PHONE_VIEWPORT,
  answerCountryOfOrigin,
  expectNoHorizontalOverflow,
  expectNoSeriousOrCriticalViolations,
  expectThreeSaveControls,
  expectSpeciesSelected,
  journeyUrl,
  saveAndReturnToHub,
  selectSpecies,
  signIn,
  startNotification
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'
import { copy as sectionCaptionsCopy } from '../../../flow/section-captions/copy/copy.en.js'

const BISON_BISON = 'Bison bison'
const BOS_TAURUS = 'Bos taurus'
const FELIS_CATUS = 'Felis catus'
const SAVE_AND_CONTINUE = 'Save and continue'
const FIRST_ANIMALS_QUANTITY_FIELD = 'numberOfAnimalsQuantity-0'
const FIRST_ANIMALS_QUANTITY_INPUT = `#${FIRST_ANIMALS_QUANTITY_FIELD}`
const SECOND_ANIMALS_QUANTITY_FIELD = 'numberOfAnimalsQuantity-1'
const SECOND_ANIMALS_QUANTITY_INPUT = `#${SECOND_ANIMALS_QUANTITY_FIELD}`
const FIRST_PACKAGES_FIELD = 'numberOfPackages-0'
const FIRST_PACKAGES_INPUT = `#${FIRST_PACKAGES_FIELD}`
const GOVUK_TABLE = '.govuk-table'
const CONSIGNMENT_DETAILS_PATH = 'consignment-details'
const REMOVE_COW = 'Remove Cow'
const REMOVE_CAT = 'Remove Cat'

const openDetails = async (page) => {
  await startNotification(page)
  await answerCountryOfOrigin(page)
  await page.getByRole('link', { name: 'What are you importing?' }).click()
  await selectSpecies(page, [BOS_TAURUS, FELIS_CATUS])
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await page
    .getByRole('link', { name: copy.consignmentDetails.title, exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: copy.consignmentDetails.title })
  ).toBeVisible()
}

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
    const table = page.locator(GOVUK_TABLE)
    await expect(table).toContainText(copy.selectedCommodities.caption)
    await expect(table).toContainText(copy.selectedCommodities.commodityCode)
    await expect(table).toContainText('Cow')
    await expect(table).toContainText('0102')
    await expect(table).toContainText('Cat')
    await expect(table).toContainText('01061900')
    await expect(table.getByRole('columnheader')).toHaveText([
      copy.selectedCommodities.commodityCode,
      copy.selectedCommodities.commonName,
      copy.selectedCommodities.species,
      copy.selectedCommodities.actionsHidden
    ])
    await expect(table.getByRole('row', { name: /Cow/ })).toContainText(
      BOS_TAURUS
    )
    await expect(table.getByRole('row', { name: /Cat/ })).toContainText(
      FELIS_CATUS
    )
    await expect(page.getByRole('heading', { name: BOS_TAURUS })).toBeVisible()
    await expect(page.getByRole('heading', { name: FELIS_CATUS })).toBeVisible()
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
    await expect(page.getByRole('heading', { name: 'Cow (0102)' })).toHaveClass(
      /govuk-heading-l/
    )
    await expect(page.getByRole('heading', { name: BOS_TAURUS })).toHaveClass(
      /govuk-heading-m/
    )
    await expect(
      page.locator(`label[for="${FIRST_ANIMALS_QUANTITY_FIELD}"]`)
    ).toHaveClass(/govuk-label--s/)
    await expect(
      page.locator(`label[for="${FIRST_PACKAGES_FIELD}"]`)
    ).toHaveClass(/govuk-label--s/)
  })

  test('keeps the commodity-level remove for Cow and gives each species on code 01061900 its own remove', async ({
    page
  }) => {
    const table = page.locator(GOVUK_TABLE)
    await expect(
      table.getByRole('button', { name: REMOVE_COW })
    ).toHaveAttribute('value', 'remove:0')
    await expect(
      table.getByRole('button', { name: REMOVE_CAT })
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
      .getByRole('heading', { name: 'Cat (01061900)' })
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
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await page
      .getByRole('link', { name: copy.consignmentDetails.title, exact: true })
      .click()

    const cowRow = page
      .locator(GOVUK_TABLE)
      .getByRole('row')
      .filter({ has: page.getByRole('cell', { name: '0102', exact: true }) })
    const speciesCell = cowRow.getByRole('cell').nth(2)
    expect(await speciesCell.evaluate((el) => el.innerText)).toBe(
      `${BISON_BISON},\n${BOS_TAURUS}`
    )
  })

  test('validation: lists every number of animals error before any number of packages error', async ({
    page
  }) => {
    await page.locator(FIRST_PACKAGES_INPUT).fill('abc')
    await page.locator('#numberOfPackages-1').fill('abc')
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

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

    await expect(page.locator(GOVUK_TABLE)).not.toContainText('Cat')
    await expect(page.locator(FIRST_ANIMALS_QUANTITY_INPUT)).toHaveValue('25')
  })

  test('removes one commodity group without changing another quantity', async ({
    page
  }) => {
    await fillValidQuantities(page)
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await page.goto(journeyUrl(page, CONSIGNMENT_DETAILS_PATH))
    await page.getByRole('button', { name: REMOVE_COW }).click()

    const table = page.locator(GOVUK_TABLE)
    await expect(table).not.toContainText('Cow')
    await expect(table).toContainText('Cat')
    await expect(page.locator(FIRST_ANIMALS_QUANTITY_INPUT)).toHaveValue('2')
  })

  test('removing the last commodity returns to the commodity question, as does reopening the page with nothing selected', async ({
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

  test('adds another commodity while preserving an existing quantity', async ({
    page
  }) => {
    await fillValidQuantities(page)
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await page.goto(journeyUrl(page, CONSIGNMENT_DETAILS_PATH))
    await page
      .getByRole('link', { name: copy.consignmentDetails.addAnother })
      .click()
    await expectSpeciesSelected(page, BOS_TAURUS)
    await selectSpecies(page, ['Canis lupus familiaris'])
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await page
      .getByRole('link', { name: copy.consignmentDetails.title, exact: true })
      .click()
    await expect(page.locator(GOVUK_TABLE)).toContainText('Dog')
    await expect(page.locator(FIRST_ANIMALS_QUANTITY_INPUT)).toHaveValue('25')
    await expect(page.locator(SECOND_ANIMALS_QUANTITY_INPUT)).toHaveValue('2')
    await expect(page.locator('#numberOfAnimalsQuantity-2')).toHaveValue('')
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
    await saveAndReturnToHub(page).click()

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await page.goto(journeyUrl(page, CONSIGNMENT_DETAILS_PATH))
    await expect(page.locator(FIRST_ANIMALS_QUANTITY_INPUT)).toHaveValue('25')
    await expect(page.locator(FIRST_PACKAGES_INPUT)).toHaveValue('5')
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await expectNoSeriousOrCriticalViolations(page, 'Commodity details')

    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
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
      page.getByRole('table', { name: copy.selectedCommodities.caption }),
      'Selected commodities table'
    )
  })
})

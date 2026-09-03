import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  answerCountryOfOrigin,
  expectSpeciesSelected,
  journeyUrl,
  selectSpecies,
  signIn,
  startNotification
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'

const BOS_TAURUS = 'Bos taurus'
const SAVE_AND_CONTINUE = 'Save and continue'
const FIRST_ANIMALS_QUANTITY_FIELD = 'numberOfAnimalsQuantity-0'
const FIRST_ANIMALS_QUANTITY_INPUT = `#${FIRST_ANIMALS_QUANTITY_FIELD}`
const SECOND_ANIMALS_QUANTITY_FIELD = 'numberOfAnimalsQuantity-1'
const SECOND_ANIMALS_QUANTITY_INPUT = `#${SECOND_ANIMALS_QUANTITY_FIELD}`
const GOVUK_TABLE = '.govuk-table'
const CONSIGNMENT_DETAILS_PATH = 'consignment-details'

const openDetails = async (page) => {
  await startNotification(page)
  await answerCountryOfOrigin(page)
  await page.getByRole('link', { name: 'What are you importing?' }).click()
  await selectSpecies(page, [BOS_TAURUS, 'Felis catus'])
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await expect(
    page.getByRole('heading', { name: copy.consignmentDetails.title })
  ).toBeVisible()
}

const validQuantities = ['25', '5', '2', '1']
const quantityFields = [
  ['number of animals for Bos taurus', FIRST_ANIMALS_QUANTITY_FIELD, '2.5'],
  ['number of packages for Bos taurus', 'numberOfPackages-0', 'boxes'],
  ['number of animals for Felis catus', SECOND_ANIMALS_QUANTITY_FIELD, '0'],
  ['number of packages for Felis catus', 'numberOfPackages-1', '-1']
]

const fillValidQuantities = async (page) => {
  for (const [index, field] of [
    FIRST_ANIMALS_QUANTITY_FIELD,
    'numberOfPackages-0',
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
    await expect(table).toContainText(copy.consignmentDetails.table.caption)
    await expect(table).toContainText(
      copy.consignmentDetails.table.commodityCode
    )
    await expect(table).toContainText('Cow')
    await expect(table).toContainText('0102')
    await expect(table).toContainText('Cat')
    await expect(table).toContainText('01061900')
    await expect(page.getByRole('heading', { name: BOS_TAURUS })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Felis catus' })
    ).toBeVisible()
    await expect(
      page.locator(FIRST_ANIMALS_QUANTITY_INPUT)
    ).toHaveAccessibleDescription(copy.consignmentDetails.animals.hint)
    await expect(
      page.locator('#numberOfPackages-0')
    ).toHaveAccessibleDescription(copy.consignmentDetails.packages.hint)
  })

  test('back link returns to commodity selection', async ({ page }) => {
    await page.locator('.govuk-back-link').click()
    await expect(
      page.getByRole('heading', { name: copy.search.title })
    ).toBeVisible()
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
    await expect(page.locator('#numberOfPackages-0')).toHaveValue('5')
    await expect(page.locator(SECOND_ANIMALS_QUANTITY_INPUT)).toHaveValue('2')
    await expect(page.locator('#numberOfPackages-1')).toHaveValue('1')
  })

  test('removes one commodity group without changing another quantity', async ({
    page
  }) => {
    await fillValidQuantities(page)
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await page.goto(journeyUrl(page, CONSIGNMENT_DETAILS_PATH))
    await page.getByRole('button', { name: 'Remove Cat' }).click()

    await expect(page.locator(GOVUK_TABLE)).not.toContainText('Cat')
    await expect(page.locator(FIRST_ANIMALS_QUANTITY_INPUT)).toHaveValue('25')
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
    await expect(page.locator(GOVUK_TABLE)).toContainText('Dog')
    await expect(page.locator(FIRST_ANIMALS_QUANTITY_INPUT)).toHaveValue('25')
    await expect(page.locator(SECOND_ANIMALS_QUANTITY_INPUT)).toHaveValue('2')
    await expect(page.locator('#numberOfAnimalsQuantity-2')).toHaveValue('')
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const violations = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )
    expect(
      violations,
      `Consignment details has serious/critical accessibility violations.\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})

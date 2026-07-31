import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  answerCountryOfOrigin,
  journeyUrl,
  selectSpecies,
  startNotification
} from '../../../../../../e2e/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'

const openDetails = async (page) => {
  await startNotification(page)
  await answerCountryOfOrigin(page)
  await page.getByRole('link', { name: 'What are you importing?' }).click()
  await selectSpecies(page, ['Bos taurus', 'Felis catus'])
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(
    page.getByRole('heading', { name: copy.consignmentDetails.title })
  ).toBeVisible()
}

const validQuantities = ['25', '5', '2', '1']
const quantityFields = [
  ['number of animals for Bos taurus', 'numberOfAnimalsQuantity-0', '2.5'],
  ['number of packages for Bos taurus', 'numberOfPackages-0', 'boxes'],
  ['number of animals for Felis catus', 'numberOfAnimalsQuantity-1', '0'],
  ['number of packages for Felis catus', 'numberOfPackages-1', '-1']
]

const fillValidQuantities = async (page) => {
  for (const [index, field] of [
    'numberOfAnimalsQuantity-0',
    'numberOfPackages-0',
    'numberOfAnimalsQuantity-1',
    'numberOfPackages-1'
  ].entries()) {
    await page.locator(`#${field}`).fill(validQuantities[index])
  }
}

const errorFor = (field) =>
  field.startsWith('numberOfAnimals')
    ? copy.consignmentDetails.errors.animalsWholeNumber
    : copy.consignmentDetails.errors.packagesWholeNumber

test.describe('commodity consignment details', () => {
  test.beforeEach(async ({ page }) => {
    await openDetails(page)
  })

  test('renders grouped species quantities and collection table', async ({
    page
  }) => {
    const table = page.locator('.govuk-table')
    await expect(table).toContainText(copy.consignmentDetails.table.caption)
    await expect(table).toContainText(
      copy.consignmentDetails.table.commodityCode
    )
    await expect(table).toContainText('Cow')
    await expect(table).toContainText('0102')
    await expect(table).toContainText('Cat')
    await expect(table).toContainText('01061900')
    await expect(
      page.getByRole('heading', { name: 'Bos taurus' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Felis catus' })
    ).toBeVisible()
    await expect(
      page.locator('#numberOfAnimalsQuantity-0')
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
      await page.getByRole('button', { name: 'Save and continue' }).click()

      const link = page
        .getByRole('alert')
        .getByRole('link', { name: errorFor(field) })
      await expect(link).toBeVisible()
      await link.click()
      await expect(page.locator(`#${field}`)).toBeFocused()
      await expect(page.locator(`#${field}`)).toHaveValue(invalid)
      await expect(page.locator('#numberOfAnimalsQuantity-0')).toHaveValue(
        field === 'numberOfAnimalsQuantity-0' ? invalid : validQuantities[0]
      )
    })
  }

  test('saves and persists per-species counts', async ({ page }) => {
    await fillValidQuantities(page)
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await page.goto(journeyUrl(page, 'consignment-details'))
    await expect(page.locator('#numberOfAnimalsQuantity-0')).toHaveValue('25')
    await expect(page.locator('#numberOfPackages-0')).toHaveValue('5')
    await expect(page.locator('#numberOfAnimalsQuantity-1')).toHaveValue('2')
    await expect(page.locator('#numberOfPackages-1')).toHaveValue('1')
  })

  test('removes one commodity group without changing another quantity', async ({
    page
  }) => {
    await fillValidQuantities(page)
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.goto(journeyUrl(page, 'consignment-details'))
    await page.getByRole('button', { name: 'Remove Cat' }).click()

    await expect(page.locator('.govuk-table')).not.toContainText('Cat')
    await expect(page.locator('#numberOfAnimalsQuantity-0')).toHaveValue('25')
  })

  test('adds another commodity while preserving an existing quantity', async ({
    page
  }) => {
    await fillValidQuantities(page)
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.goto(journeyUrl(page, 'consignment-details'))
    await page
      .getByRole('link', { name: copy.consignmentDetails.addAnother })
      .click()
    await expect(
      page.getByRole('checkbox', { name: 'Bos taurus' })
    ).toBeChecked()
    await selectSpecies(page, ['Canis lupus familiaris'])
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.locator('.govuk-table')).toContainText('Dog')
    await expect(page.locator('#numberOfAnimalsQuantity-0')).toHaveValue('25')
    await expect(page.locator('#numberOfAnimalsQuantity-1')).toHaveValue('2')
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

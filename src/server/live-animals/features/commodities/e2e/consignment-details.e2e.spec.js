import { expect, test } from '@playwright/test'

import {
  answerCountryOfOrigin,
  journeyUrl,
  searchAndSelect,
  startNotification
} from '../../../../../../e2e/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'

const openDetails = async (page) => {
  await startNotification(page)
  await answerCountryOfOrigin(page)
  await page.getByRole('link', { name: 'What are you importing?' }).click()
  await searchAndSelect(page, 'Cow', ['Bos taurus'])
  await searchAndSelect(page, 'Cat', ['Felis catus'])
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(
    page.getByRole('heading', { name: copy.consignmentDetails.title })
  ).toBeVisible()
}

test.describe('commodity consignment details', () => {
  test('renders grouped species quantities, collection table and working back link', async ({
    page
  }) => {
    await openDetails(page)

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

    await page.locator('.govuk-back-link').click()
    await expect(
      page.getByRole('heading', { name: copy.search.title })
    ).toBeVisible()
  })

  test('shows both whole-number validation rules and preserves every quantity', async ({
    page
  }) => {
    await openDetails(page)

    await page.locator('#numberOfAnimalsQuantity-0').fill('2.5')
    await page.locator('#numberOfPackages-0').fill('boxes')
    await page.locator('#numberOfAnimalsQuantity-1').fill('0')
    await page.locator('#numberOfPackages-1').fill('-1')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(
      page.locator('#numberOfAnimalsQuantity-0-error')
    ).toContainText(copy.consignmentDetails.errors.animalsWholeNumber)
    await expect(page.locator('#numberOfPackages-0-error')).toContainText(
      copy.consignmentDetails.errors.packagesWholeNumber
    )
    await expect(
      page.locator('#numberOfAnimalsQuantity-1-error')
    ).toContainText(copy.consignmentDetails.errors.animalsWholeNumber)
    await expect(page.locator('#numberOfPackages-1-error')).toContainText(
      copy.consignmentDetails.errors.packagesWholeNumber
    )
    await expect(page.locator('#numberOfAnimalsQuantity-0')).toHaveValue('2.5')
    await expect(page.locator('#numberOfPackages-0')).toHaveValue('boxes')
    await expect(page.locator('#numberOfAnimalsQuantity-1')).toHaveValue('0')
    await expect(page.locator('#numberOfPackages-1')).toHaveValue('-1')
  })

  test('saves per-species counts, removes a commodity group and adds another', async ({
    page
  }) => {
    await openDetails(page)
    await page.locator('#numberOfAnimalsQuantity-0').fill('25')
    await page.locator('#numberOfPackages-0').fill('5')
    await page.locator('#numberOfAnimalsQuantity-1').fill('2')
    await page.locator('#numberOfPackages-1').fill('1')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await page.goto(journeyUrl(page, 'consignment-details'))
    await expect(page.locator('#numberOfAnimalsQuantity-0')).toHaveValue('25')
    await expect(page.locator('#numberOfPackages-0')).toHaveValue('5')
    await expect(page.locator('#numberOfAnimalsQuantity-1')).toHaveValue('2')
    await page.getByRole('button', { name: 'Remove Cat' }).click()
    await expect(page.locator('.govuk-table')).not.toContainText('Cat')
    await expect(page.locator('#numberOfAnimalsQuantity-0')).toHaveValue('25')

    await page
      .getByRole('link', { name: copy.consignmentDetails.addAnother })
      .click()
    await expect(
      page.getByRole('heading', { name: copy.search.selectedCount(1) })
    ).toBeVisible()
    await searchAndSelect(page, 'Dog', ['Canis lupus familiaris'])
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.locator('.govuk-table')).toContainText('Dog')
    await expect(page.locator('#numberOfAnimalsQuantity-0')).toHaveValue('25')
    await expect(page.locator('#numberOfAnimalsQuantity-1')).toHaveValue('')
  })
})

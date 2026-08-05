import { expect, test } from '@playwright/test'

import { axeViolations } from '../../axe.e2e-helper.js'
import { copy } from '../copy/copy.en.js'

const SAVE_AND_CONTINUE = 'Save and continue'

const confirmationCopy = copy.consignorConfirmation
const pickerCopy = copy.consignorPicker
const consignorName = 'Orchard Export SAS'
const confirmationUrl = (url) =>
  /^\/plant-products\/notifications\/[^/]+\/consignor-confirmation$/.test(
    url.pathname
  )
const pickerUrl = (url) =>
  /^\/plant-products\/notifications\/[^/]+\/consignor-select$/.test(
    url.pathname
  )

const rowByTitle = (page, title) =>
  page.getByRole('listitem').filter({
    has: page.getByText(title, { exact: true })
  })

const startAtConfirmation = async (page) => {
  await page.goto('/plant-products')
  await page.getByRole('button', { name: 'Create a new notification' }).click()
  await page
    .getByRole('radio', { name: 'Plants, plant products and other objects' })
    .check()
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await page.getByLabel('Country of origin').selectOption('FR')
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await page.getByRole('link', { name: 'Back', exact: true }).click()
  await rowByTitle(page, 'Commodity')
    .getByRole('link', { name: 'Commodity', exact: true })
    .click()
  await page.getByRole('radio', { name: 'Manual entry' }).check()
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await page.getByLabel('Enter commodity code').fill('06011010')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page
    .getByRole('button', {
      name: 'Add Albuca bracteata to commodity 06011010'
    })
    .click()
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

  await page.goto(page.url().replace(/\/commodity-summary$/, ''))
  await rowByTitle(page, 'Traders')
    .getByRole('link', { name: 'Traders', exact: true })
    .click()
  await page
    .getByRole('link', {
      name: copy.tradersAddresses.consignor.addLink,
      exact: true
    })
    .click()
  await page
    .getByRole('button', { name: pickerCopy.addNew, exact: true })
    .click()
  await page
    .getByLabel(copy.consignorCreate.fields.consignorName.label, {
      exact: true
    })
    .fill(consignorName)
  await page
    .getByLabel(copy.consignorCreate.fields.consignorAddressLine1.label, {
      exact: true
    })
    .fill('12 Rue des Vergers')
  await page
    .getByLabel(copy.consignorCreate.fields.consignorAddressLine2.label, {
      exact: true
    })
    .fill('Building B')
  await page
    .getByLabel(copy.consignorCreate.fields.consignorAddressLine3.label, {
      exact: true
    })
    .fill('Export Quarter')
  await page
    .getByLabel(copy.consignorCreate.fields.consignorCity.label, {
      exact: true
    })
    .fill('Lyon')
  await page
    .getByLabel(copy.consignorCreate.fields.consignorPostcode.label, {
      exact: true
    })
    .fill('69001')
  await page
    .getByLabel(copy.consignorCreate.fields.consignorTelephone.label, {
      exact: true
    })
    .fill('+33 4 72 00 00 00')
  await page
    .getByLabel(copy.consignorCreate.fields.consignorCountry.label, {
      exact: true
    })
    .selectOption('FR')
  await page
    .getByLabel(copy.consignorCreate.fields.consignorEmail.label, {
      exact: true
    })
    .fill('exports@example.com')
  await page
    .getByRole('button', {
      name: copy.consignorCreate.continueLabel,
      exact: true
    })
    .click()
  await expect(page).toHaveURL(confirmationUrl)
}

test.describe('plant-products consignor confirmation', () => {
  test.beforeEach(async ({ page }) => {
    await startAtConfirmation(page)
  })

  test('renders the confirmation panel title as the only H1 and one action', async ({
    page
  }) => {
    const headings = page.getByRole('heading', { level: 1 })
    await expect(headings).toHaveCount(1)
    await expect(headings).toHaveText(confirmationCopy.panelTitle)
    await expect(headings).toHaveClass(/govuk-panel__title/)
    await expect(
      page.getByRole('button', {
        name: confirmationCopy.continueLabel,
        exact: true
      })
    ).toHaveCount(1)
    await expect(page.locator('main form button')).toHaveCount(1)
    await expect(
      page.getByRole('link', { name: 'Return to search', exact: true })
    ).toHaveCount(0)
  })

  test('returns the already-persisted consignor to the picker, present and pre-selected', async ({
    page
  }) => {
    await page
      .getByRole('button', {
        name: confirmationCopy.continueLabel,
        exact: true
      })
      .click()

    await expect(page).toHaveURL(pickerUrl)
    await expect(
      page.getByRole('radio', {
        name: `${pickerCopy.selectRowPrefix} ${consignorName}`,
        exact: true
      })
    ).toBeChecked()
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    const { all, seriousOrCritical } = await axeViolations(page)
    expect(
      seriousOrCritical,
      `Consignor confirmation has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(all, null, 2)}`
    ).toEqual([])
  })
})

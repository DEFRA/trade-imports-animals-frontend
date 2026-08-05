import { expect, test } from '@playwright/test'

import { axeViolations as seriousOrCriticalViolations } from '../axe.e2e-helper.js'
import { grossVolumeUnitOptions } from '../../../../services/reference/gross-volume-units.js'
import { copy } from './copy/copy.en.js'

const SAVE_AND_CONTINUE = 'Save and continue'
const ADDITIONAL_DETAILS = 'Additional details'

const hubUrl = (url) =>
  /^\/plant-products\/notifications\/[^/]+$/.test(url.pathname)
const detailsUrl = (url) =>
  /^\/plant-products\/notifications\/[^/]+\/commodity-additional-details$/.test(
    url.pathname
  )

const rowByTitle = (page, title) =>
  page.getByRole('listitem').filter({
    has: page.getByText(title, { exact: true })
  })

const startAtAdditionalDetails = async (page) => {
  await page.goto('/plant-products')
  await page.getByRole('button', { name: 'Create a new notification' }).click()
  await page
    .getByRole('radio', { name: 'Plants, plant products and other objects' })
    .check()
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await page.getByLabel('Country of origin').selectOption('FR')
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await page.getByRole('link', { name: 'Back', exact: true }).click()
  await page.getByRole('link', { name: 'Commodity', exact: true }).click()
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
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await page.getByLabel('Number of packages for 06011010 Hyacinths').fill('2')
  await page
    .getByLabel('Type of package for 06011010 Hyacinths')
    .selectOption('BOX')
  await page.getByLabel('Quantity for 06011010 Hyacinths').fill('1')
  await page
    .getByLabel('Quantity type for 06011010 Hyacinths')
    .selectOption('BULBS')
  await page.getByLabel('Net weight (kg) for 06011010 Hyacinths').fill('1')
  await page
    .getByRole('group', {
      name: 'How will the commodity be used? for 06011010 Hyacinths'
    })
    .getByLabel('Finished product for final users for 06011010 Hyacinths')
    .check()
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await expect(page).toHaveURL(hubUrl)

  const row = rowByTitle(page, ADDITIONAL_DETAILS)
  await expect(row).toContainText('Not yet started')
  await row.getByRole('link', { name: ADDITIONAL_DETAILS }).click()
  await expect(page).toHaveURL(detailsUrl)
}

const controls = (page) => ({
  totalGrossWeight: page.getByLabel(copy.fields.totalGrossWeight.label),
  grossVolume: page.getByLabel(copy.fields.grossVolume.label),
  grossVolumeUnit: page.getByLabel(copy.fields.grossVolumeUnit.label, {
    exact: true
  })
})

const fillValues = async (
  page,
  { totalGrossWeight = '2', grossVolume = '5', grossVolumeUnit = 'LITRES' } = {}
) => {
  const fields = controls(page)
  await fields.totalGrossWeight.fill(totalGrossWeight)
  await fields.grossVolume.fill(grossVolume)
  await fields.grossVolumeUnit.selectOption(grossVolumeUnit)
}

const expectLinkedError = async (page, field, message) => {
  const alert = page.getByRole('alert')
  await expect(alert).toContainText('There is a problem')
  const link = alert.getByRole('link', { name: message })
  await expect(link).toHaveAttribute('href', `#${field}`)
  await link.click()
  await expect(page.locator(`#${field}`)).toBeFocused()
  await expect(page.locator(`#${field}-error`)).toContainText(message)
}

test.describe('plant-products commodity additional details', () => {
  test('renders derived totals, accessibly named controls and the complete fixture option list', async ({
    page
  }) => {
    await startAtAdditionalDetails(page)

    await expect(page.getByText(copy.caption, { exact: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: copy.heading })
    ).toBeVisible()
    const netRow = page.locator('.govuk-summary-list__row').filter({
      hasText: copy.totals.netWeightLabel
    })
    const packagesRow = page.locator('.govuk-summary-list__row').filter({
      hasText: copy.totals.packagesLabel
    })
    await expect(netRow).toContainText('1')
    await expect(packagesRow).toContainText('2')

    const fields = controls(page)
    await expect(fields.totalGrossWeight).toHaveAccessibleName(
      copy.fields.totalGrossWeight.label
    )
    await expect(fields.totalGrossWeight).toHaveAttribute(
      'inputmode',
      'numeric'
    )
    await expect(fields.totalGrossWeight).toHaveClass(/govuk-!-width-one-half/)
    await expect(fields.grossVolume).toHaveAccessibleName(
      copy.fields.grossVolume.label
    )
    await expect(fields.grossVolume).toHaveAttribute('inputmode', 'numeric')
    await expect(fields.grossVolumeUnit).toHaveAccessibleName(
      copy.fields.grossVolumeUnit.label
    )
    expect(
      await fields.grossVolumeUnit.locator('option').evaluateAll((options) =>
        options.map(({ value, textContent }) => ({
          value,
          text: textContent.trim()
        }))
      )
    ).toEqual([
      { value: '', text: copy.fields.grossVolumeUnit.placeholder },
      ...grossVolumeUnitOptions.map(({ value, text }) => ({ value, text }))
    ])
  })

  test('saves canonical values, completes the hub row and reloads every field', async ({
    page
  }) => {
    await startAtAdditionalDetails(page)
    const url = page.url()
    await fillValues(page, {
      totalGrossWeight: '2.50',
      grossVolume: '8.00',
      grossVolumeUnit: 'METRES_CUBED'
    })
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await expect(page).toHaveURL(hubUrl)
    await expect(rowByTitle(page, ADDITIONAL_DETAILS)).toContainText(
      'Completed'
    )
    await page.goto(url)
    await expect(controls(page).totalGrossWeight).toHaveValue('2.50')
    await expect(controls(page).grossVolume).toHaveValue('8.00')
    await expect(controls(page).grossVolumeUnit).toHaveValue('METRES_CUBED')
  })

  const validationCases = [
    {
      name: 'total gross weight required',
      values: { totalGrossWeight: '' },
      field: 'totalGrossWeight',
      message: copy.errors.totalGrossWeightRequired
    },
    {
      name: 'total gross weight numeric',
      values: { totalGrossWeight: 'raw-weight' },
      field: 'totalGrossWeight',
      message: copy.errors.totalGrossWeightNumber
    },
    {
      name: 'total gross weight greater than net weight',
      values: { totalGrossWeight: '1' },
      field: 'totalGrossWeight',
      message: copy.errors.totalGrossWeightGreaterThanNet
    },
    {
      name: 'total gross weight decimal places',
      values: { totalGrossWeight: '2.123456' },
      field: 'totalGrossWeight',
      message: copy.errors.totalGrossWeightDecimalPlaces
    },
    {
      name: 'gross volume numeric',
      values: { grossVolume: 'raw-volume' },
      field: 'grossVolume',
      message: copy.errors.grossVolumeNumber
    },
    {
      name: 'gross volume required when unit is selected',
      values: { grossVolume: '', grossVolumeUnit: 'LITRES' },
      field: 'grossVolume',
      message: copy.errors.grossVolumeRequiredWithUnit
    },
    {
      name: 'gross volume unit required when volume is entered',
      values: { grossVolume: '5', grossVolumeUnit: '' },
      field: 'grossVolumeUnit',
      message: copy.errors.grossVolumeUnitRequired
    }
  ]

  for (const testCase of validationCases) {
    test(`${testCase.name}: preserves raw values and focuses its control`, async ({
      page
    }) => {
      await startAtAdditionalDetails(page)
      const values = {
        totalGrossWeight: '2',
        grossVolume: '5',
        grossVolumeUnit: 'LITRES',
        ...testCase.values
      }
      await fillValues(page, values)
      await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

      await expectLinkedError(page, testCase.field, testCase.message)
      await expect(controls(page).totalGrossWeight).toHaveValue(
        values.totalGrossWeight
      )
      await expect(controls(page).grossVolume).toHaveValue(values.grossVolume)
      await expect(controls(page).grossVolumeUnit).toHaveValue(
        values.grossVolumeUnit
      )
    })
  }

  test('clearing gross volume purges the previously stored unit', async ({
    page
  }) => {
    await startAtAdditionalDetails(page)
    const url = page.url()
    await fillValues(page)
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await page.goto(url)

    await controls(page).grossVolume.fill('')
    await controls(page).grossVolumeUnit.selectOption('')
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await page.goto(url)

    await expect(controls(page).grossVolume).toHaveValue('')
    await expect(controls(page).grossVolumeUnit).toHaveValue('')
  })

  test('initial page has no serious or critical axe violations', async ({
    page
  }) => {
    await startAtAdditionalDetails(page)
    const { all, seriousOrCritical } = await seriousOrCriticalViolations(page)

    expect(
      seriousOrCritical,
      `Additional-details page has serious/critical accessibility violations.\n${JSON.stringify(all, null, 2)}`
    ).toEqual([])
  })

  test('validation-error page has no serious or critical axe violations', async ({
    page
  }) => {
    await startAtAdditionalDetails(page)
    await fillValues(page, { totalGrossWeight: '' })
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    const { all, seriousOrCritical } = await seriousOrCriticalViolations(page)

    expect(
      seriousOrCritical,
      `Additional-details error state has serious/critical accessibility violations.\n${JSON.stringify(all, null, 2)}`
    ).toEqual([])
  })
})

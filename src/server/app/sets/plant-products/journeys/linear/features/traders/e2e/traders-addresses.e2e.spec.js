import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { copy } from '../copy/copy.en.js'

const pageCopy = copy.tradersAddresses
const hubUrl = (url) =>
  /^\/plant-products\/notifications\/[^/]+$/.test(url.pathname)
const tradersUrl = (url) =>
  /^\/plant-products\/notifications\/[^/]+\/traders-addresses$/.test(
    url.pathname
  )

const rowByTitle = (page, title) =>
  page.getByRole('listitem').filter({
    has: page.getByText(title, { exact: true })
  })

const startAtTraders = async (page) => {
  await page.goto('/plant-products')
  await page.getByRole('button', { name: 'Create a new notification' }).click()
  await page
    .getByRole('radio', { name: 'Plants, plant products and other objects' })
    .check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Country of origin').selectOption('FR')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByRole('link', { name: 'Back', exact: true }).click()
  await rowByTitle(page, 'Commodity')
    .getByRole('link', { name: 'Commodity', exact: true })
    .click()
  await page.getByRole('radio', { name: 'Manual entry' }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Enter commodity code').fill('06011010')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page
    .getByRole('button', {
      name: 'Add Albuca bracteata to commodity 06011010'
    })
    .click()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page).toHaveURL((url) =>
    /\/commodity-summary$/.test(url.pathname)
  )

  const notificationUrl = page.url().replace(/\/commodity-summary$/, '')
  await page.goto(notificationUrl)
  const row = rowByTitle(page, 'Traders')
  await expect(row).toContainText('Not yet started')
  await row.getByRole('link', { name: 'Traders', exact: true }).click()
  await expect(page).toHaveURL(tradersUrl)

  return { notificationUrl, pageUrl: page.url() }
}

const deliveryGroup = (page) =>
  page.getByRole('group', { name: pageCopy.delivery.legend, exact: true })

const submit = (page) =>
  page.getByRole('button', { name: pageCopy.continue, exact: true }).click()

const enteredDestination = {
  destinationName: 'Paris Produce Market',
  destinationAddressLine1: '10 Rue des Plantes',
  destinationAddressLine2: 'Building 2',
  destinationAddressLine3: 'Wholesale Quarter',
  destinationCity: 'Paris',
  destinationPostcode: '75001',
  destinationCountry: 'FR'
}

const enteredPacker = {
  packerName: 'Packing SARL',
  packerAddressLine1: '20 Rue du Colis',
  packerAddressLine2: 'Unit 4',
  packerAddressLine3: 'Industrial Quarter',
  packerCity: 'Calais',
  packerPostcode: '62100',
  packerCountry: 'FR'
}

const fillFields = async (page, fields) => {
  for (const [field, value] of Object.entries(fields)) {
    const control = page.locator(`#${field}`)
    if (field.endsWith('Country')) await control.selectOption(value)
    else await control.fill(value)
  }
}

const selectEnteredDestination = async (page) => {
  await deliveryGroup(page)
    .getByRole('radio', { name: pageCopy.delivery.options.no, exact: true })
    .check()
  await fillFields(page, enteredDestination)
}

const expectLinkedError = async (page, field, message) => {
  const alert = page.getByRole('alert')
  await expect(alert).toContainText('There is a problem')
  const link = alert.getByRole('link', { name: message, exact: true })
  await expect(link).toHaveAttribute('href', `#${field}`)
  await link.click()
  await expect(page.locator(`#${field}`)).toBeFocused()
}

const expectAxeClean = async (page, state) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  const seriousOrCritical = results.violations.filter(
    ({ id, impact, nodes }) => {
      const stockConditionalRadioFalsePositive =
        id === 'aria-allowed-attr' &&
        nodes.every(
          ({ html, target }) =>
            html.includes('class="govuk-radios__input"') &&
            html.includes(
              'aria-controls="conditional-destinationSameAsConsignee-2"'
            ) &&
            target.length === 1 &&
            target[0] === '#destinationSameAsConsignee-2'
        )
      return (
        ['serious', 'critical'].includes(impact) &&
        !stockConditionalRadioFalsePositive
      )
    }
  )

  expect(
    seriousOrCritical,
    `Traders addresses ${state} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

const requiredValidationCases = [
  [
    'radio missing',
    'destinationSameAsConsignee',
    pageCopy.errors.destinationSameAsConsignee
  ],
  ['delivery name missing', 'destinationName', pageCopy.errors.destinationName],
  [
    'address line 1 missing',
    'destinationAddressLine1',
    pageCopy.errors.destinationAddressLine1
  ],
  ['town or city missing', 'destinationCity', pageCopy.errors.destinationCity],
  [
    'postcode missing',
    'destinationPostcode',
    pageCopy.errors.destinationPostcode
  ],
  ['country missing', 'destinationCountry', pageCopy.errors.destinationCountry]
]

test.describe('plant-products traders addresses', () => {
  test.beforeEach(async ({ page }) => {
    await startAtTraders(page)
  })

  test('renders four party areas, accessible names and no empty or bespoke table UI', async ({
    page
  }) => {
    await expect(
      page.getByText(pageCopy.caption, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: pageCopy.heading,
        exact: true
      })
    ).toBeVisible()
    await expect(
      page.getByRole('main').getByRole('heading', { level: 2 })
    ).toHaveText([
      pageCopy.importer.heading,
      pageCopy.packer.heading,
      pageCopy.delivery.heading,
      pageCopy.consignor.heading
    ])
    const importer = page.locator('.govuk-summary-list')
    await expect(importer).toHaveCount(1)
    await expect(importer).toContainText('Stubbed organisation')
    await expect(importer.locator('.govuk-summary-list__actions')).toHaveCount(
      0
    )
    await expect(page.locator('table')).toHaveCount(0)
    await expect(page.locator('.trader-table, .table-responsive')).toHaveCount(
      0
    )
    await expect(deliveryGroup(page)).toHaveAccessibleName(
      pageCopy.delivery.legend
    )
    await expect(
      deliveryGroup(page).getByRole('radio', {
        name: pageCopy.delivery.options.yes,
        exact: true
      })
    ).toBeVisible()
    await expect(page.locator('#destinationName')).toBeHidden()
    for (const field of Object.keys(enteredPacker)) {
      await expect(page.locator(`#${field}`)).toBeVisible()
    }
    const consignorLink = page.getByRole('link', {
      name: pageCopy.consignor.addLink,
      exact: true
    })
    await expect(consignorLink).toHaveAccessibleName(pageCopy.consignor.addLink)
    await expect(consignorLink).toHaveAttribute(
      'href',
      /^\/plant-products\/notifications\/[^/]+\/consignor-create$/
    )
  })

  test('saves same as importer, completes the row and re-derives Yes on reload', async ({
    page
  }) => {
    const pageUrl = page.url()
    await deliveryGroup(page)
      .getByRole('radio', { name: pageCopy.delivery.options.yes, exact: true })
      .check()
    await submit(page)

    await expect(page).toHaveURL(hubUrl)
    await expect(rowByTitle(page, 'Traders')).toContainText('Completed')
    await page.goto(pageUrl)
    await expect(
      deliveryGroup(page).getByRole('radio', {
        name: pageCopy.delivery.options.yes,
        exact: true
      })
    ).toBeChecked()
    await expect(page.locator('#destinationName')).toBeHidden()
  })

  test('saves and reloads every entered destination field', async ({
    page
  }) => {
    const pageUrl = page.url()
    await selectEnteredDestination(page)
    await submit(page)

    await expect(page).toHaveURL(hubUrl)
    await expect(rowByTitle(page, 'Traders')).toContainText('Completed')
    await page.goto(pageUrl)
    await expect(
      deliveryGroup(page).getByRole('radio', {
        name: pageCopy.delivery.options.no,
        exact: true
      })
    ).toBeChecked()
    for (const [field, value] of Object.entries(enteredDestination)) {
      await expect(page.locator(`#${field}`)).toHaveValue(value)
    }
  })

  for (const [name, field, message] of requiredValidationCases) {
    test(`validation: ${name} preserves values and focuses the named control`, async ({
      page
    }) => {
      if (field !== 'destinationSameAsConsignee') {
        await selectEnteredDestination(page)
        if (field === 'destinationCountry') {
          await page.locator('#destinationCountry').selectOption('')
        } else {
          await page.locator(`#${field}`).fill('')
        }
      }
      await fillFields(page, enteredPacker)
      await submit(page)

      await expectLinkedError(page, field, message)
      for (const [packerField, value] of Object.entries(enteredPacker)) {
        await expect(page.locator(`#${packerField}`)).toHaveValue(value)
      }
      if (field !== 'destinationSameAsConsignee') {
        for (const [destinationField, value] of Object.entries(
          enteredDestination
        )) {
          if (destinationField !== field) {
            await expect(page.locator(`#${destinationField}`)).toHaveValue(
              value
            )
          }
        }
      }
    })
  }

  test('purges every destination value when the saved branch flips to Yes', async ({
    page
  }) => {
    const pageUrl = page.url()
    await selectEnteredDestination(page)
    await submit(page)
    await page.goto(pageUrl)
    await deliveryGroup(page)
      .getByRole('radio', { name: pageCopy.delivery.options.yes, exact: true })
      .check()
    await submit(page)
    await page.goto(pageUrl)
    await deliveryGroup(page)
      .getByRole('radio', { name: pageCopy.delivery.options.no, exact: true })
      .check()

    for (const field of Object.keys(enteredDestination)) {
      await expect(page.locator(`#${field}`)).toHaveValue('')
    }
  })

  test('packer is optional, round-trips when entered and never changes completion', async ({
    page
  }) => {
    const pageUrl = page.url()
    await deliveryGroup(page)
      .getByRole('radio', { name: pageCopy.delivery.options.yes, exact: true })
      .check()
    await submit(page)
    await expect(rowByTitle(page, 'Traders')).toContainText('Completed')
    await page.goto(pageUrl)
    await fillFields(page, enteredPacker)
    await submit(page)
    await expect(rowByTitle(page, 'Traders')).toContainText('Completed')
    await page.goto(pageUrl)
    for (const [field, value] of Object.entries(enteredPacker)) {
      await expect(page.locator(`#${field}`)).toHaveValue(value)
    }
  })

  test('has no serious or critical axe violations initially and after validation', async ({
    page
  }) => {
    await expectAxeClean(page, 'initial state')
    await submit(page)
    await expect(page.getByRole('alert')).toBeVisible()
    await expectAxeClean(page, 'validation state')
  })
})

import { expect, test } from '@playwright/test'

import { axeViolations } from '../../axe.e2e-helper.js'
import {
  countryOptions,
  ukSubdivisionOptions
} from '../../../../../services/reference/countries.js'
import { copy } from '../copy/copy.en.js'

const pageCopy = copy.consignorCreate
const createUrl = (url) =>
  /^\/plant-products\/notifications\/[^/]+\/consignor-create$/.test(
    url.pathname
  )
const confirmationUrl = (url) =>
  /^\/plant-products\/notifications\/[^/]+\/consignor-confirmation$/.test(
    url.pathname
  )
const tradersUrl = (url) =>
  /^\/plant-products\/notifications\/[^/]+\/traders-addresses$/.test(
    url.pathname
  )
const pickerUrl = (url) =>
  /^\/plant-products\/notifications\/[^/]+\/consignor-select$/.test(
    url.pathname
  )
const hubUrl = (url) =>
  /^\/plant-products\/notifications\/[^/]+$/.test(url.pathname)

const rowByTitle = (page, title) =>
  page.getByRole('listitem').filter({
    has: page.getByText(title, { exact: true })
  })

const openCreateFromPicker = async (page) => {
  await page
    .getByRole('button', { name: copy.consignorPicker.addNew, exact: true })
    .click()
  await expect(page).toHaveURL(createUrl)
}

const startAtConsignorCreate = async (page) => {
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

  const notificationUrl = page.url().replace(/\/commodity-summary$/, '')
  await page.goto(notificationUrl)
  await rowByTitle(page, 'Traders')
    .getByRole('link', { name: 'Traders', exact: true })
    .click()
  await page
    .getByRole('link', {
      name: copy.tradersAddresses.consignor.addLink,
      exact: true
    })
    .click()
  await expect(page).toHaveURL(pickerUrl)
  await openCreateFromPicker(page)

  return { notificationUrl, pageUrl: page.url() }
}

const controls = (page) => ({
  consignorName: page.getByLabel(pageCopy.fields.consignorName.label, {
    exact: true
  }),
  consignorAddressLine1: page.getByLabel(
    pageCopy.fields.consignorAddressLine1.label,
    { exact: true }
  ),
  consignorAddressLine2: page.getByLabel(
    pageCopy.fields.consignorAddressLine2.label,
    { exact: true }
  ),
  consignorAddressLine3: page.getByLabel(
    pageCopy.fields.consignorAddressLine3.label,
    { exact: true }
  ),
  consignorCity: page.getByLabel(pageCopy.fields.consignorCity.label, {
    exact: true
  }),
  consignorPostcode: page.getByLabel(pageCopy.fields.consignorPostcode.label, {
    exact: true
  }),
  consignorTelephone: page.getByLabel(
    pageCopy.fields.consignorTelephone.label,
    { exact: true }
  ),
  consignorCountry: page.getByLabel(pageCopy.fields.consignorCountry.label, {
    exact: true
  }),
  consignorEmail: page.getByLabel(pageCopy.fields.consignorEmail.label, {
    exact: true
  })
})

const enteredValues = {
  consignorName: 'Orchard Export SAS',
  consignorAddressLine1: '12 Rue des Vergers',
  consignorAddressLine2: 'Building B',
  consignorAddressLine3: 'Export Quarter',
  consignorCity: 'Lyon',
  consignorPostcode: '69001',
  consignorTelephone: '+33 4 72 00 00 00',
  consignorCountry: 'FR',
  consignorEmail: 'exports@example.com'
}

const fillValues = async (page, overrides = {}) => {
  const values = { ...enteredValues, ...overrides }
  const fields = controls(page)
  for (const [field, value] of Object.entries(values)) {
    if (field === 'consignorCountry') {
      await fields[field].selectOption(value)
    } else {
      await fields[field].fill(value)
    }
  }
}

const submit = (page) =>
  page
    .getByRole('button', { name: pageCopy.continueLabel, exact: true })
    .click()

const expectLinkedError = async (page, field, message) => {
  const alert = page.getByRole('alert')
  await expect(alert).toContainText('There is a problem')
  const link = alert.getByRole('link', { name: message, exact: true })
  await expect(link).toHaveAttribute('href', `#${field}`)
  await link.click()
  await expect(page.locator(`#${field}`)).toBeFocused()
  await expect(page.locator(`#${field}-error`)).toContainText(message)
}

const expectAccessibleNames = async (page) => {
  const fields = controls(page)
  for (const [field, control] of Object.entries(fields)) {
    await expect(control).toHaveAccessibleName(pageCopy.fields[field].label)
  }
  await expect(
    page.getByRole('group', { name: pageCopy.legend, exact: true })
  ).toHaveAccessibleName(pageCopy.legend)
}

const expectAxeClean = async (page, state) => {
  const { all, seriousOrCritical } = await axeViolations(page)
  expect(
    seriousOrCritical,
    `Consignor create ${state} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(all, null, 2)}`
  ).toEqual([])
}

const validationCases = [
  {
    name: 'name required',
    values: { consignorName: '' },
    field: 'consignorName',
    message: pageCopy.errors.consignorName.required
  },
  {
    name: 'name maximum',
    values: { consignorName: 'N'.repeat(256) },
    field: 'consignorName',
    message: pageCopy.errors.consignorName.max
  },
  {
    name: 'address line 1 required',
    values: { consignorAddressLine1: '' },
    field: 'consignorAddressLine1',
    message: pageCopy.errors.consignorAddressLine1.required
  },
  {
    name: 'address line 1 maximum',
    values: { consignorAddressLine1: 'A'.repeat(256) },
    field: 'consignorAddressLine1',
    message: pageCopy.errors.consignorAddressLine1.max
  },
  {
    name: 'address line 2 maximum',
    values: { consignorAddressLine2: 'A'.repeat(256) },
    field: 'consignorAddressLine2',
    message: pageCopy.errors.consignorAddressLine2.max
  },
  {
    name: 'address line 3 maximum',
    values: { consignorAddressLine3: 'A'.repeat(256) },
    field: 'consignorAddressLine3',
    message: pageCopy.errors.consignorAddressLine3.max
  },
  {
    name: 'city required',
    values: { consignorCity: '' },
    field: 'consignorCity',
    message: pageCopy.errors.consignorCity.required
  },
  {
    name: 'city maximum',
    values: { consignorCity: 'C'.repeat(59) },
    field: 'consignorCity',
    message: pageCopy.errors.consignorCity.max
  },
  {
    name: 'postcode maximum',
    values: { consignorPostcode: 'P'.repeat(33) },
    field: 'consignorPostcode',
    message: pageCopy.errors.consignorPostcode.max
  },
  {
    name: 'telephone required',
    values: { consignorTelephone: '' },
    field: 'consignorTelephone',
    message: pageCopy.errors.consignorTelephone.required
  },
  {
    name: 'telephone maximum',
    values: { consignorTelephone: '1'.repeat(31) },
    field: 'consignorTelephone',
    message: pageCopy.errors.consignorTelephone.max
  },
  {
    name: 'country placeholder',
    values: { consignorCountry: '' },
    field: 'consignorCountry',
    message: pageCopy.errors.consignorCountry.required
  },
  {
    name: 'email required',
    values: { consignorEmail: '' },
    field: 'consignorEmail',
    message: pageCopy.errors.consignorEmail.required
  },
  {
    name: 'email format',
    values: { consignorEmail: 'not-an-email' },
    field: 'consignorEmail',
    message: pageCopy.errors.consignorEmail.format
  },
  {
    name: 'email maximum',
    values: { consignorEmail: `${'a'.repeat(244)}@example.com` },
    field: 'consignorEmail',
    message: pageCopy.errors.consignorEmail.max
  }
]

test.describe('plant-products consignor create', () => {
  test.beforeEach(async ({ page }) => {
    await startAtConsignorCreate(page)
  })

  test('renders the required field hierarchy, accessible controls and complete fixture option order', async ({
    page
  }) => {
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: pageCopy.heading,
        exact: true
      })
    ).toBeVisible()
    await expect(
      page.getByRole('group', { name: pageCopy.legend, exact: true })
    ).toBeVisible()
    await expectAccessibleNames(page)

    const fields = controls(page)
    await expect(fields.consignorName).toHaveAttribute(
      'autocomplete',
      'organization'
    )
    await expect(fields.consignorAddressLine1).toHaveAttribute(
      'autocomplete',
      'address-line1'
    )
    await expect(fields.consignorAddressLine2).toHaveAttribute(
      'autocomplete',
      'address-line2'
    )
    await expect(fields.consignorAddressLine3).toHaveAttribute(
      'autocomplete',
      'address-line3'
    )
    await expect(fields.consignorCity).toHaveAttribute(
      'autocomplete',
      'address-level2'
    )
    await expect(fields.consignorPostcode).toHaveAttribute(
      'autocomplete',
      'postal-code'
    )
    await expect(fields.consignorTelephone).toHaveAttribute('type', 'tel')
    await expect(fields.consignorTelephone).toHaveAttribute(
      'autocomplete',
      'tel'
    )
    await expect(fields.consignorEmail).toHaveAttribute('type', 'email')
    await expect(fields.consignorEmail).toHaveAttribute('autocomplete', 'email')
    for (const control of Object.values(fields)) {
      await expect(control).toHaveClass(/govuk-!-width-one-half/)
      await expect(control).not.toHaveAttribute('title')
    }

    const expectedTexts = [
      pageCopy.fields.consignorCountry.placeholder,
      ...ukSubdivisionOptions().map(({ text }) => text),
      '──────────',
      ...countryOptions().map(({ text }) => text)
    ]
    await expect(fields.consignorCountry.locator('option')).toHaveText(
      expectedTexts
    )
    await expect(
      fields.consignorCountry.locator('option', {
        hasText: 'Republic of Ireland'
      })
    ).toHaveAttribute('value', 'IE')
    await expect(
      fields.consignorCountry.locator('option[value="GB-ENG"]')
    ).toHaveText('England')
    await expect(
      fields.consignorCountry.locator('option', { hasText: '──────────' })
    ).toBeDisabled()
    await expect(
      fields.consignorCountry.locator('option', {
        hasText: 'United Kingdom'
      })
    ).toHaveCount(0)
    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute(
      'href',
      /^\/plant-products\/notifications\/[^/]+\/consignor-select$/
    )
  })

  test('persists the consignor, confirms it, renders its name and completes the traders row only after addresses are saved', async ({
    page
  }) => {
    await fillValues(page)
    await submit(page)
    await expect(page).toHaveURL(confirmationUrl)
    await page
      .getByRole('button', {
        name: copy.consignorConfirmation.continueLabel,
        exact: true
      })
      .click()
    await expect(page).toHaveURL(pickerUrl)
    await page
      .getByRole('button', {
        name: copy.consignorPicker.saveAndContinue,
        exact: true
      })
      .click()
    await expect(page).toHaveURL(tradersUrl)
    await expect(
      page.getByText(enteredValues.consignorName, { exact: true })
    ).toBeVisible()

    await page
      .getByRole('radio', {
        name: copy.tradersAddresses.delivery.options.yes,
        exact: true
      })
      .check()
    await page
      .getByRole('button', { name: 'Save and return to hub', exact: true })
      .click()
    await expect(page).toHaveURL(hubUrl)
    await expect(rowByTitle(page, 'Traders')).toContainText('Completed')
  })

  test('reloads every persisted value after the create save', async ({
    page
  }) => {
    const pageUrl = page.url()
    await fillValues(page)
    await submit(page)
    await expect(page).toHaveURL(confirmationUrl)
    await page.goto(`${pageUrl}?change=1`)

    const fields = controls(page)
    for (const [field, value] of Object.entries(enteredValues)) {
      await expect(fields[field]).toHaveValue(value)
    }
  })

  test('abandoning the form persists no half-written consignor', async ({
    page
  }) => {
    const notificationUrl = page.url().replace(/\/consignor-create$/, '')
    await fillValues(page)
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    await expect(page).toHaveURL(pickerUrl)
    await page.goto(notificationUrl)
    await expect(page).toHaveURL(hubUrl)
    await expect(rowByTitle(page, 'Traders')).toContainText('Not yet started')
    await rowByTitle(page, 'Traders')
      .getByRole('link', { name: 'Traders', exact: true })
      .click()
    await page
      .getByRole('link', {
        name: copy.tradersAddresses.consignor.addLink,
        exact: true
      })
      .click()
    await openCreateFromPicker(page)

    for (const control of Object.values(controls(page))) {
      await expect(control).toHaveValue('')
    }
  })

  for (const testCase of validationCases) {
    test(`validation: ${testCase.name} preserves raw values and focuses its control`, async ({
      page
    }) => {
      await fillValues(page, testCase.values)
      await submit(page)

      await expectLinkedError(page, testCase.field, testCase.message)
      for (const [field, value] of Object.entries({
        ...enteredValues,
        ...testCase.values
      })) {
        await expect(controls(page)[field]).toHaveValue(value)
      }
    })
  }

  test('rejects a forged country code through the same canonical country error', async ({
    page
  }) => {
    await fillValues(page)
    await controls(page).consignorCountry.evaluate((select) => {
      const forged = document.createElement('option')
      forged.value = 'ZZ'
      forged.text = 'Forged country'
      select.append(forged)
    })
    await controls(page).consignorCountry.selectOption('ZZ')
    await submit(page)

    await expectLinkedError(
      page,
      'consignorCountry',
      pageCopy.errors.consignorCountry.required
    )
    await expect(controls(page).consignorCountry).toHaveValue('')
  })

  test('every simultaneous error-summary link focuses its corresponding control', async ({
    page
  }) => {
    await fillValues(page, {
      consignorName: '',
      consignorAddressLine1: '',
      consignorCity: '',
      consignorTelephone: '',
      consignorCountry: '',
      consignorEmail: ''
    })
    await submit(page)

    for (const [field, error] of [
      ['consignorName', pageCopy.errors.consignorName.required],
      ['consignorAddressLine1', pageCopy.errors.consignorAddressLine1.required],
      ['consignorCity', pageCopy.errors.consignorCity.required],
      ['consignorTelephone', pageCopy.errors.consignorTelephone.required],
      ['consignorCountry', pageCopy.errors.consignorCountry.required],
      ['consignorEmail', pageCopy.errors.consignorEmail.required]
    ]) {
      await expectLinkedError(page, field, error)
    }
  })

  test('initial and validation states have computed names and no serious or critical axe violations', async ({
    page
  }) => {
    await expectAccessibleNames(page)
    await expectAxeClean(page, 'initial state')
    await fillValues(page, {
      consignorName: '',
      consignorAddressLine1: '',
      consignorCity: '',
      consignorTelephone: '',
      consignorCountry: '',
      consignorEmail: ''
    })
    await submit(page)
    await expect(page.getByRole('alert')).toBeVisible()
    await expectAccessibleNames(page)
    await expectAxeClean(page, 'validation state')
  })
})

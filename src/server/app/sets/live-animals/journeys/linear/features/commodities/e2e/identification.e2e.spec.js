import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  answerCountryOfOrigin,
  selectSpecies,
  startNotification
} from '../../../../../../../../../../e2e/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'

const addLines = async (page, selections, counts = []) => {
  await startNotification(page)
  await answerCountryOfOrigin(page)
  await page.getByRole('link', { name: 'What are you importing?' }).click()
  for (const [, species] of selections) {
    await selectSpecies(page, species)
  }
  await page.getByRole('button', { name: 'Save and continue' }).click()
  for (const [index, count] of counts.entries()) {
    if (count !== undefined) {
      await page.locator(`#numberOfAnimalsQuantity-${index}`).fill(count)
    }
  }
}

const openIdentification = async (page, selections, counts = []) => {
  await addLines(page, selections, counts)
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByRole('link', { name: copy.identification.title }).click()
  await expect(
    page.getByRole('heading', { name: copy.identification.title })
  ).toBeVisible()
}

const errorLink = (page, message) =>
  page.locator('.govuk-error-summary').getByRole('link', { name: message })

const seriousOrCritical = (violations) =>
  violations
    .filter(({ impact }) => ['serious', 'critical'].includes(impact))
    .filter(
      (violation) =>
        !(
          violation.id === 'aria-allowed-attr' &&
          violation.nodes.every((node) =>
            /govuk-(radios|checkboxes)__input/.test(node.html)
          )
        )
    )

const expectAxeClean = async (page, name) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(
    seriousOrCritical(results.violations),
    `${name} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

const validCatAddress = {
  nameOrOrganisationName: 'Pet Owner',
  addressLine1: '1 Farm Lane',
  addressLine2: 'Apartment 2',
  townOrCity: 'Skipton',
  county: 'North Yorkshire',
  postalOrZipCode: 'BD23 1UD',
  country: 'United Kingdom',
  telephoneNumber: '+44 1756 555 0192',
  emailAddress: 'owner@example.co.uk'
}

const fillCatRecord = async (page, address = validCatAddress) => {
  await page.locator('#animalIdentifierPassport-0').fill('UK123456789')
  for (const [field, value] of Object.entries(address)) {
    const control = page.locator(`#${field}-0`)
    if (field === 'country') await control.selectOption(value)
    else await control.fill(value)
  }
}

const submitAdd = (page) =>
  page
    .getByRole('button', { name: copy.identification.saveAndAddAnother })
    .click()

const identifierValidations = [
  ['Cow', 'Bos taurus', 'animalIdentifierPassport', 'Passport'],
  ['Cow', 'Bos taurus', 'animalIdentifierTattoo', 'Tattoo'],
  ['Cow', 'Bos taurus', 'animalIdentifierEarTag', 'Ear tag'],
  ['Horse', 'Equus caballus', 'horseName', 'Horse name'],
  [
    'Fish',
    'Salmo salar',
    'animalIdentifierIdentificationDetails',
    'Identification details'
  ],
  ['Fish', 'Salmo salar', 'animalIdentifierDescription', 'Description']
]

const requiredAddressValidations = [
  ['name or organisation name', 'nameOrOrganisationName'],
  ['address line 1', 'addressLine1'],
  ['town or city', 'townOrCity'],
  ['postal or zip code', 'postalOrZipCode'],
  ['country', 'country'],
  ['telephone number', 'telephoneNumber'],
  ['email address', 'emailAddress']
]

const addressFormatValidations = [
  [
    'name or organisation name over 255 characters',
    'nameOrOrganisationName',
    'N'.repeat(256)
  ],
  ['address line 1 over 255 characters', 'addressLine1', 'A'.repeat(256)],
  ['address line 2 over 255 characters', 'addressLine2', 'B'.repeat(256)],
  ['town or city over 100 characters', 'townOrCity', 'T'.repeat(101)],
  ['county over 100 characters', 'county', 'C'.repeat(101)],
  ['postal or zip code over 12 characters', 'postalOrZipCode', 'P'.repeat(13)],
  ['telephone number over 20 characters', 'telephoneNumber', '1'.repeat(21)],
  [
    'email address over 254 characters',
    'emailAddress',
    `${'e'.repeat(243)}@example.com`
  ]
]

test.describe('animal identification', () => {
  test('shows the identifier fields that apply to each commodity', async ({
    page
  }) => {
    await openIdentification(page, [
      ['Cow', ['Bos taurus']],
      ['Horse', ['Equus caballus']],
      ['Fish', ['Salmo salar']]
    ])

    await expect(page.getByText(copy.identification.inset)).toBeVisible()
    await expect(page.locator('#animalIdentifierPassport-0')).toBeVisible()
    await expect(page.locator('#animalIdentifierTattoo-0')).toBeVisible()
    await expect(page.locator('#animalIdentifierEarTag-0')).toBeVisible()
    await expect(page.locator('#horseName-1')).toBeVisible()
    await expect(
      page.locator('#animalIdentifierIdentificationDetails-2')
    ).toBeVisible()
    await expect(page.locator('#animalIdentifierDescription-2')).toBeVisible()
    await expect(page.locator('#nameOrOrganisationName-0')).toHaveCount(0)
  })

  test('back link returns to the overview', async ({ page }) => {
    await openIdentification(page, [['Cat', ['Felis catus']]], ['2'])
    await page.locator('.govuk-back-link').click()

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  test('validation: an empty record links to and focuses the first identifier', async ({
    page
  }) => {
    await openIdentification(page, [['Cat', ['Felis catus']]], ['2'])
    await submitAdd(page)

    const link = errorLink(
      page,
      copy.identification.errors.atLeastOneIdentifier
    )
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.locator('#animalIdentifierPassport-0')).toBeFocused()
    await expect(page.locator('#animalIdentifierPassport-0')).toHaveValue('')
  })

  for (const [commodity, species, field, label] of identifierValidations) {
    test(`validation: ${label} over 58 characters links to and focuses the preserved value`, async ({
      page
    }) => {
      await openIdentification(page, [[commodity, [species]]])
      const invalid = 'X'.repeat(59)
      await page.locator(`#${field}-0`).fill(invalid)
      await page
        .getByRole('button', { name: copy.identification.saveAndFinish })
        .click()

      const link = errorLink(
        page,
        copy.identification.errors.identifierMax[field]
      )
      await expect(link).toBeVisible()
      await link.click()
      await expect(page.locator(`#${field}-0`)).toBeFocused()
      await expect(page.locator(`#${field}-0`)).toHaveValue(invalid)
    })
  }

  for (const [name, field] of requiredAddressValidations) {
    test(`permanent address validation: empty ${name} links to and focuses the preserved field`, async ({
      page
    }) => {
      await openIdentification(page, [['Cat', ['Felis catus']]], ['2'])
      await fillCatRecord(page)
      if (field === 'country') {
        await page.locator('#country-0').selectOption('')
      } else {
        await page.locator(`#${field}-0`).fill('')
      }
      await submitAdd(page)

      const link = errorLink(
        page,
        copy.identification.errors.addressMandatory[field]
      )
      await expect(link).toBeVisible()
      await link.click()
      await expect(page.locator(`#${field}-0`)).toBeFocused()
      await expect(page.locator(`#${field}-0`)).toHaveValue('')
      await expect(page.locator('#animalIdentifierPassport-0')).toHaveValue(
        'UK123456789'
      )
    })
  }

  for (const [name, field, invalid] of addressFormatValidations) {
    test(`permanent address validation: ${name} links to and focuses the preserved value`, async ({
      page
    }) => {
      await openIdentification(page, [['Cat', ['Felis catus']]], ['2'])
      await fillCatRecord(page, { ...validCatAddress, [field]: invalid })
      await submitAdd(page)

      const link = errorLink(
        page,
        copy.identification.errors.addressFormat[field]
      )
      await expect(link).toBeVisible()
      await link.click()
      await expect(page.locator(`#${field}-0`)).toBeFocused()
      await expect(page.locator(`#${field}-0`)).toHaveValue(invalid)
      await expect(page.locator('#animalIdentifierPassport-0')).toHaveValue(
        'UK123456789'
      )
    })
  }

  test('permanent address validation: an out-of-list country focuses the cleared select and preserves the record', async ({
    page
  }) => {
    await openIdentification(page, [['Cat', ['Felis catus']]], ['2'])
    await fillCatRecord(page)
    await page.locator('#country-0').evaluate((select) => {
      select.add(new Option('Invalid country', 'Invalid country'))
      select.value = 'Invalid country'
    })
    await submitAdd(page)

    const link = errorLink(
      page,
      copy.identification.errors.addressFormat.country
    )
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.locator('#country-0')).toBeFocused()
    await expect(page.locator('#country-0')).toHaveValue('')
    await expect(page.locator('#animalIdentifierPassport-0')).toHaveValue(
      'UK123456789'
    )
  })

  test('adds a complete record and renders its identifier and permanent-address summary', async ({
    page
  }) => {
    await openIdentification(page, [['Cat', ['Felis catus']]], ['2'])
    await fillCatRecord(page)
    await submitAdd(page)

    const row = page.locator('.govuk-summary-list__row', {
      hasText: copy.identification.animalRow(1)
    })
    await expect(row).toContainText(
      `${copy.identification.identifierLabels.animalIdentifierPassport}: UK123456789`
    )
    await expect(row).toContainText(
      `${copy.identification.permanentAddressSummaryLabel}: Pet Owner`
    )
  })

  test('removes an added record', async ({ page }) => {
    await openIdentification(page, [['Cat', ['Felis catus']]], ['2'])
    await fillCatRecord(page)
    await submitAdd(page)
    const row = page.locator('.govuk-summary-list__row', {
      hasText: copy.identification.animalRow(1)
    })
    await row
      .getByRole('button', { name: copy.identification.removeRow })
      .click()
    await expect(row).toHaveCount(0)
  })

  test('rejects a stale add action after the animal-count cap is reached', async ({
    page
  }) => {
    await openIdentification(page, [['Cow', ['Bos taurus']]], ['2'])
    await page.locator('#animalIdentifierEarTag-0').fill('UK000000000001')
    await submitAdd(page)
    await page.locator('#animalIdentifierEarTag-0').fill('UK000000000002')
    await submitAdd(page)
    await expect(
      page.getByText(copy.identification.allEntered(2, 'Bos taurus'))
    ).toBeVisible()

    await page.evaluate(() => {
      const form = document.querySelector('form')
      const action = document.createElement('input')
      action.type = 'hidden'
      action.name = 'action'
      action.value = 'add:0'
      form.appendChild(action)
      form.submit()
    })

    const link = errorLink(page, copy.identification.errors.capReached(2))
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/#identification-card-0$/)
  })

  test('blocks a count drop below saved records and reopens after removal', async ({
    page
  }) => {
    await openIdentification(page, [['Cow', ['Bos taurus']]], ['2'])

    await expect(
      page.getByRole('heading', {
        name: copy.identification.counter('Bos taurus', 1, 2)
      })
    ).toBeVisible()
    await page.locator('#animalIdentifierEarTag-0').fill('UK000000000001')
    await page
      .getByRole('button', { name: copy.identification.saveAndAddAnother })
      .click()
    await page.locator('#animalIdentifierEarTag-0').fill('UK000000000002')
    await page
      .getByRole('button', { name: copy.identification.saveAndAddAnother })
      .click()
    await expect(
      page.getByText(copy.identification.allEntered(2, 'Bos taurus'))
    ).toBeVisible()
    await expect(page.locator('#animalIdentifierEarTag-0')).toHaveCount(0)

    await page
      .getByRole('button', { name: copy.identification.saveAndFinish })
      .click()
    await page.getByRole('link', { name: 'What are you importing?' }).click()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.locator('#numberOfAnimalsQuantity-0').fill('1')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    const countDrop = copy.consignmentDetails.errors.countDrop(
      2,
      'Bos taurus',
      1
    )
    await expect(errorLink(page, countDrop)).toBeVisible()
    await errorLink(page, countDrop).click()

    const second = page.locator('.govuk-summary-list__row', {
      hasText: copy.identification.animalRow(2)
    })
    await second
      .getByRole('button', { name: copy.identification.removeRow })
      .click()
    await expect(
      page.getByRole('heading', {
        name: copy.identification.counter('Bos taurus', 2, 2)
      })
    ).toBeVisible()
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await openIdentification(page, [['Fish', ['Salmo salar']]])
    await expectAxeClean(page, 'Animal identification')
  })
})

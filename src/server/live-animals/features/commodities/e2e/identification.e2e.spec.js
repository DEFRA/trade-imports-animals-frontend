import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  answerCountryOfOrigin,
  searchAndSelect,
  startNotification
} from '../../../../../../e2e/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'

const addLines = async (page, selections, counts = []) => {
  await startNotification(page)
  await answerCountryOfOrigin(page)
  await page.getByRole('link', { name: 'What are you importing?' }).click()
  for (const [query, species] of selections) {
    await searchAndSelect(page, query, species)
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

test.describe('animal identification', () => {
  test('shows commodity-scoped identifier columns and every identifier length rule', async ({
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

    const fields = [
      'animalIdentifierPassport-0',
      'animalIdentifierTattoo-0',
      'animalIdentifierEarTag-0',
      'horseName-1',
      'animalIdentifierIdentificationDetails-2',
      'animalIdentifierDescription-2'
    ]
    for (const field of fields) {
      await page.locator(`#${field}`).fill('X'.repeat(59))
    }
    await page
      .getByRole('button', { name: copy.identification.saveAndFinish })
      .click()

    for (const message of Object.values(
      copy.identification.errors.identifierMax
    )) {
      await expect(errorLink(page, message)).toBeVisible()
    }
    for (const field of fields) {
      await expect(page.locator(`#${field}`)).toHaveValue('X'.repeat(59))
    }
  })

  test('validates the empty record and every permanent-address rule, then adds and removes a record', async ({
    page
  }) => {
    await openIdentification(page, [['Cat', ['Felis catus']]], ['2'])

    await expect(
      page.getByLabel(
        copy.identification.typeFields.animalIdentifierPassport.label
      )
    ).toBeVisible()
    await expect(
      page.getByLabel(
        copy.identification.typeFields.animalIdentifierTattoo.label
      )
    ).toBeVisible()
    await expect(
      page.getByLabel(copy.identification.address.nameOrOrganisationName)
    ).toBeVisible()
    await expect(
      page.getByLabel(
        copy.identification.typeFields.animalIdentifierEarTag?.label ??
          'Ear tag number'
      )
    ).toHaveCount(0)

    await page
      .getByRole('button', { name: copy.identification.saveAndAddAnother })
      .click()
    await expect(
      errorLink(page, copy.identification.errors.atLeastOneIdentifier)
    ).toBeVisible()

    await page.locator('#animalIdentifierPassport-0').fill('UK123456789')
    await page.locator('#nameOrOrganisationName-0').fill('Pet Owner')
    await page
      .getByRole('button', { name: copy.identification.saveAndAddAnother })
      .click()
    for (const message of Object.values(
      copy.identification.errors.addressMandatory
    ).slice(1)) {
      await expect(errorLink(page, message)).toBeVisible()
    }

    const invalid = {
      nameOrOrganisationName: 'N'.repeat(256),
      addressLine1: 'A'.repeat(256),
      addressLine2: 'B'.repeat(256),
      townOrCity: 'T'.repeat(101),
      county: 'C'.repeat(101),
      postalOrZipCode: 'P'.repeat(13),
      telephoneNumber: '1'.repeat(21),
      emailAddress: `${'e'.repeat(243)}@example.com`
    }
    for (const [field, value] of Object.entries(invalid)) {
      await page.locator(`#${field}-0`).fill(value)
    }
    await page.locator('#country-0').evaluate((select) => {
      select.add(new Option('Invalid country', 'Invalid country'))
      select.value = 'Invalid country'
    })
    await page
      .getByRole('button', { name: copy.identification.saveAndAddAnother })
      .click()
    for (const message of Object.values(
      copy.identification.errors.addressFormat
    )) {
      await expect(errorLink(page, message)).toBeVisible()
    }

    const valid = {
      nameOrOrganisationName: 'Pet Owner',
      addressLine1: '1 Farm Lane',
      addressLine2: '',
      townOrCity: 'Skipton',
      county: '',
      postalOrZipCode: 'BD23 1UD',
      country: 'United Kingdom',
      telephoneNumber: '+44 1756 555 0192',
      emailAddress: 'owner@example.co.uk'
    }
    for (const [field, value] of Object.entries(valid)) {
      const control = page.locator(`#${field}-0`)
      if (field === 'country') await control.selectOption(value)
      else await control.fill(value)
    }
    await page
      .getByRole('button', { name: copy.identification.saveAndAddAnother })
      .click()
    const row = page.locator('.govuk-summary-list__row', {
      hasText: copy.identification.animalRow(1)
    })
    await expect(row).toContainText(
      `${copy.identification.identifierLabels.animalIdentifierPassport}: UK123456789`
    )
    await expect(row).toContainText(
      `${copy.identification.permanentAddressSummaryLabel}: Pet Owner`
    )
    await row
      .getByRole('button', { name: copy.identification.removeRow })
      .click()
    await expect(row).toHaveCount(0)
  })

  test('caps records at the animal count, blocks a count drop and reopens after removal', async ({
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

  test('all three commodity pages have no serious or critical axe violations', async ({
    page
  }) => {
    await startNotification(page)
    await answerCountryOfOrigin(page)
    await page.getByRole('link', { name: 'What are you importing?' }).click()
    await expectAxeClean(page, 'Commodity search')

    await searchAndSelect(page, 'Fish', ['Salmo salar'])
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: copy.consignmentDetails.title })
    ).toBeVisible()
    await expectAxeClean(page, 'Consignment details')

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await page.getByRole('link', { name: copy.identification.title }).click()
    await expect(
      page.getByRole('heading', { name: copy.identification.title })
    ).toBeVisible()
    await expectAxeClean(page, 'Animal identification')
  })
})

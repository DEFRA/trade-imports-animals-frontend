import { expect, test } from '@playwright/test'
import {
  answerCountryOfOrigin,
  answerImportReason,
  answerOriginEntry,
  BASE,
  expectSpeciesSelected,
  journeyUrl,
  selectSpecies,
  signIn,
  startNotification
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { expectNoSeriousOrCriticalViolations } from './axe.js'
import { copy } from '../copy/copy.en.js'
import { copy as sharedCopy } from '../../../../../../../shared/copy.en.js'

const BOS_TAURUS = 'Bos taurus'
const FELIS_CATUS = 'Felis catus'
const SAVE_AND_CONTINUE = 'Save and continue'
const FIRST_ANIMALS_QUANTITY_FIELD = 'numberOfAnimalsQuantity-0'
const FIRST_ANIMALS_QUANTITY_INPUT = `#${FIRST_ANIMALS_QUANTITY_FIELD}`
const SECOND_ANIMALS_QUANTITY_FIELD = 'numberOfAnimalsQuantity-1'
const SECOND_ANIMALS_QUANTITY_INPUT = `#${SECOND_ANIMALS_QUANTITY_FIELD}`
const FIRST_PACKAGES_FIELD = 'numberOfPackages-0'
const FIRST_PACKAGES_INPUT = `#${FIRST_PACKAGES_FIELD}`
const SECOND_PACKAGES_FIELD = 'numberOfPackages-1'
const SECOND_PACKAGES_INPUT = `#${SECOND_PACKAGES_FIELD}`
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
  ['number of packages for Felis catus', SECOND_PACKAGES_FIELD, '-1']
]

const fillValidQuantities = async (page) => {
  for (const [index, field] of [
    FIRST_ANIMALS_QUANTITY_FIELD,
    FIRST_PACKAGES_FIELD,
    SECOND_ANIMALS_QUANTITY_FIELD,
    SECOND_PACKAGES_FIELD
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
    await expect(table.getByRole('columnheader')).toHaveText([
      copy.consignmentDetails.table.commodityCode,
      copy.consignmentDetails.table.commonName,
      copy.consignmentDetails.table.species,
      copy.consignmentDetails.table.actionsHidden
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
    // The number of animals question carries its label alone — the design
    // gives it no hint, and the page repeats the question per species, so an
    // example would repeat with it.
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

  // The page repeats the same two questions for every commodity, so the type
  // has to step down from the commodity to the species to the question and the
  // labels have to outweigh their own hints. The size classes are the whole of
  // the behaviour, which is why they are asserted directly.
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

  test('lists a commodity on code 01061900 as a species row whose remove drops that species alone', async ({
    page
  }) => {
    const table = page.locator(GOVUK_TABLE)
    // Cow keeps the commodity-level remove; Cat is on 01061900, so its row is
    // the species' own and its remove names the line rather than the commodity.
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

  test('captions the page "Description of the goods"', async ({ page }) => {
    await expect(
      page.locator('span.govuk-caption-l + h1.govuk-heading-l')
    ).toBeVisible()
    await expect(page.locator('span.govuk-caption-l')).toHaveText(
      'Description of the goods'
    )
  })

  test('validation: lists every number of animals error before any number of packages error', async ({
    page
  }) => {
    await page.locator(FIRST_PACKAGES_INPUT).fill('abc')
    await page.locator(SECOND_PACKAGES_INPUT).fill('abc')
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

  test('validation: a blank number of packages on a line that asks for one holds the page and names it', async ({
    page
  }) => {
    await fillValidQuantities(page)
    await page.locator(FIRST_PACKAGES_INPUT).fill('')
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    const link = page.getByRole('alert').getByRole('link')
    await expect(link).toHaveCount(1)
    await expect(link).toHaveText(
      copy.consignmentDetails.errors.packagesRequired
    )
    await link.click()
    await expect(page.locator(FIRST_PACKAGES_INPUT)).toBeFocused()
    await expect(page.locator(SECOND_PACKAGES_INPUT)).toHaveValue(
      validQuantities[3]
    )
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
    await expect(page.locator(SECOND_PACKAGES_INPUT)).toHaveValue('1')
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
    // Cow is not on 01061900, so its row keeps the commodity-level remove.
    await page.getByRole('button', { name: REMOVE_COW }).click()

    const table = page.locator(GOVUK_TABLE)
    await expect(table).not.toContainText('Cow')
    await expect(table).toContainText('Cat')
    // The cat line is the only one left and its saved count travelled with it,
    // so the right group was dropped.
    await expect(page.locator(FIRST_ANIMALS_QUANTITY_INPUT)).toHaveValue('2')
  })

  test('removing the last commodity returns to the commodity question', async ({
    page
  }) => {
    await page.getByRole('button', { name: REMOVE_COW }).click()
    // Cat is on 01061900, so its row carries the species-level remove — and it
    // is the only line left, so the page has nothing more to ask.
    await page.getByRole('button', { name: REMOVE_CAT }).click()

    await expect(
      page.getByRole('heading', { name: copy.search.title })
    ).toBeVisible()
    await expect(page.getByLabel(copy.search.searchLabel)).toBeVisible()

    // Re-entering the details page with nothing selected has nothing to ask,
    // so it bounces back to the commodity question too.
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

  test('ends with all three controls now the hub links straight here', async ({
    page
  }) => {
    const group = page.locator('.govuk-button-group')

    await expect(
      group.getByRole('button', { name: SAVE_AND_CONTINUE })
    ).toBeVisible()
    await expect(
      group.getByRole('button', {
        name: sharedCopy.saveActions.saveAndReturnToHub
      })
    ).toBeVisible()
    await expect(
      group.getByRole('link', {
        name: sharedCopy.saveActions.cancelAndReturnToHub
      })
    ).toBeVisible()
  })

  test('save and return to overview stores the counts and marks the row Completed', async ({
    page
  }) => {
    await fillValidQuantities(page)
    await page
      .getByRole('button', { name: sharedCopy.saveActions.saveAndReturnToHub })
      .click()

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

test.describe('commodity details in the opening run', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await page.goto(BASE)
    await page.getByRole('button', { name: 'Start a new notification' }).click()
    await answerOriginEntry(page)
    await selectSpecies(page, [BOS_TAURUS])
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await expect(
      page.getByRole('heading', { name: 'Main import reason' })
    ).toBeVisible()
    await answerImportReason(page)
    await expect(
      page.getByRole('heading', { name: copy.consignmentDetails.title })
    ).toBeVisible()
  })

  test('back link returns to What are you importing? in the opening run, with the choice kept', async ({
    page
  }) => {
    await page.locator('.govuk-back-link').click()
    await expect(
      page.getByRole('heading', { name: copy.search.title })
    ).toBeVisible()
    await expectSpeciesSelected(page, BOS_TAURUS)
  })

  test('ends with Save and continue, Save and return to overview and Cancel and return to overview in the opening run', async ({
    page
  }) => {
    await expect(
      page.getByRole('button', { name: SAVE_AND_CONTINUE })
    ).toBeVisible()
    await expect(
      page.getByRole('button', {
        name: sharedCopy.saveActions.saveAndReturnToHub
      })
    ).toBeVisible()
    await expect(
      page.getByRole('link', {
        name: sharedCopy.saveActions.cancelAndReturnToHub
      })
    ).toBeVisible()
  })
})

import { expect, test } from '@playwright/test'
import {
  addDocument,
  chooseCountryOfOrigin,
  completeAnswerSections,
  journeyUrl,
  selectSpecies,
  signIn,
  values
} from './live-animals-journey.js'

test.describe('live-animals journey glue', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('entry guards and the page-owned opening spine carry a fresh notification to the hub', async ({
    page
  }) => {
    const heading = (name) => page.getByRole('heading', { name })
    const save = () =>
      page.getByRole('button', { name: 'Save and continue' }).click()

    await page.goto('/')
    await page.getByRole('button', { name: 'Start a new notification' }).click()
    await expect(heading('What are you importing?')).toBeVisible()

    // Until the service filter is passed, journey deep links return to it.
    await page.goto(journeyUrl(page, 'origin'))
    await expect(heading('What are you importing?')).toBeVisible()
    await page.goto(journeyUrl(page))
    await expect(heading('What are you importing?')).toBeVisible()

    await page
      .getByRole('radio', { name: 'Live animals or germinal products' })
      .check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(heading('Origin of the import')).toBeVisible()

    await chooseCountryOfOrigin(page)
    await page.getByRole('radio', { name: 'No' }).check()
    await save()
    await expect(heading('What are you importing?')).toBeVisible()

    await selectSpecies(page, ['Felis catus'])
    await save()
    await expect(heading('Consignment details')).toBeVisible()

    await page.getByLabel('Number of animals').fill('2')
    await save()
    await expect(
      heading('What is the main reason for importing the animals?')
    ).toBeVisible()

    await page.getByRole('radio', { name: 'Internal market' }).check()
    await save()
    await expect(heading('Purpose in the internal market')).toBeVisible()

    await page.getByRole('radio', { name: 'Breeding' }).check()
    await save()
    await expect(heading('Animal identification details')).toBeVisible()

    await page.getByRole('button', { name: 'Save and finish' }).click()
    await expect(heading('Additional animal details')).toBeVisible()

    await page.getByRole('radio', { name: 'Slaughter' }).check()
    await save()
    await expect(heading('Overview')).toBeVisible()

    // Completing the opening run ends run mode, so later task saves return to
    // the ordinary hub resting state.
    await page.goto(journeyUrl(page, 'origin'))
    await expect(heading('Origin of the import')).toBeVisible()
    await save()
    await expect(heading('Overview')).toBeVisible()
  })

  test('collection changes from check answers retain change context until their explicit exits', async ({
    page
  }) => {
    test.slow()
    await page.goto('/')
    await page.getByRole('button', { name: 'Start a new notification' }).click()
    await page
      .getByRole('radio', { name: 'Live animals or germinal products' })
      .check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.goto(journeyUrl(page))
    await completeAnswerSections(page)

    const [document] = values.documents
    await page.getByRole('link', { name: 'Uploaded documents' }).click()
    await addDocument(page, document)
    await expect(
      page.locator('.govuk-table__row', {
        hasText: document.accompanyingDocumentReference
      })
    ).toContainText('Safe')
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.getByRole('link', { name: 'Check and submit' }).click()

    await page
      .getByRole('link', { name: 'Change animal identifiers for commodity 1' })
      .click()
    await expect(page).toHaveURL(
      /\/identification\?change=1(?:#identification-card-0)?$/
    )
    await page
      .getByRole('button', { name: 'Remove animal 1', exact: true })
      .click()
    await expect(page).toHaveURL(
      /\/identification\?change=1(?:#identification-card-0)?$/
    )
    await page.getByLabel('Ear tag number').fill('UK000000000002')
    await page.getByRole('button', { name: 'Save and add another' }).click()
    await expect(page).toHaveURL(
      /\/identification\?change=1(?:#identification-card-0)?$/
    )
    await page.getByRole('button', { name: 'Save and finish' }).click()
    await expect(page).toHaveURL(/\/notification-view(?:#.*)?$/)
    await expect(page.getByText('UK000000000002')).toBeVisible()

    const secondDocument = {
      accompanyingDocumentReference: 'INV-2026-0042',
      accompanyingDocumentDateOfIssue: { day: '3', month: '1', year: '2026' },
      filename: 'commercial-invoice.pdf'
    }
    await page.getByRole('link', { name: 'Change documents' }).click()
    await expect(page).toHaveURL(
      /\/accompanying-documents\?change=1(?:&attempt=\d+)?$/
    )
    await addDocument(page, secondDocument)
    await expect(page).toHaveURL(
      /\/accompanying-documents\?change=1(?:&attempt=\d+)?$/
    )
    await expect(
      page.locator('.govuk-table__row', {
        hasText: secondDocument.accompanyingDocumentReference
      })
    ).toContainText('Safe')
    await expect(page).toHaveURL(
      /\/accompanying-documents\?change=1(?:&attempt=\d+)?$/
    )
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(/\/notification-view(?:#.*)?$/)
    await expect(
      page.getByText(secondDocument.accompanyingDocumentReference)
    ).toBeVisible()
  })
})

import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'

/**
 * Happy-path walk of the live-animals journey. Grows one leg per increment
 * as pages land, driven by the values in
 * `prototypes/standalone/live-animals/spec/fixtures/happy-path.json`.
 * Legs that still walk the vendored car-insurance journey are transitional
 * and shrink as sections are replaced.
 */
const BASE = '/prototype-standalone/live-animals'

const { values } = JSON.parse(
  readFileSync(
    new URL(
      '../standalone/live-animals/spec/fixtures/happy-path.json',
      import.meta.url
    ),
    'utf8'
  )
)

const startNotification = async (page) => {
  await page.goto(`${BASE}/home`)
  await page.getByRole('button', { name: 'Start a new notification' }).click()
  // Starting a journey lands on the task list — still the vendored
  // car-insurance hub until later increments replace it.
  await expect(
    page.getByRole('heading', { name: 'Get a car insurance quote' })
  ).toBeVisible()
}

test.describe('live-animals (page-owned spine)', () => {
  test('dashboard — entry page starts a new notification', async ({ page }) => {
    await page.goto(`${BASE}/home`)
    await expect(
      page.getByRole('heading', { name: 'Import notification service' })
    ).toBeVisible()

    await startNotification(page)
  })

  test('origin — blank country blocks Save and Continue, then the happy path completes the task', async ({
    page
  }) => {
    await startNotification(page)

    await page.getByRole('link', { name: 'Origin of the import' }).click()
    await expect(
      page.getByRole('heading', { name: 'Origin of the import' })
    ).toBeVisible()

    // countryOfOrigin is enforcedAt=continue — saving without it must fail.
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'There is a problem' })
    ).toBeVisible()
    await expect(
      page.getByRole('link', {
        name: 'Select the country where the animal originates from'
      })
    ).toBeVisible()

    // Happy path from the shared fixture; 'Yes' reveals the region code.
    await page
      .getByLabel('Country of origin')
      .selectOption(values.countryOfOrigin)
    await page.getByRole('radio', { name: 'Yes' }).check()
    await page
      .getByLabel('Region of origin code', { exact: true })
      .fill(values.regionOfOriginCode)
    await page
      .getByLabel(
        'Your internal reference number for this consignment (optional)'
      )
      .fill(values.internalReferenceNumber)
    await page.getByRole('button', { name: 'Save and continue' }).click()

    // One-page section: saving returns to the hub with the task completed.
    await expect(
      page.getByRole('heading', { name: 'Get a car insurance quote' })
    ).toBeVisible()
    const originRow = page.locator('.govuk-task-list__item', {
      hasText: 'Origin of the import'
    })
    await expect(originRow).toContainText('Completed')
  })

  test('commodities — a line is added across the select and details sub-pages, then the hub row completes', async ({
    page
  }) => {
    await startNotification(page)
    const [line] = values.commodityLines

    await page.getByRole('link', { name: 'Commodities' }).click()
    await expect(
      page.getByRole('heading', { name: 'Commodities you have added' })
    ).toBeVisible()

    await page.getByRole('button', { name: 'Add a commodity' }).click()
    await expect(
      page.getByRole('heading', { name: 'Select species of commodity' })
    ).toBeVisible()

    // commoditySelection is enforcedAt=continue — saving without it must fail.
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'There is a problem' })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Select a commodity' })
    ).toBeVisible()

    // First entry sub-page: the taxonomy, from the shared fixture.
    await page
      .getByLabel('Commodity', { exact: true })
      .selectOption(line.commoditySelection)
    await page.getByRole('radio', { name: 'Domestic' }).check()
    await page.getByRole('checkbox', { name: 'Bos taurus (Cattle)' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    // Second entry sub-page: the counts for the line just minted.
    await expect(
      page.getByRole('heading', { name: 'Description of goods' })
    ).toBeVisible()
    await page
      .getByLabel('Number of animals')
      .fill(line.numberOfAnimalsQuantity)
    await page
      .getByLabel('Number of packages (optional)')
      .fill(line.numberOfPackages)
    await page.getByRole('button', { name: 'Save and continue' }).click()

    // Back on the loop hub with the new line summarised.
    await expect(
      page.getByRole('heading', { name: 'Commodities you have added' })
    ).toBeVisible()
    const row = page.locator('.govuk-summary-list__row', {
      hasText: 'Commodity 1'
    })
    await expect(row).toContainText('0102 - Cattle — 25 animals')

    // Continue returns to the hub with the task completed.
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Get a car insurance quote' })
    ).toBeVisible()
    const commoditiesRow = page.locator('.govuk-task-list__item', {
      hasText: 'Commodities'
    })
    await expect(commoditiesRow).toContainText('Completed')
  })

  test('import reason — blank saves without error (enforcedAt=submit), then the happy path completes the task', async ({
    page
  }) => {
    await startNotification(page)

    await page.getByRole('link', { name: 'About the consignment' }).click()
    await expect(
      page.getByRole('heading', {
        name: 'What is the main reason for importing the animals?'
      })
    ).toBeVisible()

    // reasonForImport is enforcedAt=submit — a blank save is not an error;
    // the one-page section returns to the hub with the task still open.
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Get a car insurance quote' })
    ).toBeVisible()
    const consignmentRow = page.locator('.govuk-task-list__item', {
      hasText: 'About the consignment'
    })
    await expect(consignmentRow).not.toContainText('Completed')

    // Happy path from the shared fixture. Choosing the internal market
    // activates purposeInInternalMarket, so the section walks on to the
    // purpose page instead of returning to the hub.
    await page.getByRole('link', { name: 'About the consignment' }).click()
    await page.getByRole('radio', { name: 'Internal market' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(
      page.getByRole('heading', { name: 'Purpose in the internal market' })
    ).toBeVisible()
    await page.getByRole('radio', { name: 'Breeding' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(
      page.getByRole('heading', { name: 'Get a car insurance quote' })
    ).toBeVisible()
    await expect(consignmentRow).toContainText('Completed')
  })

  test('accompanying documents — the optional collection starts Completed; adding a document lists it on the loop hub', async ({
    page
  }) => {
    await startNotification(page)
    const [doc] = values.documents
    const issued = doc.accompanyingDocumentDateOfIssue

    // documents is optional (nothing required until an entry exists), so
    // section-status derives the task as Completed before any document is
    // added — the row is never an open requirement.
    const documentsRow = page.locator('.govuk-task-list__item', {
      hasText: 'Accompanying documents'
    })
    await expect(documentsRow).toContainText('Completed')

    await page.getByRole('link', { name: 'Accompanying documents' }).click()
    await expect(
      page.getByRole('heading', { name: 'Documents you have added' })
    ).toBeVisible()
    await expect(
      page.getByText('You have not added any documents yet.')
    ).toBeVisible()

    await page.getByRole('button', { name: 'Add a document' }).click()
    await expect(
      page.getByRole('heading', { name: 'Add a document' })
    ).toBeVisible()

    // A partial date of issue is malformed, not merely blank — it blocks
    // the add (dateParts validation).
    await page.getByLabel('Day').fill(issued.day)
    await page.getByRole('button', { name: 'Add document' }).click()
    await expect(
      page.getByRole('heading', { name: 'There is a problem' })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Enter a real date of issue' })
    ).toBeVisible()

    // Happy path from the shared fixture — metadata only, no file upload.
    await page
      .getByLabel('Document type')
      .selectOption(doc.accompanyingDocumentType)
    await page
      .getByLabel('Attachment type')
      .selectOption(doc.accompanyingDocumentAttachmentType)
    await page
      .getByLabel('Document reference')
      .fill(doc.accompanyingDocumentReference)
    await page.getByLabel('Day').fill(issued.day)
    await page.getByLabel('Month').fill(issued.month)
    await page.getByLabel('Year').fill(issued.year)
    await page.getByRole('button', { name: 'Add document' }).click()

    // Back on the loop hub with the new document summarised.
    await expect(
      page.getByRole('heading', { name: 'Documents you have added' })
    ).toBeVisible()
    const row = page.locator('.govuk-summary-list__row', {
      hasText: 'Document 1'
    })
    await expect(row).toContainText('ITAHC — GBHC1234567890')

    // Continue returns to the hub; the optional task stays Completed.
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Get a car insurance quote' })
    ).toBeVisible()
    await expect(documentsRow).toContainText('Completed')
  })

  test('addresses — the landing page lists the five parties, all Not added yet with no links', async ({
    page
  }) => {
    await startNotification(page)

    await page.getByRole('link', { name: 'Addresses' }).click()
    await expect(page.getByRole('heading', { name: 'Addresses' })).toBeVisible()

    // No select sub-page exists yet, so every party shows the Not-added
    // state with no change link — the landing page has no dead links.
    const parties = [
      'Place of origin',
      'Consignor',
      'Consignee',
      'Importer',
      'Place of destination'
    ]
    for (const party of parties) {
      const row = page.locator('.govuk-summary-list__row', { hasText: party })
      await expect(row).toContainText('Not added yet')
      await expect(row.getByRole('link')).toHaveCount(0)
    }

    // The page collects nothing: Continue returns straight to the hub.
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Get a car insurance quote' })
    ).toBeVisible()
  })

  test('import purpose — owed only for the internal market; changing the reason wipes a saved purpose', async ({
    page
  }) => {
    await startNotification(page)
    const consignmentRow = page.locator('.govuk-task-list__item', {
      hasText: 'About the consignment'
    })

    // Internal market: the purpose page opens and completes the task.
    await page.getByRole('link', { name: 'About the consignment' }).click()
    await page.getByRole('radio', { name: 'Internal market' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Purpose in the internal market' })
    ).toBeVisible()
    await page.getByRole('radio', { name: 'Breeding' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(consignmentRow).toContainText('Completed')

    // Another reason: the purpose is no longer owed — saving returns
    // straight to the hub, skipping the purpose page, task still complete.
    await page.getByRole('link', { name: 'About the consignment' }).click()
    await page.getByRole('radio', { name: 'Transit' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Get a car insurance quote' })
    ).toBeVisible()
    await expect(consignmentRow).toContainText('Completed')

    // Back to the internal market: leaving scope wiped the saved purpose —
    // no radio is pre-selected and the task is owed (open) again.
    await page.getByRole('link', { name: 'About the consignment' }).click()
    await page.getByRole('radio', { name: 'Internal market' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Purpose in the internal market' })
    ).toBeVisible()
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)

    // A blank save is not an error (enforcedAt=submit) but leaves the task open.
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Get a car insurance quote' })
    ).toBeVisible()
    await expect(consignmentRow).not.toContainText('Completed')
  })
})

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

  test('addresses — selecting a consignor, a place of destination, a place of origin, a consignee and an importer copies each party onto the landing page and completes the task', async ({
    page
  }) => {
    await startNotification(page)

    // All five parties are required obligations owned by the addresses
    // landing page, so the task starts open.
    const addressesRow = page.locator('.govuk-task-list__item', {
      hasText: 'Addresses'
    })
    await expect(addressesRow).toContainText('Not started')

    await page.getByRole('link', { name: 'Addresses' }).click()
    await expect(page.getByRole('heading', { name: 'Addresses' })).toBeVisible()

    // The consignor spoke exists: its row offers Add.
    const consignorRow = page.locator('.govuk-summary-list__row', {
      hasText: 'Consignor'
    })
    await expect(consignorRow).toContainText('Not added yet')
    await consignorRow.getByRole('link', { name: 'Add' }).click()
    await expect(
      page.getByRole('heading', {
        name: 'Search for an existing consignor or exporter'
      })
    ).toBeVisible()

    // Selecting a party COPIES its name and address into the answer and
    // returns to the landing page, which now shows the copied name.
    await page.getByRole('radio', { name: values.consignor.name }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Addresses' })).toBeVisible()
    await expect(consignorRow).toContainText(values.consignor.name)
    await expect(
      consignorRow.getByRole('link', { name: 'Change' })
    ).toBeVisible()

    // The destination spoke works the same way — its own copy-commit.
    const destinationRow = page.locator('.govuk-summary-list__row', {
      hasText: 'Place of destination'
    })
    await expect(destinationRow).toContainText('Not added yet')
    await destinationRow.getByRole('link', { name: 'Add' }).click()
    await expect(
      page.getByRole('heading', { name: 'Search for a place of destination' })
    ).toBeVisible()

    await page
      .getByRole('radio', { name: values.placeOfDestination.name })
      .check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Addresses' })).toBeVisible()
    await expect(destinationRow).toContainText(values.placeOfDestination.name)
    await expect(
      destinationRow.getByRole('link', { name: 'Change' })
    ).toBeVisible()

    // The place of origin spoke works the same way — its own copy-commit.
    const originRow = page.locator('.govuk-summary-list__row', {
      hasText: 'Place of origin'
    })
    await expect(originRow).toContainText('Not added yet')
    await originRow.getByRole('link', { name: 'Add' }).click()
    await expect(
      page.getByRole('heading', { name: 'Search for a place of origin' })
    ).toBeVisible()

    await page.getByRole('radio', { name: values.placeOfOrigin.name }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Addresses' })).toBeVisible()
    await expect(originRow).toContainText(values.placeOfOrigin.name)
    await expect(originRow.getByRole('link', { name: 'Change' })).toBeVisible()

    // The consignee spoke works the same way — its own copy-commit.
    const consigneeRow = page.locator('.govuk-summary-list__row', {
      hasText: 'Consignee'
    })
    await expect(consigneeRow).toContainText('Not added yet')
    await consigneeRow.getByRole('link', { name: 'Add' }).click()
    await expect(
      page.getByRole('heading', { name: 'Search for a consignee' })
    ).toBeVisible()

    await page.getByRole('radio', { name: values.consignee.name }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Addresses' })).toBeVisible()
    await expect(consigneeRow).toContainText(values.consignee.name)
    await expect(
      consigneeRow.getByRole('link', { name: 'Change' })
    ).toBeVisible()

    // The importer spoke works the same way — its own copy-commit.
    const importerRow = page.locator('.govuk-summary-list__row', {
      hasText: 'Importer'
    })
    await expect(importerRow).toContainText('Not added yet')
    await importerRow.getByRole('link', { name: 'Add' }).click()
    await expect(
      page.getByRole('heading', { name: 'Search for an importer' })
    ).toBeVisible()

    await page.getByRole('radio', { name: values.importer.name }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Addresses' })).toBeVisible()
    await expect(importerRow).toContainText(values.importer.name)
    await expect(
      importerRow.getByRole('link', { name: 'Change' })
    ).toBeVisible()

    // Continue returns to the hub with all five owed parties answered.
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Get a car insurance quote' })
    ).toBeVisible()
    await expect(addressesRow).toContainText('Completed')
  })

  test('transport — a partial arrival date blocks the save; the port, date, travel details, transporter type and commercial transporter complete the task', async ({
    page
  }) => {
    await startNotification(page)
    const arrival = values.arrivalDateAtPort

    // All the section's fields are required (enforcedAt=submit), so the task
    // starts open.
    const transportRow = page.locator('.govuk-task-list__item', {
      hasText: 'Transport'
    })
    await expect(transportRow).toContainText('Not started')

    await page.getByRole('link', { name: 'Transport' }).click()
    await expect(
      page.getByRole('heading', { name: 'Port of entry' })
    ).toBeVisible()

    // A partial arrival date is malformed, not merely blank — it blocks the
    // save (dateParts validation), unlike a fully blank submit-enforced field.
    await page.getByLabel('Day').fill(arrival.day)
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'There is a problem' })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Enter a real arrival date' })
    ).toBeVisible()

    // Happy path from the shared fixture.
    await page
      .getByLabel('What is the port of entry into Great Britain?')
      .selectOption(values.portOfEntry)
    await page.getByLabel('Day').fill(arrival.day)
    await page.getByLabel('Month').fill(arrival.month)
    await page.getByLabel('Year').fill(arrival.year)
    await page.getByRole('button', { name: 'Save and continue' }).click()

    // Two-page section: saving walks on to the travel details page.
    await expect(
      page.getByRole('heading', { name: 'How the animals will travel' })
    ).toBeVisible()

    // Road Vehicle reveals the transited-countries checkboxes; the fixture's
    // FR and BE codes render as their country names.
    await page
      .getByRole('radio', { name: values.meansOfTransport, exact: true })
      .check()
    const roadReveal = page.locator(
      '#conditional-meansOfTransport-road-vehicle'
    )
    await expect(roadReveal).toBeVisible()
    await roadReveal.getByRole('checkbox', { name: 'France' }).check()
    await roadReveal.getByRole('checkbox', { name: 'Belgium' }).check()
    await page
      .getByLabel('Transport identification')
      .fill(values.transportIdentification)
    await page
      .getByLabel('Transport document reference')
      .fill(values.transportDocumentReference)
    await page.getByRole('button', { name: 'Save and continue' }).click()

    // Saving walks on to the transporter-type page.
    await expect(
      page.getByRole('heading', {
        name: 'What type of transporter will move the animals?'
      })
    ).toBeVisible()
    await page
      .getByRole('radio', { name: values.transporterType, exact: true })
      .check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    // Commercial transporter puts the select page in scope, so the section
    // walks on to it; selecting a transporter copies its details (c-020).
    await expect(
      page.getByRole('heading', {
        name: 'Search for an approved commercial transporter'
      })
    ).toBeVisible()
    await page
      .getByRole('radio', { name: values.commercialTransporter.name })
      .check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    // Last page of the section: saving returns to the hub, task completed.
    await expect(
      page.getByRole('heading', { name: 'Get a car insurance quote' })
    ).toBeVisible()
    await expect(transportRow).toContainText('Completed')
  })

  test('transporters — reached by saving through the earlier transport pages; the chosen type persists', async ({
    page
  }) => {
    await startNotification(page)

    // Every field on the two earlier pages is submit-enforced, so blank
    // saves walk straight through to the transporter-type page.
    const openTransporters = async () => {
      await page.getByRole('link', { name: 'Transport' }).click()
      await expect(
        page.getByRole('heading', { name: 'Port of entry' })
      ).toBeVisible()
      await page.getByRole('button', { name: 'Save and continue' }).click()
      await expect(
        page.getByRole('heading', { name: 'How the animals will travel' })
      ).toBeVisible()
      await page.getByRole('button', { name: 'Save and continue' }).click()
      await expect(
        page.getByRole('heading', {
          name: 'What type of transporter will move the animals?'
        })
      ).toBeVisible()
    }

    await openTransporters()

    // Both V4 types are offered; nothing is pre-selected.
    const commercial = page.getByRole('radio', {
      name: 'Commercial transporter'
    })
    const privateType = page.getByRole('radio', {
      name: 'Private transporter'
    })
    await expect(commercial).not.toBeChecked()
    await expect(privateType).not.toBeChecked()

    // transporterType is submit-enforced too — even a blank save passes and
    // returns to the hub with the task still open.
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Get a car insurance quote' })
    ).toBeVisible()
    const transportRow = page.locator('.govuk-task-list__item', {
      hasText: 'Transport'
    })
    await expect(transportRow).toContainText('Not started')

    // Choosing a type saves and persists on return. The private branch owes
    // the details page next — a blank save there walks on to the hub.
    await openTransporters()
    await privateType.check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Private transporter details' })
    ).toBeVisible()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Get a car insurance quote' })
    ).toBeVisible()
    await expect(transportRow).toContainText('In progress')

    await openTransporters()
    await expect(privateType).toBeChecked()
    await expect(commercial).not.toBeChecked()
  })

  test('commercial transporter — owed only for the commercial type; changing the type wipes a saved transporter', async ({
    page
  }) => {
    await startNotification(page)

    // Every field on the two earlier pages is submit-enforced, so blank
    // saves walk straight through to the transporter-type page.
    const openTransporters = async () => {
      await page.getByRole('link', { name: 'Transport' }).click()
      await expect(
        page.getByRole('heading', { name: 'Port of entry' })
      ).toBeVisible()
      await page.getByRole('button', { name: 'Save and continue' }).click()
      await expect(
        page.getByRole('heading', { name: 'How the animals will travel' })
      ).toBeVisible()
      await page.getByRole('button', { name: 'Save and continue' }).click()
      await expect(
        page.getByRole('heading', {
          name: 'What type of transporter will move the animals?'
        })
      ).toBeVisible()
    }
    const selectHeading = page.getByRole('heading', {
      name: 'Search for an approved commercial transporter'
    })

    // Commercial transporter: the select page opens; choosing a transporter
    // copies its name, address and approval number into the answer (c-020).
    await openTransporters()
    await page.getByRole('radio', { name: 'Commercial transporter' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(selectHeading).toBeVisible()
    await page
      .getByRole('radio', { name: values.commercialTransporter.name })
      .check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Get a car insurance quote' })
    ).toBeVisible()

    // The copy persists: walking back in re-derives the checked option from
    // the copied name.
    await openTransporters()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(selectHeading).toBeVisible()
    await expect(
      page.getByRole('radio', { name: values.commercialTransporter.name })
    ).toBeChecked()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    // Private transporter: the select page is no longer owed — saving the
    // type skips it and walks on to the private details page; a blank save
    // there returns to the hub.
    await openTransporters()
    await page.getByRole('radio', { name: 'Private transporter' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Private transporter details' })
    ).toBeVisible()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Get a car insurance quote' })
    ).toBeVisible()

    // Back to commercial: leaving scope wiped the saved transporter — no
    // radio is pre-selected on the select page.
    await openTransporters()
    await page.getByRole('radio', { name: 'Commercial transporter' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(selectHeading).toBeVisible()
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
  })

  test('private transporter — keyed-in details owed only for the private type; a partial fill blocks the save; changing the type wipes them', async ({
    page
  }) => {
    await startNotification(page)

    // Every field on the two earlier pages is submit-enforced, so blank
    // saves walk straight through to the transporter-type page.
    const openTransporters = async () => {
      await page.getByRole('link', { name: 'Transport' }).click()
      await expect(
        page.getByRole('heading', { name: 'Port of entry' })
      ).toBeVisible()
      await page.getByRole('button', { name: 'Save and continue' }).click()
      await expect(
        page.getByRole('heading', { name: 'How the animals will travel' })
      ).toBeVisible()
      await page.getByRole('button', { name: 'Save and continue' }).click()
      await expect(
        page.getByRole('heading', {
          name: 'What type of transporter will move the animals?'
        })
      ).toBeVisible()
    }
    const detailsHeading = page.getByRole('heading', {
      name: 'Private transporter details'
    })
    const transporter = values.privateTransporter

    // Private transporter: the details page opens. A PARTIAL fill blocks the
    // save — the fieldGroup's mandates apply once the record is provided —
    // naming the missing mandatory fields.
    await openTransporters()
    await page.getByRole('radio', { name: 'Private transporter' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(detailsHeading).toBeVisible()
    await page.getByLabel('Name or organisation name').fill(transporter.name)
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'There is a problem' })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Enter address line 1' })
    ).toBeVisible()

    // Completing the mandatory fields commits the whole group as one
    // { name, address } object and finishes the section.
    await page
      .getByLabel('Address line 1')
      .fill(transporter.address.addressLine1)
    await page.getByLabel('Town or city').fill(transporter.address.townOrCity)
    await page
      .getByLabel('Postal or zip code')
      .fill(transporter.address.postalOrZipCode)
    await page.getByLabel('Country').selectOption(transporter.address.country)
    await page
      .getByLabel('Telephone number')
      .fill(transporter.address.telephoneNumber)
    await page
      .getByLabel('Email address')
      .fill(transporter.address.emailAddress)
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Get a car insurance quote' })
    ).toBeVisible()

    // The record persists: walking back in flattens the saved object into
    // the form fields.
    await openTransporters()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(detailsHeading).toBeVisible()
    await expect(page.getByLabel('Name or organisation name')).toHaveValue(
      transporter.name
    )
    await expect(page.getByLabel('Country')).toHaveValue(
      transporter.address.country
    )
    await page.getByRole('button', { name: 'Save and continue' }).click()

    // Commercial transporter: the details page is no longer owed — saving
    // the type walks to the commercial select page instead; a blank save
    // there returns to the hub.
    await openTransporters()
    await page.getByRole('radio', { name: 'Commercial transporter' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', {
        name: 'Search for an approved commercial transporter'
      })
    ).toBeVisible()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Get a car insurance quote' })
    ).toBeVisible()

    // Back to private: leaving scope wiped the saved details — the form
    // renders empty.
    await openTransporters()
    await page.getByRole('radio', { name: 'Private transporter' }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(detailsHeading).toBeVisible()
    await expect(page.getByLabel('Name or organisation name')).toHaveValue('')
    await expect(page.getByLabel('Country')).toHaveValue('')
  })

  test('transport details — transited countries revealed only for rail or road; changing the means wipes saved countries', async ({
    page
  }) => {
    await startNotification(page)

    // transport-details is the section's second page: a blank save on the
    // port page (all its fields are submit-enforced) walks straight on to it.
    const openTransportDetails = async () => {
      await page.getByRole('link', { name: 'Transport' }).click()
      await expect(
        page.getByRole('heading', { name: 'Port of entry' })
      ).toBeVisible()
      await page.getByRole('button', { name: 'Save and continue' }).click()
      await expect(
        page.getByRole('heading', { name: 'How the animals will travel' })
      ).toBeVisible()
    }
    // Saving the travel details walks on to the transporter-type page; a
    // blank save there (submit-enforced) returns to the hub.
    const saveThroughTransporters = async () => {
      await page.getByRole('button', { name: 'Save and continue' }).click()
      await expect(
        page.getByRole('heading', {
          name: 'What type of transporter will move the animals?'
        })
      ).toBeVisible()
      await page.getByRole('button', { name: 'Save and continue' }).click()
      await expect(
        page.getByRole('heading', { name: 'Get a car insurance quote' })
      ).toBeVisible()
    }
    const roadReveal = page.locator(
      '#conditional-meansOfTransport-road-vehicle'
    )
    const railReveal = page.locator('#conditional-meansOfTransport-railway')

    await openTransportDetails()

    // The countries reveal for the overland means only.
    await expect(roadReveal).toBeHidden()
    await expect(railReveal).toBeHidden()
    await page.getByRole('radio', { name: 'Airplane' }).check()
    await expect(roadReveal).toBeHidden()
    await expect(railReveal).toBeHidden()
    await page.getByRole('radio', { name: 'Railway' }).check()
    await expect(railReveal).toBeVisible()
    await page.getByRole('radio', { name: 'Road Vehicle' }).check()
    await expect(roadReveal).toBeVisible()
    await expect(railReveal).toBeHidden()

    // Save two transited countries under Road Vehicle...
    await roadReveal.getByRole('checkbox', { name: 'France' }).check()
    await roadReveal.getByRole('checkbox', { name: 'Belgium' }).check()
    await saveThroughTransporters()

    // ...and they are still selected on return.
    await openTransportDetails()
    await expect(
      page.getByRole('radio', { name: 'Road Vehicle' })
    ).toBeChecked()
    await expect(
      roadReveal.getByRole('checkbox', { name: 'France' })
    ).toBeChecked()

    // A means outside the overland set takes the countries out of scope —
    // saving wipes them.
    await page.getByRole('radio', { name: 'Vessel' }).check()
    await saveThroughTransporters()

    // Back to Road Vehicle: leaving scope wiped the saved countries — no
    // checkbox is pre-selected.
    await openTransportDetails()
    await page.getByRole('radio', { name: 'Road Vehicle' }).check()
    await expect(
      roadReveal.getByRole('checkbox', { name: 'France' })
    ).not.toBeChecked()
    await expect(
      roadReveal.getByRole('checkbox', { name: 'Belgium' })
    ).not.toBeChecked()
  })

  test('contact address — a blank save leaves the task open (enforcedAt=submit); selecting a contact copies it and completes the task', async ({
    page
  }) => {
    await startNotification(page)

    // contactAddress is a required obligation owned by the one-page contact
    // section, so the task starts open.
    const contactRow = page.locator('.govuk-task-list__item', {
      hasText: 'Contact address'
    })
    await expect(contactRow).toContainText('Not started')

    await page.getByRole('link', { name: 'Contact address' }).click()
    await expect(
      page.getByRole('heading', { name: 'Contact address for consignment' })
    ).toBeVisible()

    // contactAddress is enforcedAt=submit — a blank save is not an error;
    // the one-page section returns to the hub with the task still open.
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Get a car insurance quote' })
    ).toBeVisible()
    await expect(contactRow).toContainText('Not started')

    // Happy path from the shared fixture: selecting a contact COPIES its
    // name and address into the answer (c-020) and completes the task.
    await page.getByRole('link', { name: 'Contact address' }).click()
    await page.getByRole('radio', { name: values.contactAddress.name }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: 'Get a car insurance quote' })
    ).toBeVisible()
    await expect(contactRow).toContainText('Completed')

    // The copy persists: walking back in re-derives the checked option from
    // the copied name.
    await page.getByRole('link', { name: 'Contact address' }).click()
    await expect(
      page.getByRole('radio', { name: values.contactAddress.name })
    ).toBeChecked()
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

  test('check and submit — the review task is on the hub and check your answers lists the answered rows', async ({
    page
  }) => {
    await startNotification(page)

    // The review task is on the hub from the start — check your answers
    // collects nothing, so it is always open to visit.
    const reviewRow = page.locator('.govuk-task-list__item', {
      hasText: 'Check and submit'
    })
    await expect(reviewRow).toBeVisible()

    // Answer the origin section from the shared fixture...
    await page.getByRole('link', { name: 'Origin of the import' }).click()
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

    // ...and the contact section (a copied record, c-020).
    await page.getByRole('link', { name: 'Contact address' }).click()
    await page.getByRole('radio', { name: values.contactAddress.name }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    // The review task opens check your answers.
    await reviewRow.getByRole('link', { name: 'Check and submit' }).click()
    await expect(
      page.getByRole('heading', { name: 'Check your answers' })
    ).toBeVisible()
    expect(page.url()).toContain('/notification-view')

    // The answered live-animals rows show the fixture values. The key match
    // is whole-cell (modulo template whitespace) so 'Region of origin code'
    // cannot also match the 'Region of origin code required' row.
    const summaryValue = (key) =>
      page
        .locator('.govuk-summary-list__row')
        .filter({
          has: page.locator('.govuk-summary-list__key', {
            hasText: new RegExp(`^\\s*${key}\\s*$`)
          })
        })
        .locator('.govuk-summary-list__value')

    await expect(summaryValue('Country of origin')).toHaveText('France')
    await expect(summaryValue('Region of origin code')).toHaveText(
      values.regionOfOriginCode
    )
    await expect(summaryValue('Internal reference number')).toHaveText(
      values.internalReferenceNumber
    )
    await expect(summaryValue('Contact address')).toHaveText(
      values.contactAddress.name
    )
  })
})

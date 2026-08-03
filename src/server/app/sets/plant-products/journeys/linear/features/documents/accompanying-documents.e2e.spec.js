import { expect, test } from '@playwright/test'

import { axeViolations as seriousOrCriticalViolations } from '../axe.e2e-helper.js'
import { documentTypeOptions } from '../../../../services/reference/document-types.js'
import { copy } from './copy/copy.en.js'

const hubUrl = /^\/plant-products\/notifications\/[^/]+$/
const documentsUrl =
  /^\/plant-products\/notifications\/[^/]+\/accompanying-documents$/

const startAtDocuments = async (page) => {
  await page.goto('/plant-products')
  await page.getByRole('button', { name: 'Create a new notification' }).click()
  await page
    .getByRole('radio', { name: 'Plants, plant products and other objects' })
    .check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Country of origin').selectOption('FR')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByRole('link', { name: 'Back', exact: true }).click()
  await page.getByRole('link', { name: 'Commodity', exact: true }).click()
  await page.getByRole('radio', { name: 'Manual entry' }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Enter commodity code').fill('06011010')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  const match = page.url().match(/(\/plant-products\/notifications\/[^/]+)/)
  await page.goto(`${match[1]}/accompanying-documents`)
  await expect(page).toHaveURL((url) => documentsUrl.test(url.pathname))
}

const addDocument = async (
  page,
  {
    type = 'PHYTOSANITARY_CERTIFICATE',
    reference = 'PHYTO-001',
    date = '4/12/2025'
  } = {}
) => {
  await page.getByLabel(copy.labels.documentType).selectOption(type)
  await page.getByLabel(copy.labels.documentReference).fill(reference)
  await page.getByLabel(copy.labels.issueDate).fill(date)
  await page.getByRole('button', { name: copy.actions.addDocument }).click()
}

const rowFor = (page, reference) =>
  page.getByRole('row').filter({ hasText: reference })

const documentHubRow = (page) =>
  page.getByRole('listitem').filter({
    has: page.getByText('Accompanying documents', { exact: true })
  })

const expectLinkedError = async (page, field, message) => {
  const alert = page.getByRole('alert')
  await expect(alert).toContainText('There is a problem')
  const summaryLink = alert.getByRole('link', { name: message })
  await expect(summaryLink).toHaveAttribute('href', `#${field}`)
  await summaryLink.click()
  await expect(page.locator(`#${field}`)).toBeFocused()
}

test.describe('plant-products accompanying documents', () => {
  test.beforeEach(async ({ page }) => {
    await startAtDocuments(page)
  })

  test('renders the warning, visible labels and the complete shipped type list', async ({
    page
  }) => {
    await expect(page.getByText(copy.caption, { exact: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: copy.heading })
    ).toBeVisible()
    await expect(
      page.getByText(copy.insetWarning, { exact: true })
    ).toBeVisible()
    await expect(page.getByLabel(copy.labels.documentType)).toBeVisible()
    await expect(page.getByLabel(copy.labels.documentReference)).toBeVisible()
    await expect(page.getByLabel(copy.labels.issueDate)).toBeVisible()
    await expect(
      page.getByLabel(copy.labels.documentType).locator('option')
    ).toHaveText([
      copy.placeholderOption,
      ...documentTypeOptions.map(({ text }) => text)
    ])
  })

  test('adds a document and flips the mandatory hub row to Completed', async ({
    page
  }) => {
    await addDocument(page)
    const row = rowFor(page, 'PHYTO-001')
    await expect(row).toContainText('Phytosanitary certificate')
    await expect(row).toContainText('4/12/2025')
    await expect(
      row.getByRole('button', {
        name: 'Remove Phytosanitary certificate PHYTO-001'
      })
    ).toBeVisible()

    await page.getByRole('button', { name: 'Save and return to hub' }).click()
    await expect(page).toHaveURL((url) => hubUrl.test(url.pathname))
    await expect(documentHubRow(page)).toContainText('Completed')
  })

  test('persists a saved document across a full page reload', async ({
    page
  }) => {
    await addDocument(page)
    await page.reload()

    await expect(rowFor(page, 'PHYTO-001')).toContainText(
      'Phytosanitary certificate'
    )
    await expect(page.getByLabel(copy.labels.documentReference)).toHaveValue('')
  })

  for (const testCase of [
    {
      name: 'missing document type',
      field: 'documentType',
      message: copy.errors.documentTypeRequired,
      type: '',
      reference: 'RAW-REFERENCE',
      date: '4/12/2025',
      raw: ''
    },
    {
      name: 'forged document type',
      field: 'documentType',
      message: copy.errors.documentTypeRequired,
      type: 'FORGED_TYPE',
      reference: 'RAW-REFERENCE',
      date: '4/12/2025',
      raw: 'FORGED_TYPE'
    },
    {
      name: 'missing reference',
      field: 'documentReference',
      message: copy.errors.referenceRequired,
      type: 'AIR_WAYBILL',
      reference: '',
      date: '4/12/2025',
      raw: ''
    },
    {
      name: 'reference over 100 characters',
      field: 'documentReference',
      message: copy.errors.referenceMaxLength,
      type: 'AIR_WAYBILL',
      reference: 'x'.repeat(101),
      date: '4/12/2025',
      raw: 'x'.repeat(101)
    },
    {
      name: 'missing issue date',
      field: 'issueDate',
      message: copy.errors.dateRequired,
      type: 'AIR_WAYBILL',
      reference: 'RAW-REFERENCE',
      date: '',
      raw: ''
    },
    {
      name: 'impossible issue date',
      field: 'issueDate',
      message: copy.errors.dateInvalid,
      type: 'AIR_WAYBILL',
      reference: 'RAW-REFERENCE',
      date: '31/2/2025',
      raw: '31/2/2025'
    }
  ]) {
    test(`links, focuses and preserves the ${testCase.name} error`, async ({
      page
    }) => {
      if (
        testCase.field === 'documentType' &&
        testCase.type === 'FORGED_TYPE'
      ) {
        await page.locator('#documentType').evaluate((select) => {
          select.append(new Option('Forged', 'FORGED_TYPE'))
        })
      }
      await page
        .getByLabel(copy.labels.documentType)
        .selectOption(testCase.type)
      await page
        .getByLabel(copy.labels.documentReference)
        .fill(testCase.reference)
      await page.getByLabel(copy.labels.issueDate).fill(testCase.date)
      await page.getByRole('button', { name: copy.actions.addDocument }).click()

      await expectLinkedError(page, testCase.field, testCase.message)
      await expect(page.locator(`#${testCase.field}`)).toHaveValue(testCase.raw)
      await expect(page.getByLabel(copy.labels.documentReference)).toHaveValue(
        testCase.reference
      )
    })
  }

  test('adds another document and removes the middle row by its computed name', async ({
    page
  }) => {
    await addDocument(page)
    await addDocument(page, {
      type: 'AIR_WAYBILL',
      reference: 'AIR-002',
      date: '5/12/2025'
    })
    await addDocument(page, {
      type: 'COMMERCIAL_INVOICE',
      reference: 'INVOICE-003',
      date: '6/12/2025'
    })

    await expect(page.getByRole('table').getByRole('row')).toHaveCount(4)
    await page
      .getByRole('button', { name: 'Remove Air waybill AIR-002' })
      .click()
    await expect(rowFor(page, 'AIR-002')).toHaveCount(0)
    await expect(rowFor(page, 'PHYTO-001')).toBeVisible()
    await expect(rowFor(page, 'INVOICE-003')).toBeVisible()
  })

  test('removing the last document returns the mandatory hub row to Not yet started', async ({
    page
  }) => {
    await addDocument(page)
    await page
      .getByRole('button', {
        name: 'Remove Phytosanitary certificate PHYTO-001'
      })
      .click()
    await page.getByRole('button', { name: 'Save and return to hub' }).click()

    await expect(documentHubRow(page)).toContainText('Not yet started')
  })

  test('continues with zero documents because the floor blocks readiness, not navigation', async ({
    page
  }) => {
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page).toHaveURL((url) => hubUrl.test(url.pathname))
    await expect(documentHubRow(page)).toContainText('Not yet started')
  })

  test('initial page has no serious or critical axe violations', async ({
    page
  }) => {
    const { all, seriousOrCritical } = await seriousOrCriticalViolations(page)
    expect(
      seriousOrCritical,
      `Accompanying documents has serious/critical accessibility violations.\n${JSON.stringify(all, null, 2)}`
    ).toEqual([])
  })

  test('validation-error page has no serious or critical axe violations', async ({
    page
  }) => {
    await page.getByRole('button', { name: copy.actions.addDocument }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    const { all, seriousOrCritical } = await seriousOrCriticalViolations(page)
    expect(
      seriousOrCritical,
      `Accompanying documents error has serious/critical accessibility violations.\n${JSON.stringify(all, null, 2)}`
    ).toEqual([])
  })
})

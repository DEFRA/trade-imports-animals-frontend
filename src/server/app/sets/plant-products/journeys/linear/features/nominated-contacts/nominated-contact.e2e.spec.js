import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { copy } from './copy/copy.en.js'

const hubUrl = /^\/plant-products\/notifications\/[^/]+$/
const nominatedContactsUrl =
  /^\/plant-products\/notifications\/[^/]+\/nominated-contact$/

const startAtNominatedContacts = async (page) => {
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
  await page.goto(`${match[1]}/nominated-contact`)
  await expect(page).toHaveURL((url) => nominatedContactsUrl.test(url.pathname))
}

const addContact = async (
  page,
  {
    name = 'Alex Inspector',
    email = 'alex@example.com',
    telephone = '',
    isAgent = false
  } = {}
) => {
  await page.getByLabel(copy.labels.contactName).fill(name)
  await page.getByLabel(copy.labels.contactEmail).fill(email)
  await page.getByLabel(copy.labels.contactTelephone).fill(telephone)
  if (isAgent) {
    await page.getByLabel(copy.labels.contactIsAgent).check()
  } else {
    await page.getByLabel(copy.labels.contactIsAgent).uncheck()
  }
  await page.getByRole('button', { name: copy.buttons.addAnother }).click()
}

const rowFor = (page, name) => page.getByRole('row').filter({ hasText: name })

const contactHubRow = (page) =>
  page.getByRole('listitem').filter({
    has: page.getByText('Nominated contacts', { exact: true })
  })

const expectLinkedError = async (page, field, message) => {
  const alert = page.getByRole('alert')
  await expect(alert).toContainText('There is a problem')
  const summaryLink = alert.getByRole('link', { name: message })
  await expect(summaryLink).toHaveAttribute('href', `#${field}`)
  await summaryLink.click()
  await expect(page.locator(`#${field}`)).toBeFocused()
}

const seriousOrCriticalViolations = async (page) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  return {
    all: results.violations,
    seriousOrCritical: results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )
  }
}

test.describe('plant-products nominated contacts', () => {
  test.beforeEach(async ({ page }) => {
    await startAtNominatedContacts(page)
  })

  test('renders the optional entry form with real labels and zero saved rows', async ({
    page
  }) => {
    await expect(page.getByText(copy.caption, { exact: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: copy.title })
    ).toBeVisible()
    await expect(page.getByText(copy.hint, { exact: true })).toBeVisible()
    await expect(page.getByRole('table')).toHaveCount(0)
    await expect(page.getByLabel(copy.labels.contactName)).toBeVisible()
    await expect(page.getByLabel(copy.labels.contactEmail)).toBeVisible()
    await expect(page.getByLabel(copy.labels.contactTelephone)).toBeVisible()
    await expect(page.getByLabel(copy.labels.contactIsAgent)).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.buttons.addAnother })
    ).toHaveClass(/govuk-button--secondary/)
  })

  test('persists two contacts with their own values and completes the optional hub row', async ({
    page
  }) => {
    await addContact(page, { isAgent: true })
    await addContact(page, {
      name: 'Blair Broker',
      email: '',
      telephone: '+44 7700 900 982'
    })
    await page.reload()

    const first = rowFor(page, 'Alex Inspector')
    const second = rowFor(page, 'Blair Broker')
    await expect(first.getByRole('cell')).toHaveText([
      'Alex Inspector',
      'alex@example.com',
      '',
      'Remove contact 1'
    ])
    await expect(second.getByRole('cell')).toHaveText([
      'Blair Broker',
      '',
      '+44 7700 900 982',
      'Remove contact 2'
    ])
    await expect(
      page.getByRole('button', { name: 'Remove contact 1', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Remove contact 2', exact: true })
    ).toBeVisible()

    await page.getByRole('button', { name: 'Save and return to hub' }).click()
    await expect(page).toHaveURL((url) => hubUrl.test(url.pathname))
    await expect(contactHubRow(page)).toContainText('Completed')
  })

  test('removes the middle contact by its exact distinct accessible name and preserves survivor order', async ({
    page
  }) => {
    await addContact(page)
    await addContact(page, {
      name: 'Blair Broker',
      email: 'blair@example.com'
    })
    await addContact(page, {
      name: 'Casey Coordinator',
      email: '',
      telephone: '+44 7700 900 983'
    })

    const removeButtons = page.getByRole('button', {
      name: /^Remove contact [1-3]$/
    })
    await expect(removeButtons).toHaveCount(3)
    for (const number of [1, 2, 3]) {
      await expect(
        page.getByRole('button', {
          name: `Remove contact ${number}`,
          exact: true
        })
      ).toBeVisible()
    }
    const names = await removeButtons.evaluateAll((buttons) =>
      buttons.map((button) => button.innerText.replace(/\s+/g, ' ').trim())
    )
    expect(names).toEqual([
      'Remove contact 1',
      'Remove contact 2',
      'Remove contact 3'
    ])
    expect(new Set(names).size).toBe(3)

    await page
      .getByRole('button', { name: 'Remove contact 2', exact: true })
      .click()

    const savedRows = page.locator('tbody').getByRole('row')
    await expect(savedRows).toHaveCount(2)
    await expect(savedRows.nth(0).getByRole('cell')).toHaveText([
      'Alex Inspector',
      'alex@example.com',
      '',
      'Remove contact 1'
    ])
    await expect(savedRows.nth(1).getByRole('cell')).toHaveText([
      'Casey Coordinator',
      '',
      '+44 7700 900 983',
      'Remove contact 2'
    ])
    await expect(rowFor(page, 'Blair Broker')).toHaveCount(0)
  })

  for (const testCase of [
    {
      name: 'missing name',
      field: 'contactName',
      message: copy.errors.contactNameRequired,
      values: { name: '', email: 'raw@example.com', telephone: '' },
      raw: ''
    },
    {
      name: 'name over 32 characters',
      field: 'contactName',
      message: copy.errors.contactNameMax,
      values: { name: 'x'.repeat(33), email: 'raw@example.com', telephone: '' },
      raw: 'x'.repeat(33)
    },
    {
      name: 'invalid email address',
      field: 'contactEmail',
      message: copy.errors.contactEmailFormat,
      values: { name: 'Raw Name', email: 'not-an-email', telephone: '' },
      raw: 'not-an-email'
    },
    {
      name: 'email address over 255 characters',
      field: 'contactEmail',
      message: copy.errors.contactEmailMax,
      values: {
        name: 'Raw Name',
        email: `${'a'.repeat(244)}@example.com`,
        telephone: ''
      },
      raw: `${'a'.repeat(244)}@example.com`
    },
    {
      name: 'invalid mobile number',
      field: 'contactTelephone',
      message: copy.errors.contactTelephoneFormat,
      values: { name: 'Raw Name', email: '', telephone: 'call me' },
      raw: 'call me'
    },
    {
      name: 'mobile number over 30 characters',
      field: 'contactTelephone',
      message: copy.errors.contactTelephoneMax,
      values: { name: 'Raw Name', email: '', telephone: '1'.repeat(31) },
      raw: '1'.repeat(31)
    },
    {
      name: 'missing email and mobile number',
      field: 'contactEmail',
      message: copy.errors.contactMethodRequired,
      values: { name: 'Raw Name', email: '', telephone: '' },
      raw: ''
    }
  ]) {
    test(`links, focuses and preserves the ${testCase.name} error`, async ({
      page
    }) => {
      await page.getByLabel(copy.labels.contactName).fill(testCase.values.name)
      await page
        .getByLabel(copy.labels.contactEmail)
        .fill(testCase.values.email)
      await page
        .getByLabel(copy.labels.contactTelephone)
        .fill(testCase.values.telephone)
      await page.getByLabel(copy.labels.contactIsAgent).check()
      await page.getByRole('button', { name: copy.buttons.addAnother }).click()

      await expectLinkedError(page, testCase.field, testCase.message)
      await expect(page.locator(`#${testCase.field}`)).toHaveValue(testCase.raw)
      await expect(page.getByLabel(copy.labels.contactName)).toHaveValue(
        testCase.values.name
      )
      await expect(page.getByLabel(copy.labels.contactIsAgent)).toBeChecked()
    })
  }

  test('continues with zero contacts and leaves the hub row Optional', async ({
    page
  }) => {
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page).toHaveURL((url) => hubUrl.test(url.pathname))
    await expect(contactHubRow(page)).toContainText('Optional')
  })

  test('hides the entry form at five contacts and states the maximum', async ({
    page
  }) => {
    for (let index = 1; index <= 5; index += 1) {
      await addContact(page, {
        name: `Contact ${index}`,
        email: `contact${index}@example.com`
      })
    }

    await expect(page.getByRole('table').getByRole('row')).toHaveCount(6)
    await expect(page.getByText(copy.maxReached, { exact: true })).toBeVisible()
    await expect(page.getByLabel(copy.labels.contactName)).toHaveCount(0)
    await expect(page.getByLabel(copy.labels.contactEmail)).toHaveCount(0)
    await expect(page.getByLabel(copy.labels.contactTelephone)).toHaveCount(0)
    await expect(page.getByLabel(copy.labels.contactIsAgent)).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: copy.buttons.addAnother })
    ).toHaveCount(0)
  })

  test('initial page has no serious or critical axe violations', async ({
    page
  }) => {
    const { all, seriousOrCritical } = await seriousOrCriticalViolations(page)
    expect(
      seriousOrCritical,
      `Nominated contacts has serious/critical accessibility violations.\n${JSON.stringify(all, null, 2)}`
    ).toEqual([])
  })

  test('validation-error page has no serious or critical axe violations', async ({
    page
  }) => {
    await page.getByRole('button', { name: copy.buttons.addAnother }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    const { all, seriousOrCritical } = await seriousOrCriticalViolations(page)
    expect(
      seriousOrCritical,
      `Nominated contacts error has serious/critical accessibility violations.\n${JSON.stringify(all, null, 2)}`
    ).toEqual([])
  })
})

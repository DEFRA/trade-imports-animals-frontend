import { expect, test } from '@playwright/test'

import { axeViolations } from '../axe.e2e-helper.js'
import { copy } from './copy/copy.en.js'

const SAVE_AND_CONTINUE = 'Save and continue'
const CONTACT_DETAILS = 'Contact details'
const CONTACT_NAME = 'Isabel Irwin'
const CONTACT_EMAIL = 'isabel@example.com'

const hubUrl = (url) =>
  /^\/plant-products\/notifications\/[^/]+$/.test(url.pathname)
const contactUrl = (url) =>
  /^\/plant-products\/notifications\/[^/]+\/contact-details$/.test(url.pathname)

const rowByTitle = (page, title) =>
  page.getByRole('listitem').filter({
    has: page.getByText(title, { exact: true })
  })

const startAtContact = async (page) => {
  await page.goto('/plant-products')
  await page.getByRole('button', { name: 'Create a new notification' }).click()
  await page
    .getByRole('radio', { name: 'Plants, plant products and other objects' })
    .check()
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await page.getByLabel('Country of origin').selectOption('FR')
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await page.getByRole('link', { name: 'Back', exact: true }).click()
  await page.getByRole('link', { name: 'Commodity', exact: true }).click()
  await page.getByRole('radio', { name: 'Manual entry' }).check()
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await page.getByLabel('Enter commodity code').fill('06011010')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page
    .getByRole('button', {
      name: 'Add Albuca bracteata to commodity 06011010'
    })
    .click()

  await page.getByRole('link', { name: 'Back', exact: true }).click()
  await expect(page).toHaveURL(hubUrl)
  const notificationUrl = page.url()
  const row = rowByTitle(page, CONTACT_DETAILS)
  await expect(row).toContainText('Not yet started')
  await row.getByRole('link', { name: CONTACT_DETAILS }).click()
  await expect(page).toHaveURL(contactUrl)

  return { notificationUrl, pageUrl: page.url() }
}

const controls = (page) => ({
  name: page.getByLabel(copy.fields.responsiblePersonName.label, {
    exact: true
  }),
  email: page.getByLabel(copy.fields.responsiblePersonEmail.label, {
    exact: true
  }),
  telephone: page.getByLabel(copy.fields.responsiblePersonTelephone.label, {
    exact: true
  })
})

const fillValues = async (
  page,
  { name = CONTACT_NAME, email = CONTACT_EMAIL, telephone = '' } = {}
) => {
  const fields = controls(page)
  await fields.name.fill(name)
  await fields.email.fill(email)
  await fields.telephone.fill(telephone)
}

const submit = (page) =>
  page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

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
  await expect(fields.name).toHaveAccessibleName(
    copy.fields.responsiblePersonName.label
  )
  await expect(fields.email).toHaveAccessibleName(
    copy.fields.responsiblePersonEmail.label
  )
  await expect(fields.telephone).toHaveAccessibleName(
    copy.fields.responsiblePersonTelephone.label
  )
}

const expectNoSeriousOrCriticalViolations = async (page, state) => {
  const { all, seriousOrCritical } = await axeViolations(page)

  expect(
    seriousOrCritical,
    `Contact details ${state} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(all, null, 2)}`
  ).toEqual([])
}

test.describe('plant-products contact details', () => {
  test.beforeEach(async ({ page }) => {
    await startAtContact(page)
  })

  test('renders the fieldset heading, intro, three accessible inputs and house actions', async ({
    page
  }) => {
    await expect(
      page.getByRole('group', { name: copy.legend, exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: copy.legend, exact: true })
    ).toBeVisible()
    await expect(page.locator('.govuk-caption-xl')).toHaveCount(0)
    await expect(page.getByText(copy.intro1, { exact: true })).toBeVisible()
    await expect(page.getByText(copy.intro2, { exact: true })).toBeVisible()
    await expect(
      page.locator('main form input:not([type="hidden"])')
    ).toHaveCount(3)
    await expectAccessibleNames(page)

    const fields = controls(page)
    await expect(fields.name).toHaveAttribute('name', 'responsiblePersonName')
    await expect(fields.name).toHaveAttribute('autocomplete', 'name')
    await expect(fields.name).toHaveClass(/govuk-!-width-two-thirds/)
    await expect(fields.email).toHaveAttribute('type', 'email')
    await expect(fields.email).toHaveAttribute('autocomplete', 'email')
    await expect(fields.email).toHaveAttribute('spellcheck', 'false')
    await expect(fields.telephone).toHaveAttribute('type', 'tel')
    await expect(fields.telephone).toHaveAttribute('autocomplete', 'tel')
    await expect(page.getByLabel('Agent', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Agent', { exact: true })).toHaveCount(0)

    await expect(
      page.getByRole('button', { name: SAVE_AND_CONTINUE, exact: true })
    ).toHaveCount(1)
    await expect(
      page.getByRole('button', { name: 'Save and return to hub', exact: true })
    ).toHaveClass(/govuk-button--secondary/)
    await expect(
      page.getByRole('link', { name: 'Cancel and return to hub', exact: true })
    ).toHaveAttribute('href', /\/plant-products\/notifications\/[^/]+$/)
  })

  test('saves name and email, completes the hub row and reloads persisted values', async ({
    page
  }) => {
    const pageUrl = page.url()
    await fillValues(page, {
      name: CONTACT_NAME,
      email: CONTACT_EMAIL
    })
    await submit(page)

    await expect(page).toHaveURL(hubUrl)
    await expect(rowByTitle(page, CONTACT_DETAILS)).toContainText('Completed')
    await page.goto(pageUrl)
    await expect(controls(page).name).toHaveValue(CONTACT_NAME)
    await expect(controls(page).email).toHaveValue(CONTACT_EMAIL)
    await expect(controls(page).telephone).toHaveValue('')
  })

  test('saves and reloads name with telephone only', async ({ page }) => {
    const pageUrl = page.url()
    await fillValues(page, {
      name: CONTACT_NAME,
      email: '',
      telephone: '+44 7700 900 982'
    })
    await submit(page)

    await expect(page).toHaveURL(hubUrl)
    await page.goto(pageUrl)
    await expect(controls(page).name).toHaveValue(CONTACT_NAME)
    await expect(controls(page).email).toHaveValue('')
    await expect(controls(page).telephone).toHaveValue('+44 7700 900 982')
  })

  const validationCases = [
    {
      name: 'name required',
      values: { name: '' },
      field: 'responsiblePersonName',
      message: copy.errors.nameRequired
    },
    {
      name: 'name maximum',
      values: { name: 'N'.repeat(33) },
      field: 'responsiblePersonName',
      message: copy.errors.nameMax
    },
    {
      name: 'email or telephone required',
      values: { email: '', telephone: '' },
      field: 'responsiblePersonEmail',
      message: copy.errors.emailOrTelephoneRequired
    },
    {
      name: 'email format',
      values: { email: 'not-an-email' },
      field: 'responsiblePersonEmail',
      message: copy.errors.emailFormat
    },
    {
      name: 'email maximum',
      values: { email: `${'a'.repeat(244)}@example.com` },
      field: 'responsiblePersonEmail',
      message: copy.errors.emailMax
    },
    {
      name: 'telephone format',
      values: { email: '', telephone: '07700 CALL ME' },
      field: 'responsiblePersonTelephone',
      message: copy.errors.telephoneFormat
    },
    {
      name: 'telephone maximum',
      values: { email: '', telephone: '1'.repeat(31) },
      field: 'responsiblePersonTelephone',
      message: copy.errors.telephoneMax
    }
  ]

  for (const testCase of validationCases) {
    test(`${testCase.name}: shows canonical copy and focuses its control`, async ({
      page
    }) => {
      await fillValues(page, testCase.values)
      await submit(page)

      await expectLinkedError(page, testCase.field, testCase.message)
    })
  }

  test('preserves every raw entered value when validation fails', async ({
    page
  }) => {
    const values = {
      name: 'Raw Name',
      email: 'raw-email',
      telephone: '07700 900 982'
    }
    await fillValues(page, values)
    await submit(page)

    await expect(controls(page).name).toHaveValue(values.name)
    await expect(controls(page).email).toHaveValue(values.email)
    await expect(controls(page).telephone).toHaveValue(values.telephone)
  })

  test('every error-summary link focuses its corresponding control', async ({
    page
  }) => {
    await fillValues(page, {
      name: '',
      email: 'raw-email',
      telephone: 'letters'
    })
    await submit(page)

    await expectLinkedError(
      page,
      'responsiblePersonName',
      copy.errors.nameRequired
    )
    await expectLinkedError(
      page,
      'responsiblePersonEmail',
      copy.errors.emailFormat
    )
    await expectLinkedError(
      page,
      'responsiblePersonTelephone',
      copy.errors.telephoneFormat
    )
  })

  test('initial state has computed accessible names and no serious or critical axe violations', async ({
    page
  }) => {
    await expectAccessibleNames(page)
    await expectNoSeriousOrCriticalViolations(page, 'initial state')
  })

  test('validation-error state has computed accessible names and no serious or critical axe violations', async ({
    page
  }) => {
    await fillValues(page, { name: '', email: '', telephone: '' })
    await submit(page)
    await expect(page.getByRole('alert')).toBeVisible()
    await expectAccessibleNames(page)
    await expectNoSeriousOrCriticalViolations(page, 'validation-error state')
  })
})

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  ARRIVAL_DATE_IN_WINDOW,
  BASE,
  answerArrivalDetails,
  answerEveryTemplateSection,
  chooseCountryOfOrigin,
  freshContactId,
  openTemplateTaskList,
  saveTemplateFromReview,
  signIn
} from '../../../../../../../../../fit/live-animals-journey.js'
import { copy } from './copy/copy.en.js'

const NAME = 'Weekly cattle'
const SAVE_AND_RETURN = 'Save and return'
const SAVE_AND_CONTINUE = 'Save and continue'
const INTERNAL_REFERENCE_ROW = 'Internal reference number'
const ARRIVAL_DETAILS = 'arrival details'
const SAVED_REFERENCE = 'REF-SAVED-1'
const CHANGED_REFERENCE = 'REF-CHANGED-2'
const UNSAVED_REFERENCE = 'REF-NEVER-SAVED-3'
const CHANGED_TRANSPORT_ID = 'CHANGED-TRANSPORT-9'
const NOT_APPLICABLE = 'Not applicable'
const MANAGE_TEMPLATES = 'Manage templates'
const TEMPLATE_PAGE_PATH = /\/live-animals\/templates\/[^/]+$/
const ARRIVAL_DATE_LABEL = 'Arrival date at port of entry'
const ARRIVAL_DATE_ROW = 'Arrival date at destination'
const REFERENCE_LABEL =
  'Your internal reference for this consignment (optional)'
const REGION_CODE_FIELD = '#regionOfOriginCodeSuffix'

const main = (page) => page.getByRole('main')

const banner = (page) =>
  main(page).locator('.govuk-notification-banner--success')

const rowFor = (page, label) =>
  page
    .getByRole('term')
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator('..')
    .first()

const changeLink = (page, hiddenText) =>
  page.getByRole('link', { name: `Change ${hiddenText}` })

const today = () =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/London'
  }).format(new Date())

const saveAndReturn = (page) =>
  page.getByRole('button', { name: SAVE_AND_RETURN, exact: true }).click()

// Answers Origin with an internal reference and no region code, so a field
// the trader left alone can be seen to come back empty.
const answerOriginWithReference = async (page, reference) => {
  await chooseCountryOfOrigin(page)
  await page.getByRole('radio', { name: 'No' }).check()
  await page.getByLabel(REFERENCE_LABEL).fill(reference)
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
}

const reviewAndSave = async (page) => {
  await page.getByRole('button', { name: 'Review template' }).click()
  await saveTemplateFromReview(page)
}

const viewSaved = async (page, name) => {
  await page
    .getByRole('region', { name: `Template ${name}` })
    .getByRole('link', { name: 'View template' })
    .click()
  await expect(page).toHaveURL(TEMPLATE_PAGE_PATH)
}

// A saved cattle template whose Origin holds an internal reference.
const saveWithReference = async (page, name = NAME) => {
  await openTemplateTaskList(page, name)
  await page
    .getByRole('link', { name: 'Where is this consignment coming from?' })
    .click()
  await answerOriginWithReference(page, SAVED_REFERENCE)
  await reviewAndSave(page)
  await viewSaved(page, name)
}

const openChangeOrigin = async (page) => {
  await changeLink(page, 'origin of import').click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Origin of the import' })
  ).toBeVisible()
}

const expectNoSeriousOrCriticalAxeViolations = async (page) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  const seriousOrCritical = results.violations.filter(({ impact }) =>
    ['serious', 'critical'].includes(impact)
  )

  expect(
    seriousOrCritical,
    `The changed section has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

test.describe('changing one section of a saved template', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, { contactId: freshContactId() })
  })

  test('Change opens the question page prefilled for the template, ending with Save and return and Cancel', async ({
    page
  }) => {
    await saveWithReference(page)
    const templateId = page.url().split('/').pop()

    await openChangeOrigin(page)

    await expect(page.getByLabel(REFERENCE_LABEL)).toHaveValue(SAVED_REFERENCE)
    await expect(page.locator(REGION_CODE_FIELD)).toHaveValue('')
    await expect(page.locator(REGION_CODE_FIELD)).not.toHaveValue(
      NOT_APPLICABLE
    )
    await expect(page.locator('.app-journey-strip')).toContainText('Template')

    const buttons = main(page).locator('form').getByRole('button')
    await expect(buttons).toHaveText(['Save and return'])
    await expect(
      main(page).getByRole('link', { name: 'Cancel', exact: true })
    ).toHaveAttribute('href', new RegExp(`/templates/${templateId}$`))
    for (const absent of [
      'Save and continue',
      'Save and return to overview',
      'Cancel and return to overview'
    ]) {
      await expect(main(page).getByText(absent, { exact: true })).toHaveCount(0)
    }
  })

  test('Back from a changed section returns to the template page', async ({
    page
  }) => {
    await saveWithReference(page)
    const templateUrl = page.url()

    await openChangeOrigin(page)
    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(templateUrl)
    await expect(
      page.getByRole('heading', { level: 1, name: NAME, exact: true })
    ).toBeVisible()
  })

  test('Save and return updates the template and returns to its page with a success banner', async ({
    page
  }) => {
    await saveWithReference(page)
    const templateUrl = page.url()

    await openChangeOrigin(page)
    await page.getByLabel(REFERENCE_LABEL).fill(CHANGED_REFERENCE)
    await saveAndReturn(page)

    await expect(page).toHaveURL(templateUrl)
    await expect(rowFor(page, INTERNAL_REFERENCE_ROW)).toContainText(
      CHANGED_REFERENCE
    )
    await expect(banner(page)).toBeVisible()
    await expect(banner(page)).toHaveAttribute('role', 'alert')
    await expect(
      banner(page).getByText(copy.updated.title, { exact: true })
    ).toBeVisible()
    await expect(
      banner(page).getByRole('heading', {
        name: copy.updated.heading(NAME),
        exact: true
      })
    ).toBeVisible()

    await page.goto(BASE)
    await expect(page.getByText('Draft', { exact: true })).toHaveCount(0)
  })

  test('the banner is gone on reload', async ({ page }) => {
    await saveWithReference(page)

    await openChangeOrigin(page)
    await saveAndReturn(page)
    await expect(banner(page)).toBeVisible()

    await page.reload()

    await expect(banner(page)).toHaveCount(0)
  })

  test('a template with no name is confirmed as Template has been updated', async ({
    page
  }) => {
    await saveWithReference(page, '')

    await openChangeOrigin(page)
    await saveAndReturn(page)

    await expect(
      banner(page).getByRole('heading', {
        name: copy.updated.unnamedHeading,
        exact: true
      })
    ).toBeVisible()
  })

  test('without JavaScript the banner shows and stays', async ({
    page,
    browser
  }) => {
    await saveWithReference(page)
    const templateUrl = page.url()
    const context = await browser.newContext({
      javaScriptEnabled: false,
      storageState: await page.context().storageState()
    })

    try {
      const plain = await context.newPage()
      await plain.goto(templateUrl)
      await openChangeOrigin(plain)
      await plain.getByLabel(REFERENCE_LABEL).fill(CHANGED_REFERENCE)
      await saveAndReturn(plain)

      await expect(plain).toHaveURL(templateUrl)
      await expect(
        banner(plain).getByRole('heading', {
          name: copy.updated.heading(NAME),
          exact: true
        })
      ).toBeVisible()
      await expect(banner(plain)).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test("Date created shows today's date after a same-day change", async ({
    page
  }) => {
    await saveWithReference(page)

    await openChangeOrigin(page)
    await saveAndReturn(page)

    await expect(page.getByText(copy.dateCreated(today()))).toBeVisible()
  })

  test("leaving a change without saving keeps the template's answers", async ({
    page
  }) => {
    await saveWithReference(page)
    const templateUrl = page.url()

    await openChangeOrigin(page)
    await page.getByLabel(REFERENCE_LABEL).fill(UNSAVED_REFERENCE)
    await main(page).getByRole('link', { name: 'Cancel', exact: true }).click()
    await expect(page).toHaveURL(templateUrl)
    await expect(rowFor(page, INTERNAL_REFERENCE_ROW)).toContainText(
      SAVED_REFERENCE
    )
    await expect(banner(page)).toHaveCount(0)

    await openChangeOrigin(page)
    await page.getByLabel(REFERENCE_LABEL).fill(UNSAVED_REFERENCE)
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    await expect(page).toHaveURL(templateUrl)
    await expect(rowFor(page, INTERNAL_REFERENCE_ROW)).toContainText(
      SAVED_REFERENCE
    )
  })

  test("changing a template that does not exist, or another user's, goes to Manage templates", async ({
    page
  }) => {
    await page.goto(`${BASE}/templates/${crypto.randomUUID()}/origin?change=1`)
    await expect(
      page.getByRole('heading', { level: 1, name: MANAGE_TEMPLATES })
    ).toBeVisible()

    await saveWithReference(page)
    const changeUrl = `${page.url()}/origin?change=1`

    await signIn(page, { contactId: freshContactId() })
    await page.goto(changeUrl)

    await expect(
      page.getByRole('heading', { level: 1, name: MANAGE_TEMPLATES })
    ).toBeVisible()
    await expect(page.getByText(NAME)).toHaveCount(0)
  })

  test("a changed section's page has no serious or critical axe violations", async ({
    page
  }) => {
    await saveWithReference(page)

    await changeLink(page, ARRIVAL_DETAILS).click()
    await expect(
      page.getByRole('button', { name: SAVE_AND_RETURN, exact: true })
    ).toBeVisible()

    await expectNoSeriousOrCriticalAxeViolations(page)
  })
})

test.describe('changing every section of a saved template', () => {
  test.describe.configure({ timeout: 120000 })

  test.beforeEach(async ({ page }) => {
    await signIn(page, { contactId: freshContactId() })
  })

  test('every section the template page links to saves and returns to the template page', async ({
    page
  }) => {
    await openTemplateTaskList(page, NAME)
    await answerEveryTemplateSection(page)
    await reviewAndSave(page)
    await viewSaved(page, NAME)
    const templateUrl = page.url()

    const hrefs = [
      ...new Set(
        await main(page)
          .locator('a[href*="?change=1"]')
          .evaluateAll((links) =>
            links.map((link) => link.getAttribute('href'))
          )
      )
    ]
    expect(hrefs.length).toBeGreaterThanOrEqual(8)

    for (const href of hrefs) {
      await page.goto(templateUrl)
      await main(page).locator(`a[href="${href}"]`).first().click()
      await expect(
        page.getByRole('button', { name: SAVE_AND_RETURN, exact: true }),
        href
      ).toBeVisible()
      await expect(
        main(page).getByRole('link', { name: 'Cancel', exact: true }),
        href
      ).toBeVisible()

      await saveAndReturn(page)

      await expect(page, href).toHaveURL(templateUrl)
      await expect(banner(page), href).toBeVisible()
    }

    await page.goto(templateUrl)
    await changeLink(page, ARRIVAL_DETAILS).click()
    await page.getByLabel('Transport identification').fill(CHANGED_TRANSPORT_ID)
    await saveAndReturn(page)
    await expect(rowFor(page, 'Transport identification')).toContainText(
      CHANGED_TRANSPORT_ID
    )
  })

  test('an arrival date answered while creating or changing is never held', async ({
    page
  }) => {
    await openTemplateTaskList(page, NAME)
    await page.getByRole('link', { name: 'Arrival details' }).click()
    await answerArrivalDetails(page)
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await reviewAndSave(page)
    await viewSaved(page, NAME)
    const templateUrl = page.url()
    await expect(page.getByText(ARRIVAL_DATE_ROW, { exact: true })).toHaveCount(
      0
    )

    await changeLink(page, ARRIVAL_DETAILS).click()
    await expect(page.getByLabel(ARRIVAL_DATE_LABEL)).toHaveValue('')
    await page.getByLabel(ARRIVAL_DATE_LABEL).fill(ARRIVAL_DATE_IN_WINDOW)
    await saveAndReturn(page)
    await expect(page).toHaveURL(templateUrl)
    await expect(page.getByText(ARRIVAL_DATE_ROW, { exact: true })).toHaveCount(
      0
    )

    await changeLink(page, ARRIVAL_DETAILS).click()
    await expect(page.getByLabel(ARRIVAL_DATE_LABEL)).toHaveValue('')
  })
})

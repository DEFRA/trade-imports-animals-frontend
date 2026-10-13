import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  BASE,
  answerEveryTemplateSection,
  freshContactId,
  journeyIdFromPage,
  openTemplateTaskList,
  partyPickerName,
  referenceHeading,
  saveTemplateFromReview,
  signIn,
  startNotification,
  urlUnderBase,
  values
} from '../../../../../../../../../fit/live-animals-journey.js'
import { COUNTRY_LABELS } from '../../../../../../services/countries/stub.js'
import { PORTS } from '../../../../../../services/ports/stub.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { copy as reviewCopy } from '../check-answers/copy/copy.en.js'

const FIXTURE_PORT = PORTS.find((port) => port.code === values.portOfEntry)
const NAME = 'Weekly cattle'
const MANAGE_TEMPLATES = 'Manage templates'
const USE_TEMPLATE = 'Use template'
const REFERENCE_PATTERN = 'GBN-AG-\\d{2}-[0-9A-Z]{6}'
const NEW_NOTIFICATION_URL = urlUnderBase(`/notifications/${REFERENCE_PATTERN}`)
const SECTION_CAPTIONS = Object.values(hubCopy.groups)
const NOTIFICATION_LIST = '.notification-list'
const TOTAL_VALUE = '.app-commodity-total__value'

const main = (page) => page.getByRole('main')

const taskRow = (page, title) =>
  page.getByRole('listitem').filter({
    has: page.getByText(title, { exact: true })
  })

const rowFor = (page, label) =>
  page
    .getByRole('term')
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator('..')
    .first()

const cardRowFor = (page, cardTitle, label) =>
  page
    .locator('.govuk-summary-card')
    .filter({
      has: page.locator('.govuk-summary-card__title', { hasText: cardTitle })
    })
    .getByRole('term')
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator('..')
    .first()

const useOnCard = (page, name) =>
  page
    .getByRole('region', { name: `Template ${name}` })
    .getByRole('button', { name: USE_TEMPLATE, exact: true })
    .click()

const useOnTemplatePage = (page) =>
  main(page).getByRole('button', { name: USE_TEMPLATE, exact: true }).click()

const viewSaved = async (page, name) => {
  await page
    .getByRole('region', { name: `Template ${name}` })
    .getByRole('link', { name: 'View template' })
    .click()
  await expect(page).toHaveURL(urlUnderBase('/templates/[^/]+'))
}

const saveFullyAnsweredTemplate = async (page, name = NAME) => {
  await openTemplateTaskList(page, name)
  await answerEveryTemplateSection(page)
  await page.getByRole('button', { name: 'Review template' }).click()
  await saveTemplateFromReview(page)
}

const expectNewNotificationTaskList = async (page) => {
  await expect(page).toHaveURL(NEW_NOTIFICATION_URL)
  await expect(
    page.getByRole('heading', { level: 1, name: hubCopy.title })
  ).toBeVisible()
}

const expectNoDocumentsCarried = async (page) => {
  await expect(
    page.locator('.govuk-summary-card__title', {
      hasText: reviewCopy.documentN(2)
    })
  ).toHaveCount(0)
  await expect(
    cardRowFor(page, reviewCopy.documentN(1), reviewCopy.rows.documentReference)
  ).toContainText(reviewCopy.notApplicable)
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
    `The new notification has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

test.describe('Use template', () => {
  test.describe.configure({ timeout: 90000 })

  test.beforeEach(async ({ page }) => {
    await signIn(page, { contactId: freshContactId() })
  })

  test("Use template on a template's card starts a new draft and opens its Notification tasklist", async ({
    page
  }) => {
    await saveFullyAnsweredTemplate(page)

    await useOnCard(page, NAME)

    await expectNewNotificationTaskList(page)
    await expect(
      page.getByRole('heading', { level: 2, name: hubCopy.taskListHeading })
    ).toBeVisible()
    await expect(page.locator('.app-journey-strip .govuk-tag')).toHaveText(
      'Draft'
    )
    await expect(page.locator('h3.govuk-heading-m')).toHaveText(
      SECTION_CAPTIONS
    )
    expect(SECTION_CAPTIONS).toEqual([
      '1. About the consignment',
      '2. Description of the goods',
      '3. Transport and arrival',
      '4. Documents',
      '5. Consignment parties',
      '6. Contact address'
    ])
    await expect(
      page.getByRole('button', { name: hubCopy.reviewAndSubmit })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: hubCopy.returnToDashboard })
    ).toHaveAttribute('href', BASE)
    await expect(page.locator('.govuk-error-summary')).toHaveCount(0)
    await expect(main(page)).not.toContainText(NAME)
  })

  test("the new notification shows the template's animal and package totals", async ({
    page
  }) => {
    const [line] = values.commodityLines
    await saveFullyAnsweredTemplate(page)

    await useOnCard(page, NAME)

    await expectNewNotificationTaskList(page)
    await expect(page.locator(TOTAL_VALUE)).toHaveText([
      line.numberOfAnimalsQuantity,
      line.numberOfPackages
    ])
  })

  test('Arrival details and Upload documents are To do; the answered tasks are Complete', async ({
    page
  }) => {
    await saveFullyAnsweredTemplate(page)

    await useOnCard(page, NAME)

    await expectNewNotificationTaskList(page)
    for (const title of [
      hubCopy.rows.arrivalDetails.title,
      hubCopy.rows.documents.title
    ]) {
      await expect(
        taskRow(page, title).getByText(hubCopy.statuses.toDo),
        title
      ).toBeVisible()
    }
    for (const title of [
      hubCopy.rows.origin.title,
      hubCopy.rows.importReason.title,
      hubCopy.rows.consignmentDetails.title,
      hubCopy.rows.transporter.title
    ]) {
      await expect(
        taskRow(page, title).getByText(hubCopy.statuses.complete),
        title
      ).toBeVisible()
    }
  })

  test("the new notification holds the template's answers", async ({
    page
  }) => {
    const line = values.commodityLines[0]
    await saveFullyAnsweredTemplate(page)
    await useOnCard(page, NAME)
    await expectNewNotificationTaskList(page)

    await page.getByRole('button', { name: hubCopy.reviewAndSubmit }).click()

    await expect(referenceHeading(page)).toBeVisible()
    const answered = [
      [reviewCopy.rows.countryOfOrigin, COUNTRY_LABELS[values.countryOfOrigin]],
      [reviewCopy.rows.regionCode, values.regionOfOriginCode],
      [reviewCopy.rows.internalReference, values.internalReferenceNumber],
      [reviewCopy.rows.species, 'Bos Taurus'],
      [reviewCopy.rows.numberOfAnimals, line.numberOfAnimalsQuantity],
      [reviewCopy.rows.numberOfPackages, line.numberOfPackages],
      [reviewCopy.rows.reasonForImport, 'Internal market'],
      [reviewCopy.rows.portOfEntry, FIXTURE_PORT.name],
      [
        reviewCopy.rows.meansOfTransport,
        reviewCopy.means[values.meansOfTransport]
      ],
      // The review shows the CPH number without its slashes.
      [reviewCopy.rows.cph, values.countyParishHoldingCph.replaceAll('/', '')],
      [reviewCopy.rows.transportIdentification, values.transportIdentification],
      [
        reviewCopy.rows.transportDocumentReference,
        values.transportDocumentReference
      ]
    ]
    for (const [label, expected] of answered) {
      const row = rowFor(page, label)
      await expect(row, `${label} row`).not.toContainText(
        reviewCopy.notApplicable
      )
      if (expected) {
        await expect(row, `${label} row`).toContainText(expected)
      }
    }
    const transporter = (label) => cardRowFor(page, 'Transport details', label)
    await expect(transporter('Name')).toContainText(
      values.commercialTransporter.name
    )
    await expect(transporter('Approval number')).toContainText(
      values.commercialTransporter.approvalNumber
    )
    for (const label of ['Address', 'Country', 'Type']) {
      await expect(transporter(label), `${label} row`).not.toContainText(
        reviewCopy.notApplicable
      )
    }
    await expectNoDocumentsCarried(page)
    await expect(
      rowFor(page, reviewCopy.rows.arrivalDate).locator(
        '.app-summary-list__value--missing'
      )
    ).toHaveText(reviewCopy.missing)
  })

  test('the new notification holds each party and the contact address the template holds', async ({
    page
  }) => {
    await saveFullyAnsweredTemplate(page)
    await useOnCard(page, NAME)
    await expectNewNotificationTaskList(page)

    await page.getByRole('button', { name: hubCopy.reviewAndSubmit }).click()

    await expect(referenceHeading(page)).toBeVisible()
    const parties = [
      [reviewCopy.rows.placeOfOrigin, values.placeOfOrigin],
      [reviewCopy.rows.consignor, values.consignor],
      [reviewCopy.rows.consignee, values.consignee],
      [reviewCopy.rows.importer, values.importer],
      [reviewCopy.rows.placeOfDestination, values.placeOfDestination]
    ]
    for (const [label, party] of parties) {
      await expect(
        cardRowFor(page, reviewCopy.cards.rolesAndAddresses, label),
        `${label} row`
      ).toContainText(partyPickerName(party))
    }
    await expect(
      cardRowFor(
        page,
        reviewCopy.cards.contactAddress,
        reviewCopy.rows.contactAddress
      )
    ).toContainText(partyPickerName(values.contactAddress))
  })

  test('a template with no contact address starts a notification whose contact address is its place of origin', async ({
    page
  }) => {
    await openTemplateTaskList(page, NAME)
    await page.getByRole('link', { name: 'Roles and addresses' }).click()
    await page
      .locator('.govuk-summary-list__row', {
        has: page.getByText(reviewCopy.rows.placeOfOrigin, { exact: true })
      })
      .getByRole('link', { name: 'Add' })
      .click()
    await page
      .getByRole('radio', { name: partyPickerName(values.placeOfOrigin) })
      .check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page
      .getByRole('button', { name: 'Save and return to overview' })
      .click()
    await page.getByRole('button', { name: 'Review template' }).click()
    await saveTemplateFromReview(page)

    await useOnCard(page, NAME)
    await expectNewNotificationTaskList(page)
    await page.getByRole('button', { name: hubCopy.reviewAndSubmit }).click()

    await expect(
      cardRowFor(
        page,
        reviewCopy.cards.contactAddress,
        reviewCopy.rows.contactAddress
      )
    ).toContainText(partyPickerName(values.placeOfOrigin))
  })
})

test.describe('Use template — other drafts, refusals and access', () => {
  test.describe.configure({ timeout: 90000 })

  test.beforeEach(async ({ page }) => {
    await signIn(page, { contactId: freshContactId() })
  })

  test("Use template on the template's page starts another new draft", async ({
    page
  }) => {
    await saveFullyAnsweredTemplate(page)
    await useOnCard(page, NAME)
    await expectNewNotificationTaskList(page)
    const first = journeyIdFromPage(page)

    await page.goto(`${BASE}/templates`)
    await viewSaved(page, NAME)
    await useOnTemplatePage(page)

    await expectNewNotificationTaskList(page)
    await expect(
      page.getByRole('heading', { level: 2, name: hubCopy.taskListHeading })
    ).toBeVisible()
    expect(journeyIdFromPage(page)).not.toBe(first)
  })

  test('the new draft is listed on the dashboard and other drafts are unchanged', async ({
    page
  }) => {
    await saveFullyAnsweredTemplate(page)
    await startNotification(page)
    const earlier = journeyIdFromPage(page)

    await page.goto(`${BASE}/templates`)
    await useOnCard(page, NAME)
    await expectNewNotificationTaskList(page)
    const created = journeyIdFromPage(page)

    await page.goto(BASE)
    for (const reference of [earlier, created]) {
      await expect(
        page
          .locator(NOTIFICATION_LIST)
          .filter({ has: page.getByRole('heading', { name: reference }) }),
        reference
      ).toContainText('Draft')
    }

    await page.goto(`${BASE}/notifications/${earlier}`)
    await expect(
      taskRow(page, hubCopy.rows.origin.title).getByText(
        hubCopy.statuses.complete
      )
    ).toBeVisible()
    await expect(page.locator(TOTAL_VALUE)).toHaveText(['0', '0'])
  })

  test("using another user's template opens Manage templates and starts nothing", async ({
    page
  }) => {
    await saveFullyAnsweredTemplate(page)
    await viewSaved(page, NAME)
    const other = await page.context().newPage()
    await signIn(other, { contactId: freshContactId() })

    await useOnTemplatePage(page)

    await expect(
      page.getByRole('heading', { level: 1, name: MANAGE_TEMPLATES })
    ).toBeVisible()
    await expect(page.getByText(NAME)).toHaveCount(0)
    await page.goto(BASE)
    await expect(page.locator(NOTIFICATION_LIST)).toHaveCount(0)
  })

  test('using a template that does not exist opens Manage templates', async ({
    page
  }) => {
    await saveFullyAnsweredTemplate(page)
    await viewSaved(page, NAME)
    const crumb = await main(page)
      .locator('input[name="crumb"]')
      .first()
      .inputValue()

    const response = await page.request.post(
      `${BASE}/templates/${crypto.randomUUID()}/use`,
      { form: { crumb }, maxRedirects: 0 }
    )

    expect(response.status()).toBe(302)
    expect(response.headers().location).toMatch(/\/live-animals\/templates$/)
    await page.goto(`${BASE}/templates`)
    await expect(
      page.getByRole('heading', { level: 1, name: MANAGE_TEMPLATES })
    ).toBeVisible()
    await page.goto(BASE)
    await expect(page.locator(NOTIFICATION_LIST)).toHaveCount(0)
  })

  test('without JavaScript, Use template starts the draft', async ({
    page,
    browser
  }) => {
    await saveFullyAnsweredTemplate(page)
    await viewSaved(page, NAME)
    const templateUrl = page.url()
    const context = await browser.newContext({
      javaScriptEnabled: false,
      storageState: await page.context().storageState()
    })

    try {
      const plain = await context.newPage()
      await plain.goto(templateUrl)
      await useOnTemplatePage(plain)

      await expect(
        plain.getByRole('heading', { level: 2, name: hubCopy.taskListHeading })
      ).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test("the new notification's Overview has no serious or critical axe violations", async ({
    page
  }) => {
    await saveFullyAnsweredTemplate(page)

    await useOnCard(page, NAME)
    await expectNewNotificationTaskList(page)

    await expectNoSeriousOrCriticalAxeViolations(page)
  })
})

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  BASE,
  answerEveryTemplateSection,
  freshContactId,
  openTemplateReview,
  openTemplateTaskList,
  partyPickerName,
  saveTemplateFromReview,
  signIn,
  values
} from '../../../../../../../../../fit/live-animals-journey.js'
import { copy } from './copy/copy.en.js'

const NAME = 'Weekly cattle'
const NOT_APPLICABLE = 'Not applicable'
const ROLES_TASK = 'Roles and addresses'
const ROLES_CARD = 'Addresses'
const CONTACT_ADDRESS = 'Contact address'
const PLACE_OF_ORIGIN = 'Place of origin'
const REVIEW_TEMPLATE = 'Review template'
const MANAGE_TEMPLATES = 'Manage templates'
const TEMPLATE_PAGE_PATH = /\/live-animals\/templates\/[^/]+$/
const SUMMARY_CARD_SELECTOR = '.govuk-summary-card'
const TEMPLATE_SECTIONS = [
  '1. About the consignment',
  '2. Description of the goods',
  '3. Transport and arrival',
  '4. Consignment parties',
  '5. Contact address'
]

const main = (page) => page.getByRole('main')

const rowFor = (page, label) =>
  page
    .getByRole('term')
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator('..')
    .first()

const cardRowFor = (page, cardTitle, label) =>
  page
    .locator(SUMMARY_CARD_SELECTOR)
    .filter({
      has: page.locator('.govuk-summary-card__title', { hasText: cardTitle })
    })
    .getByRole('term')
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator('..')
    .first()

const changeLink = (page, hiddenText) =>
  page.getByRole('link', { name: `Change ${hiddenText}` })

const saveAndView = async (page, name) => {
  await openTemplateReview(page, name)
  await saveTemplateFromReview(page)
  await viewSaved(page, name)
}

const viewSaved = async (page, name) => {
  await page
    .getByRole('region', { name: `Template ${name}` })
    .getByRole('link', { name: 'View template' })
    .click()
  await expect(page).toHaveURL(TEMPLATE_PAGE_PATH)
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
    `The template page has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

test.describe('template page', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, { contactId: freshContactId() })
  })

  test('View template opens the template page titled with its name under the caption Templates', async ({
    page
  }) => {
    await saveAndView(page, NAME)

    await expect(page).toHaveTitle(
      `${NAME} - Import notification service - GOV.UK`
    )
    await expect(
      page.getByRole('heading', { level: 1, name: NAME, exact: true })
    ).toBeVisible()
    await expect(
      main(page).getByText(copy.caption, { exact: true })
    ).toBeVisible()
    await expect(page.locator('.app-journey-strip')).toHaveCount(0)
  })

  test("shows 'Date created:' with the day the template was saved", async ({
    page
  }) => {
    const today = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/London'
    }).format(new Date())

    await saveAndView(page, NAME)

    await expect(page.getByText(copy.dateCreated(today))).toBeVisible()
  })

  test('offers a primary Use template button in a POST form and a red Delete button, and no Edit', async ({
    page
  }) => {
    await saveAndView(page, NAME)

    const use = main(page).getByRole('button', {
      name: copy.useTemplate,
      exact: true
    })
    await expect(use).toBeVisible()
    await expect(use).not.toHaveClass(/govuk-button--secondary/)
    const form = main(page)
      .locator('form')
      .filter({
        has: page.getByRole('button', { name: copy.useTemplate, exact: true })
      })
    await expect(form).toHaveAttribute('method', 'post')
    await expect(form).toHaveAttribute(
      'action',
      /\/live-animals\/templates\/[^/]+\/use$/
    )

    const remove = main(page).getByRole('button', {
      name: copy.delete,
      exact: true
    })
    await expect(remove).toHaveClass(/govuk-button--warning/)
    await expect(remove).toHaveAttribute(
      'href',
      /\/live-animals\/templates\/[^/]+\/delete$/
    )

    await expect(
      main(page).getByRole('link', { name: 'Edit', exact: true })
    ).toHaveCount(0)
    await expect(
      main(page).getByRole('button', { name: 'Edit', exact: true })
    ).toHaveCount(0)
  })

  test('Back goes to Manage templates', async ({ page }) => {
    await saveAndView(page, NAME)

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(
      page.getByRole('heading', { level: 1, name: MANAGE_TEMPLATES })
    ).toBeVisible()
    await expect(page).toHaveURL(/\/live-animals\/templates$/)
  })

  test('lists the answers in five numbered sections with a Change link on every card, each opening a page of the template', async ({
    page
  }) => {
    await saveAndView(page, NAME)
    const templateId = page.url().split('/').pop()
    const templatePage = (slugPattern) =>
      new RegExp(
        `/live-animals/templates/${templateId}/${slugPattern}\\?change=1$`
      )

    await expect(main(page).getByRole('heading', { level: 2 })).toHaveText(
      TEMPLATE_SECTIONS
    )
    await expect(changeLink(page, 'origin of import')).toHaveAttribute(
      'href',
      templatePage('origin')
    )
    await expect(changeLink(page, 'main import reason')).toHaveAttribute(
      'href',
      templatePage('import-reason')
    )
    await expect(changeLink(page, 'Cow (0102)')).toHaveAttribute(
      'href',
      templatePage('consignment-details')
    )
    await expect(changeLink(page, 'additional details')).toHaveAttribute(
      'href',
      templatePage('additional-details')
    )
    await expect(changeLink(page, 'arrival details')).toHaveAttribute(
      'href',
      templatePage('port-of-entry')
    )
    await expect(changeLink(page, 'transport details')).toHaveAttribute(
      'href',
      templatePage('transporters')
    )
    await expect(changeLink(page, 'addresses')).toHaveAttribute(
      'href',
      templatePage('addresses')
    )
    await expect(changeLink(page, 'contact address')).toHaveAttribute(
      'href',
      templatePage('consignment/contact/select')
    )

    await changeLink(page, 'origin of import').click()
    await expect(page).toHaveURL(templatePage('origin'))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('opening a template that does not exist goes to Manage templates', async ({
    page
  }) => {
    await page.goto(`${BASE}/templates/no-such-template`)
    await expect(
      page.getByRole('heading', { level: 1, name: MANAGE_TEMPLATES })
    ).toBeVisible()

    await page.goto(`${BASE}/templates/${crypto.randomUUID()}`)
    await expect(
      page.getByRole('heading', { level: 1, name: MANAGE_TEMPLATES })
    ).toBeVisible()
  })

  test("opening another user's template goes to Manage templates", async ({
    page
  }) => {
    await saveAndView(page, NAME)
    const templateUrl = page.url()

    await signIn(page, { contactId: freshContactId() })
    await page.goto(templateUrl)

    await expect(
      page.getByRole('heading', { level: 1, name: MANAGE_TEMPLATES })
    ).toBeVisible()
    await expect(page.getByText(NAME)).toHaveCount(0)
  })

  test('template page has no serious or critical axe violations', async ({
    page
  }) => {
    await saveAndView(page, NAME)
    await expect(
      page.getByRole('heading', { level: 1, name: NAME, exact: true })
    ).toBeVisible()

    await expectNoSeriousOrCriticalAxeViolations(page)
  })

  test.describe('without JavaScript', () => {
    test('shows the template page with its Use template form', async ({
      page,
      browser
    }) => {
      await saveAndView(page, NAME)
      const templateUrl = page.url()
      const context = await browser.newContext({
        javaScriptEnabled: false,
        storageState: await page.context().storageState()
      })

      try {
        const plain = await context.newPage()
        await plain.goto(templateUrl)

        await expect(
          plain.getByRole('heading', { level: 1, name: NAME, exact: true })
        ).toBeVisible()
        await expect(
          plain
            .getByRole('main')
            .locator('form')
            .getByRole('button', { name: copy.useTemplate, exact: true })
        ).toBeVisible()
      } finally {
        await context.close()
      }
    })
  })
})

test.describe('template page with no contact address chosen', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, { contactId: freshContactId() })
  })

  test('the Contact address card shows the place of origin', async ({
    page
  }) => {
    await openTemplateTaskList(page, NAME)
    await page.getByRole('link', { name: ROLES_TASK }).click()
    await page
      .locator('.govuk-summary-list__row', {
        has: page.getByText(PLACE_OF_ORIGIN, { exact: true })
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
    await page.getByRole('button', { name: REVIEW_TEMPLATE }).click()
    await saveTemplateFromReview(page)
    await viewSaved(page, NAME)

    await expect(
      cardRowFor(page, CONTACT_ADDRESS, CONTACT_ADDRESS)
    ).toContainText(partyPickerName(values.placeOfOrigin))
    await expect(cardRowFor(page, ROLES_CARD, 'Consignor')).toContainText(
      NOT_APPLICABLE
    )
  })
})

test.describe('template page for a fully answered template', () => {
  test.describe.configure({ timeout: 90000 })

  test.beforeEach(async ({ page }) => {
    await signIn(page, { contactId: freshContactId() })
  })

  test('shows each party and the contact address as answered', async ({
    page
  }) => {
    await openTemplateTaskList(page, NAME)
    await answerEveryTemplateSection(page)
    await page.getByRole('button', { name: REVIEW_TEMPLATE }).click()
    await saveTemplateFromReview(page)
    await viewSaved(page, NAME)

    const parties = [
      [PLACE_OF_ORIGIN, values.placeOfOrigin],
      ['Consignor', values.consignor],
      ['Consignee', values.consignee],
      ['Importer', values.importer],
      ['Place of destination', values.placeOfDestination]
    ]
    for (const [label, party] of parties) {
      await expect(
        cardRowFor(page, ROLES_CARD, label),
        `${label} row`
      ).toContainText(partyPickerName(party))
    }
    await expect(cardRowFor(page, ROLES_CARD, PLACE_OF_ORIGIN)).toContainText(
      values.placeOfOrigin.address.addressLine1
    )
    await expect(
      cardRowFor(page, CONTACT_ADDRESS, CONTACT_ADDRESS)
    ).toContainText(partyPickerName(values.contactAddress))
  })

  test('a template saved after answering every section shows every saved answer', async ({
    page
  }) => {
    const line = values.commodityLines[0]

    await openTemplateTaskList(page, NAME)
    await answerEveryTemplateSection(page)
    await page.getByRole('button', { name: REVIEW_TEMPLATE }).click()
    await saveTemplateFromReview(page)
    await viewSaved(page, NAME)

    const answered = [
      ['Country of origin'],
      ['Region of origin code'],
      ['Internal reference number', values.internalReferenceNumber],
      ['Commodity code'],
      ['Common name'],
      ['Species'],
      ['Number of animals', line.numberOfAnimalsQuantity],
      ['Number of packages (when required)', line.numberOfPackages],
      ['Main import reason'],
      ['Purpose in the market'],
      ['Certified for'],
      ['Includes unweaned animals'],
      ['Port of entry'],
      ['Means of transport to the port of entry'],
      ['Transport identification', values.transportIdentification],
      ['Transport document reference', values.transportDocumentReference],
      ['County parish holding (CPH) number']
    ]
    for (const [label, expected] of answered) {
      const row = rowFor(page, label)
      await expect(row, `${label} row`).not.toContainText(NOT_APPLICABLE)
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
        NOT_APPLICABLE
      )
    }

    await expect(
      main(page)
        .getByRole('heading', { name: 'Identification details' })
        .first()
    ).toBeVisible()
    await expect(
      main(page).getByRole('cell', {
        name: line.animalIdentifiers[0].animalIdentifierEarTag
      })
    ).toBeVisible()
    await expect(
      page.getByText('Arrival date at destination', { exact: true })
    ).toHaveCount(0)
  })
})

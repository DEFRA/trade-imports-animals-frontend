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
import { COUNTRY_LABELS } from '../../../../../../services/countries/stub.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'

const FEEDBACK_MAILTO = 'mailto:APHAServiceDesk@apha.gov.uk'

const main = (page) => page.getByRole('main')

test.describe('manage templates', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await page.goto(`${BASE}/templates`)
  })

  test('shows the Manage templates title, heading and intro line', async ({
    page
  }) => {
    await expect(page).toHaveTitle(
      `${copy.title} - ${sharedCopy.layout.serviceName} - ${sharedCopy.layout.govukSuffix}`
    )
    await expect(
      page.getByRole('heading', { level: 1, name: copy.title })
    ).toBeVisible()
    await expect(page.getByText(copy.intro)).toBeVisible()
  })

  test('starts with its heading and offers no Back link', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveCount(0)
    await expect(main(page).getByRole('heading').first()).toHaveText(copy.title)
  })

  test('shows the Alpha phase banner with the service feedback address', async ({
    page
  }) => {
    await expect(page.getByText('Alpha', { exact: true })).toBeVisible()
    await expect(
      page.getByText('This is a new service. Help us improve it and')
    ).toBeVisible()
    await expect(
      page.getByRole('link', {
        name: sharedCopy.layout.phaseBanner.feedbackLinkText
      })
    ).toHaveAttribute('href', FEEDBACK_MAILTO)
  })

  test('shows a zero count and no templates under My templates when none are saved', async ({
    page
  }) => {
    await expect(
      page.getByRole('heading', { level: 2, name: copy.listHeading })
    ).toBeVisible()
    await expect(
      page.getByText(copy.results.none, { exact: true })
    ).toBeVisible()
    await expect(main(page).getByRole('heading', { level: 3 })).toHaveCount(0)
    // The only body text is the intro and the results count, so there is no empty-state message.
    await expect(main(page).locator('p.govuk-body')).toHaveCount(2)
  })

  test('offers a primary Create new template button that opens the type question', async ({
    page
  }) => {
    const button = main(page).getByRole('button', {
      name: copy.createNew,
      exact: true
    })

    await expect(button).toBeVisible()
    await expect(button).toHaveAttribute(
      'href',
      /\/notification-type\/template$/
    )
    await expect(button).not.toHaveClass(/govuk-button--secondary/)
  })

  test('offers no search, filter, sort or pagination', async ({ page }) => {
    await expect(main(page).getByRole('combobox')).toHaveCount(0)
    await expect(main(page).getByRole('searchbox')).toHaveCount(0)
    await expect(main(page).getByRole('textbox')).toHaveCount(0)
    await expect(main(page).getByText('Sort by')).toHaveCount(0)
    await expect(
      page.getByRole('navigation', { name: 'Pagination' })
    ).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Next' })).toHaveCount(0)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await expect(
      page.getByRole('heading', { level: 1, name: copy.title })
    ).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )

    expect(
      seriousOrCritical,
      `Manage templates has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})

test.describe('manage templates after saving a template', () => {
  const NAME = 'Weekly cattle'

  const templatesHeading = (page) =>
    page.getByRole('heading', { level: 1, name: copy.title })

  const savedBanner = (page) => page.locator('.govuk-notification-banner')

  const card = (page, title) =>
    page.getByRole('region', { name: copy.card.label(title), exact: true })

  const saveNamed = async (page, name) => {
    await openTemplateReview(page, name)
    await saveTemplateFromReview(page)
  }

  test.beforeEach(async ({ page }) => {
    await signIn(page, { contactId: freshContactId() })
  })

  test('Save template lists the part-answered template first and the count reads Show 1-1 of 1 results', async ({
    page
  }) => {
    await page.goto(`${BASE}/templates`)
    await expect(
      page.getByText(copy.results.none, { exact: true })
    ).toBeVisible()

    await saveNamed(page, NAME)

    await expect(
      page.getByText(copy.results.all(1), { exact: true })
    ).toBeVisible()
    await expect(
      main(page).locator('.govuk-summary-card__title').first()
    ).toHaveText(NAME)
  })

  test("shows a Success banner with role alert headed 'Weekly cattle saved to templates', gone on reload", async ({
    page
  }) => {
    await saveNamed(page, NAME)

    const banner = savedBanner(page)
    await expect(banner).toHaveAttribute('role', 'alert')
    await expect(
      banner.locator('.govuk-notification-banner__title')
    ).toHaveText(copy.saved.title)
    await expect(banner.getByRole('heading', { level: 3 })).toHaveText(
      copy.saved.heading(NAME)
    )

    await page.reload()

    await expect(templatesHeading(page)).toBeVisible()
    await expect(savedBanner(page)).toHaveCount(0)
  })

  test('titles a template saved with no name Untitled template, in the banner and on its card', async ({
    page
  }) => {
    await saveNamed(page, '')

    await expect(
      savedBanner(page).getByRole('heading', { level: 3 })
    ).toHaveText(copy.saved.heading(copy.untitled))
    await expect(
      main(page).getByRole('heading', {
        level: 3,
        name: copy.untitled,
        exact: true
      })
    ).toBeVisible()
    await expect(card(page, copy.untitled)).toBeVisible()
  })

  test('lists the later of two templates saved one after the other first', async ({
    page
  }) => {
    await saveNamed(page, 'First')
    await saveNamed(page, 'Second')

    await expect(main(page).locator('.govuk-summary-card__title')).toHaveText([
      'Second',
      'First'
    ])
  })

  test('shows each template as a card labelled Template <title> with its category, an H3 title, View template and a Use template button in a POST form', async ({
    page
  }) => {
    await saveNamed(page, NAME)

    const region = card(page, NAME)
    await expect(region).toBeVisible()
    await expect(region.locator('.govuk-caption-m')).toHaveText(
      copy.categories['live-animals']
    )
    await expect(region.getByRole('heading', { level: 3 })).toHaveText(NAME)
    await expect(
      region.getByRole('link', { name: copy.card.view, exact: true })
    ).toHaveAttribute('href', /\/live-animals\/templates\/[^/]+$/)
    await expect(
      region.getByRole('button', { name: copy.card.use, exact: true })
    ).toHaveClass(/govuk-button--secondary/)
    const form = region.locator('form')
    await expect(form).toHaveAttribute('method', 'post')
    await expect(form).toHaveAttribute(
      'action',
      /\/live-animals\/templates\/[^/]+\/use$/
    )
  })

  test("lists Commodity, Origin, Consignee and Consignor on a part-answered template's card, Not applicable for the parties", async ({
    page
  }) => {
    await saveNamed(page, NAME)

    const region = card(page, NAME)
    await expect(region.getByRole('term')).toHaveText([
      copy.card.rows.commodity,
      copy.card.rows.origin,
      copy.card.rows.consignee,
      copy.card.rows.consignor
    ])
    await expect(region.getByRole('definition')).toHaveText([
      values.commodityLines[0].commoditySelection,
      COUNTRY_LABELS[values.countryOfOrigin],
      copy.card.notApplicable,
      copy.card.notApplicable
    ])
  })

  test.describe('after answering every section', () => {
    test.describe.configure({ timeout: 90000 })

    test("a fully answered template's card names its consignee and consignor", async ({
      page
    }) => {
      await openTemplateTaskList(page, NAME)
      await answerEveryTemplateSection(page)
      await page.getByRole('button', { name: 'Review template' }).click()
      await saveTemplateFromReview(page)

      await expect(card(page, NAME).getByRole('definition')).toHaveText([
        values.commodityLines[0].commoditySelection,
        COUNTRY_LABELS[values.countryOfOrigin],
        partyPickerName(values.consignee),
        partyPickerName(values.consignor)
      ])
    })
  })

  test('Manage templates with a saved template and its banner has no serious or critical axe violations', async ({
    page
  }) => {
    await saveNamed(page, NAME)
    await expect(savedBanner(page)).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )

    expect(
      seriousOrCritical,
      `Manage templates has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })

  test.describe('without JavaScript', () => {
    test('shows the Success banner after Save template', async ({
      page,
      browser
    }) => {
      await openTemplateReview(page, NAME)
      const reviewUrl = page.url()
      const context = await browser.newContext({
        javaScriptEnabled: false,
        storageState: await page.context().storageState()
      })

      try {
        const plain = await context.newPage()
        await plain.goto(reviewUrl)
        await saveTemplateFromReview(plain)

        await expect(
          savedBanner(plain).getByRole('heading', { level: 3 })
        ).toHaveText(copy.saved.heading(NAME))
      } finally {
        await context.close()
      }
    })
  })
})

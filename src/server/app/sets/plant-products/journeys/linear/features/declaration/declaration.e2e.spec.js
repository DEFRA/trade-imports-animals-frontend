import { expect, test } from '@playwright/test'

import {
  completeAnswerSections,
  journeyUrl,
  startNotification,
  submitDeclaration
} from '../../../../../../../../../e2e/plant-products-journey.js'
import { axeViolations } from '../axe.e2e-helper.js'
import { copy } from './copy/copy.en.js'

const declarationUrl = /^\/plant-products\/notifications\/[^/]+\/declaration$/
const reviewUrl =
  /^\/plant-products\/notifications\/[^/]+\/review-notification$/
const confirmationUrl = /^\/plant-products\/notifications\/[^/]+\/confirmation$/

const externalLinks = [
  {
    name: copy.englandWales.enforcementPolicyLinkText,
    href: 'https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/470454/defra-enforcement-policy-statement-2015.pdf'
  },
  {
    name: copy.dataProtection.aphaPrivacyLinkText,
    href: 'https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/897608/apha-privacy-notice.pdf'
  },
  {
    name: copy.dataProtection.sasaPrivacyLinkText,
    href: 'https://www.sasa.gov.uk/content/privacy'
  }
]

const startAtDeclaration = async (page) => {
  await startNotification(page)
  await page.goto(journeyUrl(page, 'declaration'))
  await expect(page).toHaveURL((url) => declarationUrl.test(url.pathname))
  await expect(
    page.getByRole('heading', { level: 1, name: copy.title, exact: true })
  ).toBeVisible()
}

const expectAxeClean = async (page, state) => {
  const { all, seriousOrCritical } = await axeViolations(page)
  expect(
    seriousOrCritical,
    `Declaration ${state} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(all, null, 2)}`
  ).toEqual([])
}

test.describe('plant-products declaration', () => {
  test.beforeEach(async ({ page }) => {
    await startAtDeclaration(page)
  })

  test('renders the complete legal declaration with fixed heading and link structure', async ({
    page
  }) => {
    await expect(
      page.getByRole('heading', { level: 1, name: copy.title, exact: true })
    ).toHaveCount(1)
    await expect(page.locator('main h1')).toHaveClass(/govuk-heading-l/)
    await expect(page.locator('main').getByText(/^GBN-PP-/)).toBeVisible()

    for (const paragraph of copy.intro) {
      await expect(page.getByText(paragraph, { exact: true })).toBeVisible()
    }
    for (const heading of [
      copy.englandWales.heading,
      copy.scotland.heading,
      copy.terms.heading,
      copy.enquiries.heading,
      copy.dataProtection.heading,
      copy.legal.heading
    ]) {
      await expect(
        page.getByRole('heading', { level: 2, name: heading, exact: true })
      ).toBeVisible()
    }
    await expect(page.locator('main ol.govuk-list--number li')).toHaveText(
      copy.terms.items
    )
    await expect(page.locator('main ul.govuk-list--bullet li')).toHaveText(
      copy.legal.regulations
    )
    await expect(
      page.getByText(copy.enquiries.aphaLabel, { exact: true })
    ).toBeVisible()
    const aphaAddress = page.locator('p.govuk-body').filter({
      hasText: copy.enquiries.aphaAddressLines[0]
    })
    for (const line of copy.enquiries.aphaAddressLines) {
      await expect(aphaAddress).toContainText(line)
    }
    await expect(
      page.getByText(copy.enquiries.sasaLabel, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByText(copy.enquiries.sasaEmail, { exact: true })
    ).toBeVisible()

    const links = page.locator('main a[href^="http"]')
    await expect(links).toHaveCount(3)
    const accessibleNames = []
    for (const expected of externalLinks) {
      const link = page.getByRole('link', { name: expected.name, exact: true })
      await expect(link).toHaveAccessibleName(expected.name)
      await expect(link).toHaveAttribute('href', expected.href)
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).not.toHaveAttribute('aria-label')
      accessibleNames.push(expected.name)
    }
    expect(new Set(accessibleNames).size).toBe(3)

    const checkbox = page.getByRole('checkbox', {
      name: copy.declarationLabel,
      exact: true
    })
    await expect(checkbox).toHaveAccessibleName(copy.declarationLabel)
    await expect(checkbox).not.toBeChecked()
    await expect(page.locator('form input:visible')).toHaveCount(1)
    await expect(page.locator('form input[type="hidden"]')).toHaveCount(1)
    await expect(page.locator('form input[type="hidden"]')).toHaveAttribute(
      'name',
      'crumb'
    )
    await expect(
      page.getByText(new RegExp(`^${copy.dateOfDeclaration}`))
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.submitButton, exact: true })
    ).toHaveCount(1)
    await expect(page.getByText(/common user charge/i)).toHaveCount(0)
    await expect(page.locator('input[name="submissionDate"]')).toHaveCount(0)
    await expect(page.locator('input[name="etag"]')).toHaveCount(0)
  })

  test('unticked submission shows matching summary and inline errors and focuses the checkbox', async ({
    page
  }) => {
    await page
      .getByRole('button', { name: copy.submitButton, exact: true })
      .click()

    const summaryLink = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.declarationRequired, exact: true })
    await expect(summaryLink).toBeVisible()
    await expect(page.locator('.govuk-error-message')).toContainText(
      copy.errors.declarationRequired
    )
    await summaryLink.click()
    await expect(
      page.getByRole('checkbox', {
        name: copy.declarationLabel,
        exact: true
      })
    ).toBeFocused()
  })

  test('back link returns to the plant review page', async ({ page }) => {
    const expected = journeyUrl(page, 'review-notification')
    const back = page.getByRole('link', { name: 'Back', exact: true })
    await expect(back).toHaveAttribute('href', expected)
    await back.click()
    await expect(page).toHaveURL((url) => reviewUrl.test(url.pathname))
  })

  test('initial render has no serious or critical axe violations', async ({
    page
  }) => {
    await expectAxeClean(page, 'initial state')
  })

  test('validation state has no serious or critical axe violations', async ({
    page
  }) => {
    await page
      .getByRole('button', { name: copy.submitButton, exact: true })
      .click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expectAxeClean(page, 'validation state')
  })

  test('an incomplete notification remains draft and returns to review', async ({
    page
  }) => {
    await page
      .getByRole('checkbox', { name: copy.declarationLabel, exact: true })
      .check()
    await page
      .getByRole('button', { name: copy.submitButton, exact: true })
      .click()
    await expect(page).toHaveURL((url) => reviewUrl.test(url.pathname))

    await page.goto(journeyUrl(page, 'declaration'))
    await expect(
      page.getByRole('heading', { level: 1, name: copy.title, exact: true })
    ).toBeVisible()
  })
})

test.describe('plant-products declaration submission', () => {
  test.describe.configure({ timeout: 90000 })

  test('submits a complete notification and pins the unbuilt confirmation target', async ({
    page
  }) => {
    await startNotification(page)
    await completeAnswerSections(page)
    await submitDeclaration(page)
    await expect(page).toHaveURL((url) => confirmationUrl.test(url.pathname))

    await page.goto(page.url().replace(/\/confirmation$/, '/declaration'))
    await expect(page).toHaveURL((url) => confirmationUrl.test(url.pathname))
  })
})

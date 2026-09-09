import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  answerOriginEntry,
  expectPageEndsWithPrimaryAlone,
  selectSpecies
} from '../../../../../../../../../fit/live-animals-journey.js'
import { copy } from './copy/copy.en.js'
import { signIn } from '../../../../../../../../../fit/sign-in.js'

const SUBMIT_BUTTON = 'form button[type="submit"]'

const startAtCphNumber = async (page) => {
  await page.goto('/')
  await page
    .locator('form[action="/notifications"]')
    .getByRole('button')
    .click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/origin$/)

  const commodityUrl = page.url().replace(/\/origin$/, '/commodities')
  await answerOriginEntry(page)

  await page.goto(commodityUrl)
  await selectSpecies(page, ['Bos taurus'])
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/consignment-details$/)

  await page.goto(commodityUrl.replace(/\/commodities$/, '/cph-number'))
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

test.describe('cph-number feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtCphNumber(page)
  })

  test('renders the CPH copy', async ({ page }) => {
    // The page heading is an instruction in its own right, directly under the
    // caption — the field beneath it carries the shorter label, so the two are
    // separate strings rather than one label doubling as the heading.
    await expect(
      page.locator('span.govuk-caption-l + h1.govuk-heading-l')
    ).toHaveText(copy.title)

    // The field label is a label, not the heading: a revert to
    // `isPageHeading: true` on the input would put it back into a second h1.
    await expect(
      page.getByRole('heading', { name: copy.cph.label })
    ).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)

    await expect(page.getByLabel(copy.cph.label)).toHaveAccessibleDescription(
      copy.cph.hint
    )
  })

  test('keeps the CPH help collapsed above the field until it is opened', async ({
    page
  }) => {
    const summary = page.getByText(copy.help.summary, { exact: true })
    await expect(summary).toBeVisible()

    // Collapsed by default: the help costs a trader who already knows what a
    // CPH number is nothing but a line of summary text.
    await expect(page.getByText(copy.help.definition)).toBeHidden()
    await expect(page.getByText(copy.help.whereToFind)).toBeHidden()

    // Above the input, not below it — the explanation has to arrive before the
    // question it explains.
    await expect(
      page.locator('details').filter({ hasText: copy.help.summary })
    ).toHaveCount(1)
    await expect(
      page.locator('details ~ form #countyParishHoldingCph')
    ).toHaveCount(1)

    await summary.click()

    await expect(page.getByText(copy.help.definition)).toBeVisible()
    await expect(page.getByText(copy.help.whereToFind)).toBeVisible()
  })

  test('ends with the primary alone, being reached from the addresses page', async ({
    page
  }) => {
    await expectPageEndsWithPrimaryAlone(page)
  })

  test('back link returns to the notification hub', async ({ page }) => {
    const hubUrl = page.url().replace(/\/cph-number$/, '')

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(hubUrl)
  })

  test('strips slashes, saves a valid CPH number, continues the run and persists it', async ({
    page
  }) => {
    const cphUrl = page.url()

    await page.getByLabel(copy.cph.label).fill('123/456/789')
    await page.locator(SUBMIT_BUTTON).first().click()

    // The notification was created in this session, so the opening run is still
    // running and carries the page on to the next question rather than back to
    // the hub.
    await expect(page).toHaveURL(
      /\/notifications\/[^/]+\/consignment\/contact\/select$/
    )
    await page.goto(cphUrl)
    await expect(page.getByLabel(copy.cph.label)).toHaveValue('123456789')
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )

    expect(
      seriousOrCritical,
      `CPH number has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})

test.describe('cph-number validation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtCphNumber(page)
  })

  test('CPH validation: when empty, links to and focuses the preserved empty input', async ({
    page
  }) => {
    const input = page.getByLabel(copy.cph.label)

    await page.locator(SUBMIT_BUTTON).first().click()

    const requiredError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.cphRequired })
    await expect(requiredError).toBeVisible()
    await requiredError.click()
    await expect(input).toBeFocused()
    await expect(input).toHaveValue('')
  })

  test('CPH validation: when not 9 digits, links to and focuses the preserved raw value', async ({
    page
  }) => {
    const input = page.getByLabel(copy.cph.label)
    await input.fill('12/345/678')
    await page.locator(SUBMIT_BUTTON).first().click()

    const lengthError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.cphLength })
    await expect(lengthError).toBeVisible()
    await lengthError.click()
    await expect(input).toBeFocused()
    await expect(input).toHaveValue('12/345/678')
  })

  test('CPH validation: when containing non-digits, links to and focuses the preserved raw value', async ({
    page
  }) => {
    const input = page.getByLabel(copy.cph.label)
    await input.fill('12345678A')
    await page.locator(SUBMIT_BUTTON).first().click()

    const digitsError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.cphDigitsOnly })
    await expect(digitsError).toBeVisible()
    await digitsError.click()
    await expect(input).toBeFocused()
    await expect(input).toHaveValue('12345678A')
  })
})
